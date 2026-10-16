"""Phase 3 of the industry templates plan: template format and applier."""
import json
import shutil
import sys
from collections import Counter
from pathlib import Path

import pytest

from app.db.database import SessionLocal
from app.models.course import Course
from app.models.department import Department
from app.models.employee_skill import SkillLevel
from app.models.organization_settings import OrganizationSettings
from app.models.position import Position
from app.models.position_skill import PositionSkill
from app.models.skill import Skill
from app.models.skill_alias import SkillAlias
from app.models.skill_question import SkillQuestion
from app.scripts import apply_template as apply_template_script
from app.services.assessment_scoring_service import QUESTIONS_PER_LEVEL
from app.services.question_bank_import_service import default_bank_files
from app.services.template_service import (
    TemplateError,
    TemplateService,
    load_template,
    question_files,
    resolve_template_dir,
)
from app.utils.skill_names import normalize_skill_name

pytestmark = pytest.mark.integration

MINI = Path(__file__).resolve().parent / "fixtures" / "templates" / "mini"


@pytest.fixture
def mini(tmp_path) -> Path:
    """A writable copy of the mini template."""
    return Path(shutil.copytree(MINI, tmp_path / "mini"))


def _edit(directory: Path, filename: str, change) -> None:
    path = directory / filename
    data = json.loads(path.read_text(encoding="utf-8"))
    change(data)
    path.write_text(json.dumps(data), encoding="utf-8")


def _apply(db, directory: Path = MINI, name: str | None = "Client A Port"):
    return TemplateService(db).apply(directory, organization_name=name)


# ─── Loading and validation ──────────────────────────────────────────────────

def test_mini_template_is_valid():
    template = load_template(MINI)

    assert template.info.key == "mini"
    assert template.source == "template:mini@1"
    assert len(template.skills) == 6
    assert template.skills[0].name == "rtg crane operation"
    assert template.skills[0].aliases == ["rubber tyred gantry operation", "rtg operation"]


def test_bad_references_are_reported_together(mini):
    def break_positions(positions):
        positions[0]["department"] = "Gate Operations"
        positions[0]["skills"].append({"skill": "Crane Maintenance", "required_level": "Beginner"})

    _edit(mini, "positions.json", break_positions)
    _edit(mini, "courses.json", lambda courses: courses[0]["skills"].append("Forklift Driving"))

    with pytest.raises(TemplateError) as err:
        load_template(mini)

    message = str(err.value)
    assert "department 'Gate Operations' is not in departments.json" in message
    assert "skill 'crane maintenance' is not in skills.json" in message
    assert "'IMDG Code Basics': skill 'forklift driving' is not in skills.json" in message


def test_alias_on_two_skills_is_rejected(mini):
    _edit(mini, "skills.json", lambda skills: skills[1]["aliases"].append("RTG Operation"))

    with pytest.raises(TemplateError, match="alias 'rtg operation' belongs to both"):
        load_template(mini)


def test_invalid_level_names_the_file(mini):
    _edit(mini, "positions.json", lambda p: p[0]["skills"][0].update(required_level="Expert"))

    with pytest.raises(TemplateError, match="positions.json"):
        load_template(mini)


def test_missing_required_file(mini):
    (mini / "departments.json").unlink()

    with pytest.raises(TemplateError, match="departments.json is missing"):
        load_template(mini)


# ─── Applying ────────────────────────────────────────────────────────────────

def test_apply_creates_everything(db):
    report = _apply(db)

    assert report.created == {
        "skills": 6, "aliases": 4, "departments": 2,
        "positions": 3, "position_skills": 8, "courses": 1,
    }
    assert report.questions.inserted == 30
    assert report.not_assessable == {}
    assert "has not been reviewed" in report.summary()

    position = db.query(Position).filter_by(title="RTG Operator").one()
    assert position.source == "template:mini@1"
    assert position.department.name == "Yard Operations"
    rows = {row.skill.name: row for row in position.position_skills}
    assert rows["rtg crane operation"].required_skill_level == SkillLevel.ADVANCED
    assert rows["radio communication"].is_essential is False
    assert {row.source for row in rows.values()} == {"template:mini@1"}

    skill = db.query(Skill).filter_by(name="rtg crane operation").one()
    assert skill.esco_uri == "http://example.org/test-esco/rtg-crane-operation"
    assert {a.alias for a in skill.aliases} == {"rubber tyred gantry operation", "rtg operation"}

    course = db.query(Course).filter_by(title="IMDG Code Basics").one()
    assert [cs.skill.name for cs in course.course_skills] == ["dangerous goods handling"]

    assert db.query(SkillQuestion).filter_by(source="template:mini").count() == 30

    organization = db.get(OrganizationSettings, 1)
    assert (organization.name, organization.industry) == ("Client A Port", "port")
    assert (organization.template_key, organization.template_version) == ("mini", 1)
    assert organization.template_applied_at is not None


def test_reapplying_changes_nothing(db):
    _apply(db)

    report = _apply(db)

    assert set(report.created.values()) == {0}
    assert report.existing["positions"] == 3
    assert report.questions.inserted == 0
    assert report.questions.unchanged == 30
    assert db.query(Position).count() == 3


def test_hr_changes_survive_reapplying(db):
    _apply(db)
    position = db.query(Position).filter_by(title="RTG Operator").one()
    rows = {row.skill.name: row for row in position.position_skills}
    db.delete(rows["radio communication"])
    rows["rtg crane operation"].required_skill_level = SkillLevel.INTERMEDIATE
    db.flush()

    _apply(db)

    db.expire_all()
    rows = {row.skill.name: row for row in position.position_skills}
    assert "radio communication" not in rows
    assert rows["rtg crane operation"].required_skill_level == SkillLevel.INTERMEDIATE


def test_existing_data_is_reused_not_duplicated(db, factory):
    lashing = factory.skill("container lashing")
    db.add(Department(name="QUAY OPERATIONS"))
    db.flush()

    report = _apply(db)

    assert report.existing["skills"] == 1
    assert report.existing["departments"] == 1
    assert db.query(Skill).filter_by(name="container lashing").count() == 1
    # Empty description is filled in from the template
    assert lashing.description == "Securing containers on deck with lashing rods and twistlocks."
    planner = db.query(Position).filter_by(title="Vessel Planner").one()
    assert planner.department.name == "QUAY OPERATIONS"


def test_template_skill_that_is_an_existing_alias_uses_that_skill(db, factory):
    radio = factory.skill("vhf radio")
    db.add(SkillAlias(skill_id=radio.id, alias="radio communication"))
    db.flush()

    report = _apply(db)

    assert any("already an alias of 'vhf radio'" in w for w in report.warnings)
    assert db.query(Skill).filter_by(name="radio communication").count() == 0
    position = db.query(Position).filter_by(title="RTG Operator").one()
    assert "vhf radio" in {row.skill.name for row in position.position_skills}
    # Its questions go to the same skill
    assert db.query(SkillQuestion).filter_by(skill_id=radio.id, source="template:mini").count() == 5


def test_templated_position_works_with_comparison_and_assessments(client, db, factory, hr_headers):
    _apply(db)
    position = db.query(Position).filter_by(title="Lashing Supervisor").one()
    employee = factory.employee(position)
    lashing = db.query(Skill).filter_by(name="container lashing").one()
    factory.employee_skill(employee, lashing, SkillLevel.INTERMEDIATE)

    response = client.get(f"/employees/{employee.id}/assessments/preview", headers=hr_headers)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["position_title"] == "Lashing Supervisor"
    assert body["not_assessable"] == []
    tested = {skill["skill_name"] for skill in body["assessable"]}
    assert tested == {"container lashing", "dangerous goods handling", "terminal safety procedures"}


def test_main_question_bank_is_not_touched(db, factory):
    skill = factory.skill("python")
    main_bank = factory.bank_questions(skill)
    for question in main_bank:
        question.source = "curated"
    db.flush()

    _apply(db)

    db.expire_all()
    assert all(question.is_active for question in main_bank)


def test_skill_without_questions_fails_the_gate(db, mini):
    _edit(mini, "skills.json", lambda skills: skills.append({"name": "Crane Maintenance"}))

    with pytest.raises(TemplateError) as err:
        _apply(db, mini)

    assert "crane maintenance" in str(err.value)
    assert "crane maintenance" in err.value.report.not_assessable


def test_needs_an_organization_name_when_not_configured(db):
    with pytest.raises(TemplateError, match="Organization settings are not configured"):
        _apply(db, name=None)


def test_uses_existing_organization_settings(db):
    db.add(OrganizationSettings(id=1, name="Client A"))
    db.flush()

    _apply(db, name=None)

    organization = db.get(OrganizationSettings, 1)
    assert (organization.name, organization.industry) == ("Client A", "port")


def test_a_database_uses_one_industry_template(db, mini):
    _apply(db)
    _edit(mini, "template.json", lambda info: info.update(key="hospital", industry="hospital"))

    with pytest.raises(TemplateError, match="already uses the 'mini' template"):
        _apply(db, mini)


# ─── Shipped templates ───────────────────────────────────────────────────────

def test_port_template_is_valid_and_every_skill_is_assessable():
    """
    Checked on the files, without a database: every skill has enough questions
    in the template or in the main bank (which provisioning imports first).
    """
    directory = resolve_template_dir("port")
    template = load_template(directory)
    assert template.info.key == "port"
    assert template.info.reviewed is False   # mock data until an expert reviews it

    counts: dict[str, Counter] = {}
    for path in question_files(directory) + default_bank_files():
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                entry = json.loads(line)
                levels = counts.setdefault(normalize_skill_name(entry["skill_name"]), Counter())
                levels.update(q["proficiency_level"] for q in entry["questions"])

    short = [
        skill.name for skill in template.skills
        if any(counts.get(skill.name, Counter())[level] < quota for level, quota in QUESTIONS_PER_LEVEL.items())
    ]
    assert short == []


# ─── Script ──────────────────────────────────────────────────────────────────

def test_dry_run_writes_nothing(monkeypatch, capsys):
    monkeypatch.setattr(
        sys, "argv",
        ["apply_template", str(MINI), "--dry-run", "--organization-name", "Dry Run Port"],
    )

    assert apply_template_script.main() == 0

    assert "Dry run: nothing was written." in capsys.readouterr().out
    session = SessionLocal()
    try:
        assert session.query(Position).filter(Position.source == "template:mini@1").count() == 0
        assert session.get(OrganizationSettings, 1) is None
    finally:
        session.close()


def test_script_reports_failure(monkeypatch, capsys, mini):
    _edit(mini, "skills.json", lambda skills: skills.append({"name": "Crane Maintenance"}))
    monkeypatch.setattr(
        sys, "argv", ["apply_template", str(mini), "--organization-name", "Failing Port"],
    )

    assert apply_template_script.main() == 1

    out = capsys.readouterr().out
    assert "NOT ASSESSABLE crane maintenance" in out
    assert "nothing was written" in out
