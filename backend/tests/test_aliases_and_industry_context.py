"""Phase 4 of the industry templates plan: aliases in the comparison, industry context in gap analysis."""
import pytest

from app.ai import gap_analysis_ai
from app.models.employee_skill import SkillLevel
from app.models.organization_settings import OrganizationSettings
from app.models.skill_alias import SkillAlias
from app.services import gap_analysis_service
from app.services.assessment_target_service import AssessmentTargetService
from app.services.skill_comparison_service import SkillComparisonService

pytestmark = pytest.mark.integration


def _alias(db, skill, alias: str) -> None:
    db.add(SkillAlias(skill_id=skill.id, alias=alias))
    db.flush()


def _compare(db, employee) -> dict:
    return SkillComparisonService().compare_employee_to_position(db, employee.id)


# ─── Aliases in the comparison ───────────────────────────────────────────────

def test_skill_held_under_an_alias_counts_as_matched(db, factory):
    position = factory.position("RTG Operator")
    rtg = factory.skill("rtg crane operation")
    factory.position_skill(position, rtg, SkillLevel.INTERMEDIATE)
    employee = factory.employee(position)
    held = factory.skill("rtg operation")
    _alias(db, rtg, "rtg operation")
    factory.employee_skill(employee, held, SkillLevel.ADVANCED)

    result = _compare(db, employee)

    assert result["unmatched"] == []
    assert result["additional_skills"] == []
    [entry] = result["matched"]
    assert entry["skill_id"] == rtg.id
    assert entry["skill"] == "rtg crane operation"
    assert entry["employee_level"] == "Advanced"
    assert entry["matched_via"] == "rtg operation"


def test_alias_works_in_both_directions(db, factory):
    # The position requires the alias, the employee has the main skill
    position = factory.position()
    lashing = factory.skill("container lashing")
    held_alias = factory.skill("lashing")
    _alias(db, lashing, "lashing")
    factory.position_skill(position, held_alias, SkillLevel.ADVANCED)
    employee = factory.employee(position)
    factory.employee_skill(employee, lashing, SkillLevel.BEGINNER)

    result = _compare(db, employee)

    [entry] = result["needs_improvement"]
    assert entry["skill"] == "lashing"
    assert entry["matched_via"] == "container lashing"
    assert result["additional_skills"] == []


def test_own_skill_wins_over_an_alias(db, factory):
    position = factory.position()
    rtg = factory.skill("rtg crane operation")
    factory.position_skill(position, rtg, SkillLevel.INTERMEDIATE)
    employee = factory.employee(position)
    alias_skill = factory.skill("rtg operation")
    _alias(db, rtg, "rtg operation")
    factory.employee_skill(employee, rtg, SkillLevel.BEGINNER)
    factory.employee_skill(employee, alias_skill, SkillLevel.ADVANCED)

    result = _compare(db, employee)

    [entry] = result["needs_improvement"]
    assert entry["employee_level"] == "Beginner"
    assert "matched_via" not in entry
    # The alias skill is the same skill, not an extra one
    assert result["additional_skills"] == []


def test_skills_sharing_a_parent_are_not_matched(db, factory):
    # "python" and "java" are both aliases of "computer programming"
    position = factory.position()
    programming = factory.skill("computer programming")
    python = factory.skill("python")
    java = factory.skill("java")
    _alias(db, programming, "python")
    _alias(db, programming, "java")
    factory.position_skill(position, python)
    employee = factory.employee(position)
    factory.employee_skill(employee, java, SkillLevel.ADVANCED)

    result = _compare(db, employee)

    assert [entry["skill"] for entry in result["unmatched"]] == ["python"]
    assert [entry["skill"] for entry in result["additional_skills"]] == ["java"]


def test_unrelated_aliases_change_nothing(db, factory):
    position = factory.position()
    sql = factory.skill("sql")
    factory.position_skill(position, sql, SkillLevel.INTERMEDIATE)
    employee = factory.employee(position)
    excel = factory.skill("excel")
    factory.employee_skill(employee, excel)
    before = _compare(db, employee)

    _alias(db, sql, "structured query language")
    _alias(db, excel, "spreadsheets")

    assert _compare(db, employee) == before


def test_assessment_targets_use_the_alias_match(db, factory):
    position = factory.position()
    rtg = factory.skill("rtg crane operation")
    factory.position_skill(position, rtg, SkillLevel.ADVANCED)
    employee = factory.employee(position)
    held = factory.skill("rtg operation")
    _alias(db, rtg, "rtg operation")
    factory.employee_skill(employee, held, SkillLevel.INTERMEDIATE)

    [candidate] = AssessmentTargetService().candidates(db, employee.id)

    assert candidate.skill_id == rtg.id
    assert candidate.claimed_level == SkillLevel.INTERMEDIATE
    assert candidate.category.value == "needs_improvement"


# ─── Industry context in gap analysis ────────────────────────────────────────

def _capture_report(monkeypatch) -> dict:
    sent = {}

    def fake_report(**kwargs):
        sent.update(kwargs)
        return None

    monkeypatch.setattr(gap_analysis_service, "generate_gap_report", fake_report)
    return sent


def test_gap_analysis_passes_the_organization(db, factory, monkeypatch):
    db.add(OrganizationSettings(id=1, name="Client A Port", industry="port"))
    db.flush()
    employee = factory.employee()
    sent = _capture_report(monkeypatch)

    gap_analysis_service.SkillGapService().generate_employee_gap_analysis(
        db=db, employee_id=employee.id, api_key="test"
    )

    assert sent["industry"] == "port"
    assert sent["company_name"] == "Client A Port"


def test_gap_analysis_without_organization_settings(db, factory, monkeypatch):
    employee = factory.employee()
    sent = _capture_report(monkeypatch)

    gap_analysis_service.SkillGapService().generate_employee_gap_analysis(
        db=db, employee_id=employee.id, api_key="test"
    )

    assert sent["industry"] is None
    assert sent["company_name"] is None


def test_prompt_mentions_the_industry():
    lines = gap_analysis_ai.build_context_lines("port", "Client A Port")

    assert "Company: Client A Port" in lines
    assert "Industry: port" in lines
    assert gap_analysis_ai.build_context_lines(None, None) == ""
