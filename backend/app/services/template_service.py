"""
Applies an industry template to this client's database (docs/templates.md,
docs/plans/industry_templates_plan.md §5.4).

Rules:
- Creates what is missing and never overwrites existing rows. The only
  exception: a skill's empty description / ESCO URI is filled in.
- Required skills are only added to positions created by this run. Positions
  that already exist are left exactly as HR configured them, so re-applying a
  template never undoes a customization.
- Template questions are imported with source "template:<key>", so they never
  touch the main question bank.
- Fails when any template skill is not assessable afterwards (fewer than
  1 Beginner / 2 Intermediate / 2 Advanced active questions).
- The whole run is one transaction; the caller commits or rolls back.
"""
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, ValidationError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.course_skill import CourseSkill
from app.models.department import Department
from app.models.organization_settings import OrganizationSettings
from app.models.position import Position
from app.models.position_skill import PositionSkill
from app.models.skill import Skill
from app.models.skill_alias import SkillAlias
from app.schemas.template import (
    IndustryTemplate,
    TemplateCourse,
    TemplateDepartment,
    TemplateInfo,
    TemplatePosition,
    TemplateSkill,
)
from app.services.question_bank_import_service import (
    ImportReport,
    QuestionBankImportError,
    QuestionBankImportService,
)
from app.utils.skill_names import normalize_skill_name

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "data" / "templates"

KINDS = ("skills", "aliases", "departments", "positions", "position_skills", "courses")


class TemplateError(Exception):
    """The template is invalid or cannot be applied; nothing should be committed."""

    def __init__(self, message: str, report: "TemplateReport | None" = None):
        super().__init__(message)
        self.report = report


@dataclass
class TemplateReport:
    key: str
    name: str
    version: int
    reviewed: bool
    created: dict[str, int] = field(default_factory=lambda: dict.fromkeys(KINDS, 0))
    existing: dict[str, int] = field(default_factory=lambda: dict.fromkeys(KINDS, 0))
    warnings: list[str] = field(default_factory=list)
    questions: ImportReport | None = None
    not_assessable: dict[str, dict[str, int]] = field(default_factory=dict)
    small_pools: dict[str, dict[str, int]] = field(default_factory=dict)

    def summary(self) -> str:
        lines = [f"Template: {self.name} ({self.key} v{self.version})"]
        if not self.reviewed:
            lines.append("WARNING: this template has not been reviewed by a domain expert yet")
        for kind in KINDS:
            lines.append(
                f"{kind.replace('_', ' ').capitalize()}: "
                f"{self.created[kind]} created, {self.existing[kind]} already present"
            )
        if self.questions is not None:
            q = self.questions
            lines.append(
                f"Questions: {q.inserted} inserted, {q.unchanged} unchanged, "
                f"{q.reactivated} reactivated, {q.deactivated} deactivated"
            )
        else:
            lines.append("Questions: none in this template")
        lines.append(f"Not assessable skills: {len(self.not_assessable)}")
        for name, counts in sorted(self.not_assessable.items()):
            lines.append(f"  NOT ASSESSABLE {name}: {counts}")
        for warning in self.warnings:
            lines.append(f"  WARNING {warning}")
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "name": self.name,
            "version": self.version,
            "reviewed": self.reviewed,
            "created": self.created,
            "existing": self.existing,
            "warnings": self.warnings,
            "questions": self.questions.to_dict() if self.questions else None,
            "not_assessable": self.not_assessable,
            "small_pools": self.small_pools,
        }


# ==========================================
# Loading
# ==========================================

def resolve_template_dir(name_or_path: str) -> Path:
    """A template key ("port") or a path to a template folder."""
    path = Path(name_or_path)
    return path if path.is_dir() else TEMPLATES_DIR / name_or_path


def question_files(directory: Path) -> list[Path]:
    return sorted((directory / "question_bank").glob("*.jsonl"))


def _read_json(directory: Path, filename: str, required: bool = True):
    path = directory / filename
    if not path.is_file():
        if required:
            raise TemplateError(f"{filename} is missing in {directory}")
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        raise TemplateError(f"{filename}: invalid JSON ({err})") from err


def _validate(filename: str, model: type[BaseModel], data, many: bool = True):
    if many and not isinstance(data, list):
        raise TemplateError(f"{filename}: expected a JSON list")
    try:
        if many:
            return [model.model_validate(item) for item in data]
        return model.model_validate(data)
    except ValidationError as err:
        problems = "; ".join(
            f"{'.'.join(str(part) for part in e['loc'])}: {e['msg']}" for e in err.errors()
        )
        raise TemplateError(f"{filename}: {problems}") from err


def _question_skill_names(directory: Path) -> set[str]:
    """Skill names used by the question files; malformed lines are left to the importer."""
    names: set[str] = set()
    for path in question_files(directory):
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                names.add(normalize_skill_name(json.loads(line)["skill_name"]))
            except (json.JSONDecodeError, KeyError, TypeError, AttributeError):
                continue
    return names


def load_template(directory: Path) -> IndustryTemplate:
    """Read and validate a template folder. Raises TemplateError listing every problem."""
    if not directory.is_dir():
        raise TemplateError(f"Template folder not found: {directory}")

    template = IndustryTemplate(
        info=_validate("template.json", TemplateInfo, _read_json(directory, "template.json"), many=False),
        skills=_validate("skills.json", TemplateSkill, _read_json(directory, "skills.json")),
        departments=_validate("departments.json", TemplateDepartment, _read_json(directory, "departments.json")),
        positions=_validate("positions.json", TemplatePosition, _read_json(directory, "positions.json")),
        courses=_validate("courses.json", TemplateCourse, _read_json(directory, "courses.json", required=False)),
        question_skill_names=_question_skill_names(directory),
    )

    errors = template.check_references()
    if errors:
        raise TemplateError("Template is inconsistent:\n" + "\n".join(f"  {e}" for e in errors))
    return template


# ==========================================
# Applying
# ==========================================

class TemplateService:
    def __init__(self, db: Session):
        self.db = db

    def apply(self, directory: Path, organization_name: str | None = None) -> TemplateReport:
        """Apply the template in directory. Does not commit."""
        template = load_template(directory)
        info = template.info
        report = TemplateReport(key=info.key, name=info.name, version=info.version, reviewed=info.reviewed)

        organization = self._organization(template, organization_name, report)

        skills = self._apply_skills(template, report)
        departments = self._apply_departments(template, report)
        self._apply_positions(template, skills, departments, report)
        self._apply_courses(template, skills, report)
        self._import_questions(directory, template, skills, report)
        self._check_coverage(skills, report)

        organization.template_key = info.key
        organization.template_version = info.version
        organization.template_applied_at = datetime.now(timezone.utc)
        self.db.flush()
        return report

    # ------------------------------------------
    def _organization(
        self,
        template: IndustryTemplate,
        organization_name: str | None,
        report: TemplateReport,
    ) -> OrganizationSettings:
        info = template.info
        organization = self.db.get(OrganizationSettings, 1)

        if organization is None:
            if not organization_name or not organization_name.strip():
                raise TemplateError(
                    "Organization settings are not configured. Pass an organization name "
                    "or set them first with PUT /organization."
                )
            organization = OrganizationSettings(id=1, name=organization_name.strip(), industry=info.industry)
            self.db.add(organization)
            return organization

        if organization.template_key and organization.template_key != info.key:
            raise TemplateError(
                f"This database already uses the '{organization.template_key}' template; "
                f"a client database uses a single industry template."
            )
        if (
            organization.template_key == info.key
            and organization.template_version
            and organization.template_version > info.version
        ):
            raise TemplateError(
                f"Version {organization.template_version} of '{info.key}' is already applied; "
                f"refusing to apply the older version {info.version}."
            )

        if organization.industry is None:
            organization.industry = info.industry
        elif organization.industry != info.industry:
            report.warnings.append(
                f"organization industry is '{organization.industry}' but the template is for '{info.industry}'"
            )
        return organization

    # ------------------------------------------
    def _apply_skills(self, template: IndustryTemplate, report: TemplateReport) -> dict[str, Skill]:
        """Find or create every template skill; returns template skill name -> Skill."""
        names = [skill.name for skill in template.skills]
        by_name = {s.name: s for s in self.db.query(Skill).filter(Skill.name.in_(names)).all()}
        by_alias = {
            a.alias: a.skill
            for a in self.db.query(SkillAlias).filter(SkillAlias.alias.in_(names)).all()
        }

        resolved: dict[str, Skill] = {}
        for item in template.skills:
            skill = by_name.get(item.name)
            if skill is None and item.name in by_alias:
                skill = by_alias[item.name]
                report.warnings.append(
                    f"skill '{item.name}' is already an alias of '{skill.name}'; using '{skill.name}'"
                )

            if skill is None:
                skill = Skill(name=item.name, description=item.description)
                self.db.add(skill)
                report.created["skills"] += 1
            else:
                report.existing["skills"] += 1
                if skill.description is None and item.description:
                    skill.description = item.description

            self._set_esco_uri(skill, item, report)
            resolved[item.name] = skill

        self.db.flush()
        self._apply_aliases(template, resolved, report)
        return resolved

    def _set_esco_uri(self, skill: Skill, item: TemplateSkill, report: TemplateReport) -> None:
        if not item.esco_uri or skill.esco_uri == item.esco_uri:
            return
        if skill.esco_uri:
            report.warnings.append(
                f"skill '{skill.name}' keeps its ESCO URI {skill.esco_uri} (template has {item.esco_uri})"
            )
            return
        owner = self.db.query(Skill).filter(Skill.esco_uri == item.esco_uri).first()
        if owner is not None and owner is not skill:
            report.warnings.append(
                f"ESCO URI {item.esco_uri} already belongs to '{owner.name}'; not set on '{skill.name}'"
            )
            return
        skill.esco_uri = item.esco_uri

    def _apply_aliases(
        self,
        template: IndustryTemplate,
        skills: dict[str, Skill],
        report: TemplateReport,
    ) -> None:
        aliases = [alias for item in template.skills for alias in item.aliases]
        if not aliases:
            return
        existing = {
            a.alias: a for a in self.db.query(SkillAlias).filter(SkillAlias.alias.in_(aliases)).all()
        }
        skill_names = {
            name for (name,) in self.db.query(Skill.name).filter(Skill.name.in_(aliases)).all()
        }

        for item in template.skills:
            skill = skills[item.name]
            for alias in item.aliases:
                if alias in existing:
                    if existing[alias].skill_id == skill.id:
                        report.existing["aliases"] += 1
                    else:
                        report.warnings.append(
                            f"alias '{alias}' already points to another skill; not added to '{skill.name}'"
                        )
                elif alias in skill_names or alias == skill.name:
                    report.warnings.append(
                        f"alias '{alias}' is already a skill name; not added to '{skill.name}'"
                    )
                else:
                    self.db.add(SkillAlias(skill_id=skill.id, alias=alias))
                    report.created["aliases"] += 1
        self.db.flush()

    # ------------------------------------------
    def _apply_departments(
        self,
        template: IndustryTemplate,
        report: TemplateReport,
    ) -> dict[str, Department]:
        """Returns lowercase department name -> Department."""
        existing = {d.name.lower(): d for d in self.db.query(Department).all()}
        resolved: dict[str, Department] = {}
        for item in template.departments:
            key = item.name.lower()
            department = existing.get(key)
            if department is None:
                department = Department(name=item.name, description=item.description)
                self.db.add(department)
                report.created["departments"] += 1
            else:
                report.existing["departments"] += 1
            resolved[key] = department
        self.db.flush()
        return resolved

    def _apply_positions(
        self,
        template: IndustryTemplate,
        skills: dict[str, Skill],
        departments: dict[str, Department],
        report: TemplateReport,
    ) -> None:
        existing = {
            (title.lower(), department_id)
            for title, department_id in self.db.query(Position.title, Position.department_id).all()
        }

        for item in template.positions:
            department = departments[item.department.lower()] if item.department else None
            department_id = department.id if department else None

            if (item.title.lower(), department_id) in existing:
                # Left exactly as HR configured it
                report.existing["positions"] += 1
                continue

            position = Position(
                title=item.title,
                department_id=department_id,
                level=item.level,
                description=item.description,
                source=template.source,
            )
            self.db.add(position)
            self.db.flush()
            report.created["positions"] += 1

            added: set[int] = set()
            for requirement in item.skills:
                skill = skills[requirement.skill]
                if skill.id in added:
                    report.warnings.append(
                        f"'{item.title}': '{requirement.skill}' resolves to '{skill.name}', "
                        f"which is already required; skipped"
                    )
                    continue
                added.add(skill.id)
                self.db.add(PositionSkill(
                    position_id=position.id,
                    skill_id=skill.id,
                    required_skill_level=requirement.required_level,
                    is_essential=requirement.is_essential,
                    short_description=requirement.short_description,
                    source=template.source,
                ))
                report.created["position_skills"] += 1
        self.db.flush()

    def _apply_courses(
        self,
        template: IndustryTemplate,
        skills: dict[str, Skill],
        report: TemplateReport,
    ) -> None:
        if not template.courses:
            return
        existing = {
            title.lower()
            for (title,) in self.db.query(Course.title).filter(
                func.lower(Course.title).in_([c.title.lower() for c in template.courses])
            ).all()
        }
        for item in template.courses:
            if item.title.lower() in existing:
                report.existing["courses"] += 1
                continue
            course = Course(
                title=item.title,
                provider=item.provider,
                url=item.url,
                difficulty=item.difficulty,
                estimated_hours=item.estimated_hours,
                description=item.description,
            )
            skill_ids = list(dict.fromkeys(skills[name].id for name in item.skills))
            course.course_skills = [CourseSkill(skill_id=skill_id) for skill_id in skill_ids]
            self.db.add(course)
            report.created["courses"] += 1
        self.db.flush()

    # ------------------------------------------
    def _import_questions(
        self,
        directory: Path,
        template: IndustryTemplate,
        skills: dict[str, Skill],
        report: TemplateReport,
    ) -> None:
        files = question_files(directory)
        if not files:
            return
        # Strict: template content is curated, so any invalid question stops the run.
        # Template skills that resolved to a differently named skill (an existing
        # alias) must get their questions too, not a duplicate skill.
        name_map = {name: skill.name for name, skill in skills.items() if skill.name != name}
        importer = QuestionBankImportService(self.db, strict=True, skill_name_map=name_map)
        try:
            report.questions = importer.import_files(files, source=template.question_source)
        except QuestionBankImportError as err:
            raise TemplateError(f"question_bank: {err}", report) from err

    def _check_coverage(self, skills: dict[str, Skill], report: TemplateReport) -> None:
        coverage = ImportReport()
        QuestionBankImportService(self.db, skill_name_map={}).check_coverage(
            {skill.name: skill for skill in skills.values()}, coverage
        )
        report.not_assessable = coverage.not_assessable
        report.small_pools = coverage.small_pools
        if report.not_assessable:
            raise TemplateError(
                f"{len(report.not_assessable)} template skill(s) do not have enough questions to be "
                f"assessed (need 1 Beginner / 2 Intermediate / 2 Advanced): "
                f"{', '.join(sorted(report.not_assessable))}",
                report,
            )
