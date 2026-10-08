"""
Imports question-bank JSONL files into skill_questions / skill_question_options
(plan §6).

- Every question is validated with app/schemas/question_bank.py; invalid ones
  are skipped and reported (or abort the run in strict mode).
- Skills are matched by their lowercase name and created when missing.
- Rows are immutable: a question is identified by content_hash, so a changed
  question becomes a new row and the old one is deactivated. Questions are
  never deleted because assessments may reference them.
- The whole run is one transaction; the caller commits or rolls back.
"""
import hashlib
import json
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.models.assessment_enums import QuestionOptionType
from app.models.employee_skill import SkillLevel
from app.models.skill import Skill
from app.models.skill_question import SkillQuestion, SkillQuestionOption
from app.schemas.question_bank import (
    BankQuestion,
    correct_is_obviously_longest,
    normalize_text,
)
from app.utils.skill_names import normalize_skill_name

BANK_DIR = Path(__file__).resolve().parent.parent / "data" / "question_bank"
SKILL_NAME_MAP_FILE = BANK_DIR / "skill_name_map.json"

MAX_SKILL_NAME_LENGTH = 100

# Minimum active questions per level for a skill to be assessable (§A.7)
MIN_QUESTIONS_PER_LEVEL = {
    SkillLevel.BEGINNER: 1,
    SkillLevel.INTERMEDIATE: 2,
    SkillLevel.ADVANCED: 2,
}

# Pools smaller than this leak quickly through retakes
RECOMMENDED_QUESTIONS_PER_LEVEL = 10


class QuestionBankImportError(Exception):
    """Raised in strict mode, or for problems that make the input unusable."""


@dataclass
class Rejection:
    file: str
    line: int
    skill_name: str
    question_number: int | None
    reason: str


@dataclass
class ImportReport:
    files: list[str] = field(default_factory=list)
    skills_matched: int = 0
    skills_created: list[str] = field(default_factory=list)
    inserted: int = 0
    unchanged: int = 0
    reactivated: int = 0
    deactivated: int = 0
    rejections: list[Rejection] = field(default_factory=list)
    length_bias_warnings: list[str] = field(default_factory=list)
    not_assessable: dict[str, dict[str, int]] = field(default_factory=dict)
    small_pools: dict[str, dict[str, int]] = field(default_factory=dict)

    @property
    def rejected(self) -> int:
        return len(self.rejections)

    def summary(self) -> str:
        lines = [
            f"Files: {', '.join(self.files)}",
            f"Skills: {self.skills_matched} matched, {len(self.skills_created)} created",
            (
                f"Questions: {self.inserted} inserted, {self.unchanged} unchanged, "
                f"{self.reactivated} reactivated, {self.deactivated} deactivated, "
                f"{self.rejected} rejected"
            ),
            f"Correct option much longer than the others: {len(self.length_bias_warnings)}",
            f"Not assessable skills (< 1 B / 2 I / 2 A): {len(self.not_assessable)}",
            f"Skills with fewer than {RECOMMENDED_QUESTIONS_PER_LEVEL} questions in a level: {len(self.small_pools)}",
        ]
        for rejection in self.rejections:
            where = f"{rejection.file}:{rejection.line}"
            number = f" #{rejection.question_number}" if rejection.question_number else ""
            lines.append(f"  REJECTED {where} {rejection.skill_name}{number}: {rejection.reason}")
        for name, counts in sorted(self.not_assessable.items()):
            lines.append(f"  NOT ASSESSABLE {name}: {counts}")
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "files": self.files,
            "skills_matched": self.skills_matched,
            "skills_created": self.skills_created,
            "inserted": self.inserted,
            "unchanged": self.unchanged,
            "reactivated": self.reactivated,
            "deactivated": self.deactivated,
            "rejections": [vars(r) for r in self.rejections],
            "length_bias_warnings": self.length_bias_warnings,
            "not_assessable": self.not_assessable,
            "small_pools": self.small_pools,
        }


@dataclass
class _ParsedQuestion:
    skill_name: str
    question: BankQuestion
    content_hash: str
    source: str


def default_bank_files() -> list[Path]:
    """The curated bank files plus everything under generated/."""
    return sorted(BANK_DIR.glob("*.jsonl")) + sorted(BANK_DIR.glob("generated/*.jsonl"))


def source_for(path: Path) -> str:
    """'curated' for hand-made files, 'generated:<model>' for generated/<model>_*.jsonl."""
    if path.parent.name == "generated":
        return f"generated:{path.stem.split('_')[0]}"
    return "curated"


def compute_content_hash(skill_name: str, question: BankQuestion) -> str:
    """SHA-256 over the skill, level, question and options (order-independent)."""
    payload = {
        "skill": normalize_skill_name(skill_name),
        "level": question.proficiency_level,
        "question": " ".join(question.question_text.split()),
        "options": sorted(
            (option.type, " ".join(option.text.split()), " ".join(option.explanation.split()))
            for option in question.options
        ),
    }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def load_skill_name_map(path: Path = SKILL_NAME_MAP_FILE) -> dict[str, str]:
    """Optional {"bank name": "existing skill name"} overrides for real merges."""
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {normalize_skill_name(k): normalize_skill_name(v) for k, v in raw.items()}


class QuestionBankImportService:
    def __init__(
        self,
        db: Session,
        strict: bool = False,
        skill_name_map: dict[str, str] | None = None,
    ):
        self.db = db
        self.strict = strict
        self.skill_name_map = (
            skill_name_map if skill_name_map is not None else load_skill_name_map()
        )

    # ==========================================
    # Parsing and validation
    # ==========================================
    def _reject(self, report: ImportReport, rejection: Rejection) -> None:
        if self.strict:
            raise QuestionBankImportError(
                f"{rejection.file}:{rejection.line} {rejection.skill_name}: {rejection.reason}"
            )
        report.rejections.append(rejection)

    def _parse_file(self, path: Path, report: ImportReport) -> list[_ParsedQuestion]:
        source = source_for(path)
        parsed: list[_ParsedQuestion] = []
        skills_in_file: set[str] = set()

        lines = path.read_text(encoding="utf-8").splitlines()
        for line_number, line in enumerate(lines, start=1):
            if not line.strip():
                continue

            try:
                block = json.loads(line)
                raw_name = block["skill_name"]
                raw_questions = block["questions"]
                if not isinstance(raw_name, str) or not isinstance(raw_questions, list):
                    raise TypeError("skill_name must be a string and questions a list")
            except (json.JSONDecodeError, KeyError, TypeError) as err:
                self._reject(report, Rejection(path.name, line_number, "?", None, f"invalid line: {err}"))
                continue

            name = self.skill_name_map.get(normalize_skill_name(raw_name), normalize_skill_name(raw_name))
            if not name or len(name) > MAX_SKILL_NAME_LENGTH:
                self._reject(report, Rejection(
                    path.name, line_number, raw_name, None,
                    f"skill name must be 1-{MAX_SKILL_NAME_LENGTH} characters",
                ))
                continue
            if name in skills_in_file:
                self._reject(report, Rejection(path.name, line_number, name, None, "skill appears twice in this file"))
                continue
            skills_in_file.add(name)

            seen_texts: set[str] = set()
            for number, raw_question in enumerate(raw_questions, start=1):
                try:
                    question = BankQuestion.model_validate(raw_question)
                except ValidationError as err:
                    reasons = "; ".join(e["msg"] for e in err.errors())
                    self._reject(report, Rejection(path.name, line_number, name, number, reasons))
                    continue

                key = normalize_text(question.question_text)
                if key in seen_texts:
                    self._reject(report, Rejection(
                        path.name, line_number, name, number, "duplicate question text within the skill",
                    ))
                    continue
                seen_texts.add(key)

                if correct_is_obviously_longest(question):
                    report.length_bias_warnings.append(f"{path.name}:{line_number} {name} #{number}")

                parsed.append(_ParsedQuestion(
                    skill_name=name,
                    question=question,
                    content_hash=compute_content_hash(name, question),
                    source=source,
                ))

        return parsed

    # ==========================================
    # Database
    # ==========================================
    def _resolve_skills(self, names: set[str], report: ImportReport) -> dict[str, Skill]:
        existing = {
            skill.name: skill
            for skill in self.db.query(Skill).filter(Skill.name.in_(names)).all()
        }
        report.skills_matched = len(existing)

        for name in sorted(names - existing.keys()):
            skill = Skill(name=name)
            self.db.add(skill)
            existing[name] = skill
            report.skills_created.append(name)

        self.db.flush()
        return existing

    @staticmethod
    def _new_question(skill: Skill, item: _ParsedQuestion) -> SkillQuestion:
        return SkillQuestion(
            skill=skill,
            question_text=item.question.question_text,
            proficiency_level=SkillLevel(item.question.proficiency_level),
            content_hash=item.content_hash,
            source=item.source,
            is_active=True,
            options=[
                SkillQuestionOption(
                    text=option.text,
                    option_type=QuestionOptionType(option.type),
                    explanation=option.explanation,
                )
                for option in item.question.options
            ],
        )

    def _check_coverage(self, skills: dict[str, Skill], report: ImportReport) -> None:
        rows = (
            self.db.query(SkillQuestion.skill_id, SkillQuestion.proficiency_level)
            .filter(
                SkillQuestion.skill_id.in_([s.id for s in skills.values()]),
                SkillQuestion.is_active.is_(True),
            )
            .all()
        )
        counts = Counter(rows)

        for name, skill in skills.items():
            per_level = {level.value: counts[(skill.id, level)] for level in SkillLevel}
            if any(counts[(skill.id, level)] < minimum for level, minimum in MIN_QUESTIONS_PER_LEVEL.items()):
                report.not_assessable[name] = per_level
            elif min(per_level.values()) < RECOMMENDED_QUESTIONS_PER_LEVEL:
                report.small_pools[name] = per_level

    # ==========================================
    # Main entry point
    # ==========================================
    def import_files(self, paths: list[Path]) -> ImportReport:
        """
        Import the given files. Questions from these files' sources that are
        no longer present are deactivated. Does not commit.
        """
        if not paths:
            raise QuestionBankImportError("no question-bank files given")

        report = ImportReport(files=[p.name for p in paths])

        parsed: list[_ParsedQuestion] = []
        for path in paths:
            parsed.extend(self._parse_file(path, report))

        # A question can appear in two files only if it is identical; keep the first
        unique: dict[str, _ParsedQuestion] = {}
        for item in parsed:
            unique.setdefault(item.content_hash, item)

        skills = self._resolve_skills({item.skill_name for item in unique.values()}, report)

        existing = {
            question.content_hash: question
            for question in self.db.query(SkillQuestion)
            .filter(SkillQuestion.content_hash.in_(unique.keys()))
            .all()
        } if unique else {}

        for content_hash, item in unique.items():
            question = existing.get(content_hash)
            if question is None:
                self.db.add(self._new_question(skills[item.skill_name], item))
                report.inserted += 1
            elif question.is_active:
                report.unchanged += 1
            else:
                question.is_active = True
                report.reactivated += 1

        # Deactivate questions that came from these sources but are gone now
        sources = {source_for(path) for path in paths}
        stale = (
            self.db.query(SkillQuestion)
            .filter(
                SkillQuestion.source.in_(sources),
                SkillQuestion.is_active.is_(True),
                SkillQuestion.content_hash.notin_(unique.keys()),
            )
            .all()
        )
        for question in stale:
            question.is_active = False
        report.deactivated = len(stale)

        self.db.flush()
        self._check_coverage(skills, report)
        return report
