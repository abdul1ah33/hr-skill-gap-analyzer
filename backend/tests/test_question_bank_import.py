"""Question-bank importer (plan §6, Phase 5)."""
import copy
import json
from pathlib import Path

import pytest

from app.models.assessment_enums import QuestionOptionType
from app.models.skill import Skill
from app.models.skill_question import SkillQuestion
from app.services.question_bank_import_service import (
    QuestionBankImportError,
    QuestionBankImportService,
    compute_content_hash,
    source_for,
)
from app.schemas.question_bank import BankQuestion

pytestmark = pytest.mark.integration

LEVELS = ["Beginner", "Intermediate", "Intermediate", "Advanced", "Advanced"]


def _question(text: str, level: str = "Beginner") -> dict:
    return {
        "question_text": text,
        "proficiency_level": level,
        "options": [
            {"text": f"{text} answer", "type": "correct", "explanation": "Right."},
            {"text": f"{text} near", "type": "near_miss", "explanation": "Almost."},
            {"text": f"{text} myth", "type": "misconception", "explanation": "Myth."},
            {"text": f"{text} w1", "type": "plausible_wrong_1", "explanation": "Wrong."},
            {"text": f"{text} w2", "type": "plausible_wrong_2", "explanation": "Wrong."},
            {"text": f"{text} w3", "type": "plausible_wrong_3", "explanation": "Wrong."},
        ],
    }


def _skill_block(name: str, count: int = 5) -> dict:
    return {
        "skill_name": name,
        "questions": [_question(f"{name} q{i}", LEVELS[i % 5]) for i in range(count)],
    }


def _write(path: Path, blocks: list[dict | str]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [b if isinstance(b, str) else json.dumps(b) for b in blocks]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def _service(db, **kwargs) -> QuestionBankImportService:
    kwargs.setdefault("skill_name_map", {})
    return QuestionBankImportService(db, **kwargs)


def _active(db, skill_name: str) -> list[SkillQuestion]:
    return (
        db.query(SkillQuestion)
        .join(Skill)
        .filter(Skill.name == skill_name, SkillQuestion.is_active.is_(True))
        .all()
    )


# ==========================================
# Fresh import
# ==========================================
def test_fresh_import_creates_skills_questions_and_options(db, tmp_path):
    path = _write(tmp_path / "bank.jsonl", [_skill_block("Risk  Management"), _skill_block("SQL")])

    report = _service(db).import_files([path])

    assert report.inserted == 10
    assert report.skills_created == ["risk management", "sql"]
    assert report.rejected == 0
    assert report.not_assessable == {}

    questions = _active(db, "risk management")
    assert len(questions) == 5
    assert all(q.source == "curated" for q in questions)
    for question in questions:
        assert len(question.options) == 6
        assert {o.option_type for o in question.options} == set(QuestionOptionType)


def test_existing_skill_is_reused_by_lowercase_name(db, tmp_path, factory):
    skill = factory.skill("risk management")
    path = _write(tmp_path / "bank.jsonl", [_skill_block("Risk Management")])

    report = _service(db).import_files([path])

    assert report.skills_matched == 1
    assert report.skills_created == []
    assert {q.skill_id for q in _active(db, "risk management")} == {skill.id}


def test_skill_name_map_merges_names(db, tmp_path, factory):
    factory.skill("microsoft excel")
    path = _write(tmp_path / "bank.jsonl", [_skill_block("Excel")])

    report = _service(db, skill_name_map={"excel": "microsoft excel"}).import_files([path])

    assert report.skills_created == []
    assert len(_active(db, "microsoft excel")) == 5


def test_generated_files_get_model_source(db, tmp_path):
    path = _write(tmp_path / "generated" / "gemini_position_skills.jsonl", [_skill_block("docker")])

    _service(db).import_files([path])

    assert source_for(path) == "generated:gemini"
    assert {q.source for q in _active(db, "docker")} == {"generated:gemini"}


# ==========================================
# Idempotency and changes
# ==========================================
def test_second_run_inserts_nothing(db, tmp_path):
    path = _write(tmp_path / "bank.jsonl", [_skill_block("sql")])
    _service(db).import_files([path])

    report = _service(db).import_files([path])

    assert (report.inserted, report.unchanged, report.deactivated) == (0, 5, 0)
    assert db.query(SkillQuestion).count() == 5


def test_changed_question_becomes_new_row_and_old_is_deactivated(db, tmp_path):
    block = _skill_block("sql")
    path = _write(tmp_path / "bank.jsonl", [block])
    _service(db).import_files([path])
    old_hash = compute_content_hash("sql", BankQuestion(**block["questions"][0]))

    changed = copy.deepcopy(block)
    changed["questions"][0]["options"][0]["explanation"] = "Right, and here is why."
    report = _service(db).import_files([_write(path, [changed])])

    assert (report.inserted, report.unchanged, report.deactivated) == (1, 4, 1)
    old = db.query(SkillQuestion).filter_by(content_hash=old_hash).one()
    assert old.is_active is False
    assert len(_active(db, "sql")) == 5


def test_removed_question_is_deactivated_and_reactivated_when_back(db, tmp_path):
    block = _skill_block("sql", count=6)
    path = _write(tmp_path / "bank.jsonl", [block])
    _service(db).import_files([path])

    shorter = copy.deepcopy(block)
    removed = shorter["questions"].pop()
    report = _service(db).import_files([_write(path, [shorter])])
    assert report.deactivated == 1
    assert db.query(SkillQuestion).count() == 6  # never deleted

    report = _service(db).import_files([_write(path, [block])])
    assert report.reactivated == 1
    assert removed["question_text"] in {q.question_text for q in _active(db, "sql")}


def test_deactivation_only_touches_sources_being_imported(db, tmp_path):
    curated = _write(tmp_path / "bank.jsonl", [_skill_block("sql")])
    generated = _write(tmp_path / "generated" / "claude_x.jsonl", [_skill_block("docker")])
    _service(db).import_files([curated, generated])

    report = _service(db).import_files([curated])

    assert report.deactivated == 0
    assert len(_active(db, "docker")) == 5


def test_option_order_does_not_change_the_hash():
    question = _question("order")
    shuffled = copy.deepcopy(question)
    shuffled["options"].reverse()

    assert compute_content_hash("x", BankQuestion(**question)) == compute_content_hash(
        "x", BankQuestion(**shuffled)
    )


# ==========================================
# Invalid input
# ==========================================
def _bad_block() -> dict:
    block = _skill_block("sql", count=6)
    block["questions"][5]["options"][1]["type"] = "correct"  # two correct options
    return block


def test_invalid_question_is_skipped_and_reported(db, tmp_path):
    path = _write(tmp_path / "bank.jsonl", ["{not json", _bad_block()])

    report = _service(db).import_files([path])

    assert report.inserted == 5
    assert [(r.line, r.question_number) for r in report.rejections] == [(1, None), (2, 6)]
    assert "duplicated=['correct']" in report.rejections[1].reason


def test_strict_mode_aborts(db, tmp_path):
    path = _write(tmp_path / "bank.jsonl", [_bad_block()])

    with pytest.raises(QuestionBankImportError, match="sql"):
        _service(db, strict=True).import_files([path])


def test_duplicate_skill_and_question_are_rejected(db, tmp_path):
    block = _skill_block("sql")
    block["questions"].append(copy.deepcopy(block["questions"][0]))
    path = _write(tmp_path / "bank.jsonl", [block, _skill_block("SQL")])

    report = _service(db).import_files([path])

    reasons = [r.reason for r in report.rejections]
    assert reasons == ["duplicate question text within the skill", "skill appears twice in this file"]
    assert report.inserted == 5


def test_skill_without_enough_levels_is_not_assessable(db, tmp_path):
    path = _write(tmp_path / "bank.jsonl", [_skill_block("sql", count=3)])

    report = _service(db).import_files([path])

    assert report.not_assessable == {"sql": {"Beginner": 1, "Intermediate": 2, "Advanced": 0}}


def test_dry_run_rollback_writes_nothing(db, tmp_path):
    path = _write(tmp_path / "bank.jsonl", [_skill_block("sql")])

    _service(db).import_files([path])
    db.rollback()

    assert db.query(SkillQuestion).count() == 0
    assert db.query(Skill).filter_by(name="sql").first() is None


# ==========================================
# Real bank files
# ==========================================
def test_real_bank_imports_cleanly(db):
    report = QuestionBankImportService(db).import_files(
        sorted((Path(__file__).resolve().parents[1] / "app/data/question_bank").rglob("*.jsonl"))
    )

    assert report.rejected == 0
    assert report.not_assessable == {}
    assert report.inserted == db.query(SkillQuestion).count()
