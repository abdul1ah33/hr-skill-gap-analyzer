"""Choosing which skills an assessment tests (plan §7.1, §A.6; Phase 7)."""
import pytest

from app.core.exceptions import (
    EmployeeNotFoundError,
    NoAssessableSkillsError,
    PositionHasNoSkillsError,
)
from app.models.assessment_enums import SkillGapCategory
from app.models.employee_skill import SkillLevel
from app.services.assessment_target_service import (
    INSUFFICIENT_QUESTIONS,
    NO_QUESTION_BANK,
    OVER_LIMIT,
    AssessmentTargetService,
)
from app.services.skill_comparison_service import SkillComparisonService

pytestmark = pytest.mark.integration

B, I, A = SkillLevel.BEGINNER, SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED


def _required(factory, position, name, level=I, essential=True, questions=True):
    skill = factory.skill(name)
    factory.position_skill(position, skill, level=level, is_essential=essential)
    if questions:
        factory.bank_questions(skill)
    return skill


# ==========================================
# Comparison results carry skill ids
# ==========================================
def test_comparison_entries_include_skill_id(db, factory):
    position = factory.position()
    employee = factory.employee(position)
    matched = _required(factory, position, "sql", level=B)
    needs = _required(factory, position, "python", level=A)
    unmatched = _required(factory, position, "docker")
    extra = factory.skill("excel")
    factory.employee_skill(employee, matched, I)
    factory.employee_skill(employee, needs, B)
    factory.employee_skill(employee, extra, B)

    result = SkillComparisonService().compare_employee_to_position(db, employee.id)

    assert [e["skill_id"] for e in result["matched"]] == [matched.id]
    assert [e["skill_id"] for e in result["needs_improvement"]] == [needs.id]
    assert [e["skill_id"] for e in result["unmatched"]] == [unmatched.id]
    assert [e["skill_id"] for e in result["additional_skills"]] == [extra.id]
    assert [e["verified"] for e in result["matched"] + result["additional_skills"]] == [False, False]


# ==========================================
# Ordering and categories
# ==========================================
def test_order_is_matched_then_needs_improvement_then_unmatched(db, factory):
    position = factory.position()
    employee = factory.employee(position)
    unmatched_essential = _required(factory, position, "a unmatched essential")
    needs_optional = _required(factory, position, "b needs optional", level=A, essential=False)
    matched_optional = _required(factory, position, "c matched optional", level=B, essential=False)
    needs_essential = _required(factory, position, "d needs essential", level=A)
    matched_essential_z = _required(factory, position, "z matched essential", level=B)
    matched_essential_m = _required(factory, position, "m matched essential", level=B)
    for skill in (matched_optional, matched_essential_z, matched_essential_m):
        factory.employee_skill(employee, skill, A)
    for skill in (needs_optional, needs_essential):
        factory.employee_skill(employee, skill, B)

    targets = AssessmentTargetService().select_targets(db, employee.id).targets

    assert [t.skill_name for t in targets] == [
        "m matched essential",
        "z matched essential",
        "c matched optional",
        "d needs essential",
        "b needs optional",
        "a unmatched essential",
    ]
    assert [t.category for t in targets[::3]] == [
        SkillGapCategory.MATCHED,
        SkillGapCategory.NEEDS_IMPROVEMENT,
    ]
    assert targets[-1].category == SkillGapCategory.UNMATCHED
    assert unmatched_essential.id == targets[-1].skill_id


def test_target_carries_claimed_and_required_levels(db, factory):
    position = factory.position()
    employee = factory.employee(position)
    owned = _required(factory, position, "sql", level=A)
    _required(factory, position, "docker", level=B, essential=False)
    factory.employee_skill(employee, owned, I)

    needs, unmatched = AssessmentTargetService().select_targets(db, employee.id).targets

    assert (needs.claimed_level, needs.required_level, needs.is_essential) == (I, A, True)
    assert (unmatched.claimed_level, unmatched.required_level, unmatched.is_essential) == (None, B, False)


def test_additional_skills_are_not_tested(db, factory):
    position = factory.position()
    employee = factory.employee(position)
    _required(factory, position, "sql")
    extra = factory.skill("excel")
    factory.bank_questions(extra)
    factory.employee_skill(employee, extra, A)

    selection = AssessmentTargetService().select_targets(db, employee.id)

    assert [t.skill_name for t in selection.targets] == ["sql"]
    assert selection.skipped == []


# ==========================================
# Question availability and the cap
# ==========================================
def test_skills_without_enough_questions_are_not_assessable(db, factory):
    position = factory.position()
    employee = factory.employee(position)
    _required(factory, position, "sql")
    _required(factory, position, "vague skill", questions=False)
    thin = _required(factory, position, "thin skill", questions=False)
    factory.bank_questions(thin, beginner=3, intermediate=1, advanced=5)
    inactive = _required(factory, position, "retired skill", questions=False)
    factory.bank_questions(inactive, is_active=False)

    selection = AssessmentTargetService().select_targets(db, employee.id)

    assert [t.skill_name for t in selection.targets] == ["sql"]
    assert {(s.skill.skill_name, s.reason) for s in selection.not_assessable} == {
        ("vague skill", NO_QUESTION_BANK),
        ("thin skill", INSUFFICIENT_QUESTIONS),
        ("retired skill", NO_QUESTION_BANK),
    }


def test_only_max_skills_are_tested_and_the_rest_are_over_limit(db, factory):
    position = factory.position()
    employee = factory.employee(position)
    for n in range(10):
        _required(factory, position, f"skill {n:02d}")

    selection = AssessmentTargetService().select_targets(db, employee.id, max_skills=8)

    assert [t.skill_name for t in selection.targets] == [f"skill {n:02d}" for n in range(8)]
    assert [(s.skill.skill_name, s.reason) for s in selection.over_limit] == [
        ("skill 08", OVER_LIMIT),
        ("skill 09", OVER_LIMIT),
    ]
    assert selection.not_assessable == []


def test_not_assessable_skills_do_not_use_up_the_cap(db, factory):
    position = factory.position()
    employee = factory.employee(position)
    _required(factory, position, "a no questions", questions=False)
    _required(factory, position, "b sql")
    _required(factory, position, "c docker")

    selection = AssessmentTargetService().select_targets(db, employee.id, max_skills=2)

    assert [t.skill_name for t in selection.targets] == ["b sql", "c docker"]
    assert selection.over_limit == []


# ==========================================
# Errors
# ==========================================
def test_unknown_employee(db):
    with pytest.raises(EmployeeNotFoundError):
        AssessmentTargetService().select_targets(db, 999_999)


def test_position_without_skills(db, factory):
    employee = factory.employee()

    with pytest.raises(PositionHasNoSkillsError):
        AssessmentTargetService().select_targets(db, employee.id)


def test_nothing_assessable(db, factory):
    position = factory.position()
    employee = factory.employee(position)
    _required(factory, position, "vague skill", questions=False)

    with pytest.raises(NoAssessableSkillsError) as error:
        AssessmentTargetService().select_targets(db, employee.id)

    assert [(s.skill.skill_name, s.reason) for s in error.value.not_assessable] == [
        ("vague skill", NO_QUESTION_BANK),
    ]


def test_gap_analysis_keeps_skill_id_out_of_the_prompt(db, factory, monkeypatch):
    from app.services import gap_analysis_service

    position = factory.position()
    employee = factory.employee(position)
    skill = _required(factory, position, "sql")
    sent = {}

    def fake_report(job_title, skill_diff, api_key):
        sent.update(skill_diff)
        return None

    monkeypatch.setattr(gap_analysis_service, "generate_gap_report", fake_report)

    result = gap_analysis_service.SkillGapService().generate_employee_gap_analysis(
        db=db, employee_id=employee.id, api_key="test"
    )

    assert "skill_id" not in sent["unmatched"][0]
    assert all("verified" not in entry for entries in sent.values() for entry in entries)
    assert result["skill_diff"]["unmatched"][0]["skill_id"] == skill.id
