"""Starting assessments: question selection and persistence (plan §7.2–7.4, Phase 8)."""
import random
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.config import (
    ASSESSMENT_GRACE_SECONDS,
    ASSESSMENT_MAX_VIOLATIONS,
    ASSESSMENT_SECONDS_PER_QUESTION,
)
from app.core.exceptions import NoAssessableSkillsError
from app.crud.assessment import (
    get_active_assessment,
    get_employee_assessment,
    served_question_ids,
)
from app.models.assessment import Assessment
from app.models.assessment_enums import AssessmentAdministration, AssessmentStatus
from app.models.assessment_question import AssessmentQuestion
from app.models.employee_skill import SkillLevel
from app.services import assessment_generation_service
from app.services.assessment_generation_service import (
    AssessmentGenerationService,
    is_expired,
    pick_questions,
)

B, I, A = SkillLevel.BEGINNER, SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED

NOW = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc)


def _service(seed: int = 1) -> AssessmentGenerationService:
    return AssessmentGenerationService(rng=random.Random(seed))


def _setup(factory, skills: int = 2, **bank):
    """An employee whose position requires `skills` skills, each with bank questions."""
    position = factory.position()
    employee = factory.employee(position)
    user = factory.user(employee=employee)
    created = []
    for n in range(skills):
        skill = factory.skill(f"skill {n}")
        factory.position_skill(position, skill)
        created.append((skill, factory.bank_questions(skill, **bank)))
    return employee, user, created


def _finish(db, assessment: Assessment) -> None:
    assessment.status = AssessmentStatus.SUBMITTED
    db.flush()


# ==========================================
# pick_questions (pure)
# ==========================================
@pytest.mark.unit
def test_pick_prefers_unseen_questions():
    picked = pick_questions([1, 2, 3, 4, 5], seen={1, 2}, count=3, rng=random.Random(0))
    assert sorted(picked) == [3, 4, 5]


@pytest.mark.unit
def test_pick_fills_up_with_seen_questions():
    picked = pick_questions([1, 2, 3, 4], seen={1, 2, 3}, count=2, rng=random.Random(0))
    assert picked[0] == 4
    assert picked[1] in {1, 2, 3}


@pytest.mark.unit
def test_pick_is_random():
    pool = list(range(30))
    results = {tuple(pick_questions(pool, set(), 2, random.Random(seed))) for seed in range(20)}
    assert len(results) > 10


# ==========================================
# Persistence
# ==========================================
@pytest.mark.integration
def test_start_creates_skills_questions_and_shuffled_options(db, factory):
    employee, user, created = _setup(factory, skills=2)

    assessment = _service().start(db, employee.id, user.id, now=NOW)

    assert assessment.status == AssessmentStatus.IN_PROGRESS
    assert assessment.administered_by == AssessmentAdministration.SELF
    assert assessment.started_by_user_id == user.id
    assert assessment.position_id == employee.position_id
    assert assessment.position_title == employee.position.title
    assert assessment.seconds_per_question == ASSESSMENT_SECONDS_PER_QUESTION
    assert assessment.max_violations == ASSESSMENT_MAX_VIOLATIONS
    assert assessment.started_at == NOW
    assert assessment.expires_at == NOW + timedelta(
        seconds=10 * ASSESSMENT_SECONDS_PER_QUESTION + ASSESSMENT_GRACE_SECONDS
    )

    assert [s.skill_id for s in assessment.skills] == [skill.id for skill, _ in created]
    assert [s.display_order for s in assessment.skills] == [1, 2]
    assert [q.display_order for q in assessment.questions] == list(range(1, 11))

    for assessment_skill, (skill, bank) in zip(assessment.skills, created):
        questions = assessment_skill.questions
        assert [q.proficiency_level for q in questions] == [B, I, I, A, A]
        assert {q.skill_question.skill_id for q in questions} == {skill.id}
        for question in questions:
            bank_option_ids = sorted(o.id for o in question.skill_question.options)
            assert sorted(question.option_order) == bank_option_ids
            assert question.selected_option_id is None


@pytest.mark.integration
def test_option_order_is_shuffled(db, factory):
    employee, user, _ = _setup(factory, skills=4)

    assessment = _service().start(db, employee.id, user.id, now=NOW)

    orders = [q.option_order for q in assessment.questions]
    assert any(order != sorted(order) for order in orders)


@pytest.mark.integration
def test_second_start_returns_the_same_assessment(db, factory):
    employee, user, _ = _setup(factory)
    first = _service(seed=1).start(db, employee.id, user.id, now=NOW)
    snapshot = [(q.id, q.skill_question_id, list(q.option_order)) for q in first.questions]

    second = _service(seed=2).start(db, employee.id, user.id, now=NOW + timedelta(minutes=5))

    assert second.id == first.id
    assert [(q.id, q.skill_question_id, list(q.option_order)) for q in second.questions] == snapshot
    assert db.query(Assessment).filter_by(employee_id=employee.id).count() == 1


@pytest.mark.integration
def test_inactive_questions_are_never_picked(db, factory):
    employee, user, created = _setup(factory, skills=1)
    skill, _ = created[0]
    retired = factory.bank_questions(skill, beginner=5, intermediate=5, advanced=5, is_active=False)

    assessment = _service().start(db, employee.id, user.id, now=NOW)

    assert not {q.skill_question_id for q in assessment.questions} & {q.id for q in retired}


@pytest.mark.integration
def test_next_attempt_prefers_unseen_questions(db, factory):
    employee, user, created = _setup(factory, skills=1, beginner=2, intermediate=4, advanced=4)
    first = _service().start(db, employee.id, user.id, now=NOW)
    _finish(db, first)

    second = _service().start(db, employee.id, user.id, now=NOW + timedelta(days=1))
    _finish(db, second)

    first_ids = {q.skill_question_id for q in first.questions}
    second_ids = {q.skill_question_id for q in second.questions}
    assert first_ids.isdisjoint(second_ids)
    assert served_question_ids(db, employee.id) == first_ids | second_ids

    # Every question was seen now; the third attempt reuses seen ones
    third = _service().start(db, employee.id, user.id, now=NOW + timedelta(days=2))
    assert len(third.questions) == 5


@pytest.mark.integration
def test_assigned_assessment_is_started_in_place(db, factory):
    employee, user, _ = _setup(factory)
    hr = factory.user(role="HR")
    assigned = Assessment(
        employee_id=employee.id,
        status=AssessmentStatus.ASSIGNED,
        assigned_by_user_id=hr.id,
        assigned_at=NOW,
    )
    db.add(assigned)
    db.flush()

    started = _service().start(
        db, employee.id, hr.id, administered_by=AssessmentAdministration.HR_ON_BEHALF, now=NOW
    )

    assert started.id == assigned.id
    assert started.status == AssessmentStatus.IN_PROGRESS
    assert started.administered_by == AssessmentAdministration.HR_ON_BEHALF
    assert started.assigned_by_user_id == hr.id
    assert len(started.questions) == 10


@pytest.mark.integration
def test_nothing_assessable_leaves_assigned_assessment_untouched(db, factory):
    position = factory.position()
    employee = factory.employee(position)
    factory.position_skill(position, factory.skill("vague skill"))
    assigned = Assessment(employee_id=employee.id, status=AssessmentStatus.ASSIGNED)
    db.add(assigned)
    db.flush()

    with pytest.raises(NoAssessableSkillsError):
        _service().start(db, employee.id, None, now=NOW)

    assert assigned.status == AssessmentStatus.ASSIGNED
    assert assigned.questions == []


# ==========================================
# Expiry
# ==========================================
@pytest.mark.integration
def test_expired_assessment_is_closed_and_a_new_one_started(db, factory):
    employee, user, _ = _setup(factory)
    old = _service().start(db, employee.id, user.id, now=NOW)
    later = old.expires_at + timedelta(seconds=1)

    assert not is_expired(old, old.expires_at)
    assert is_expired(old, later)

    new = _service().start(db, employee.id, user.id, now=later)

    assert new.id != old.id
    assert old.status == AssessmentStatus.EXPIRED
    assert old.applied_to_profile is True  # graded and applied (D12)
    assert all(s.graded_at == later for s in old.skills)
    assert new.status == AssessmentStatus.IN_PROGRESS


# ==========================================
# One active assessment per employee
# ==========================================
@pytest.mark.integration
def test_database_allows_only_one_active_assessment(db, factory):
    employee = factory.employee()
    db.add(Assessment(employee_id=employee.id, status=AssessmentStatus.SUBMITTED))
    db.add(Assessment(employee_id=employee.id, status=AssessmentStatus.SUBMITTED))
    db.add(Assessment(employee_id=employee.id, status=AssessmentStatus.IN_PROGRESS))
    db.flush()

    with pytest.raises(IntegrityError, match="uq_assessments_one_active_per_employee"):
        with db.begin_nested():
            db.add(Assessment(employee_id=employee.id, status=AssessmentStatus.ASSIGNED))
            db.flush()


@pytest.mark.integration
def test_concurrent_start_returns_the_winning_assessment(db, factory, monkeypatch):
    employee, user, _ = _setup(factory)
    winner = _service().start(db, employee.id, user.id, now=NOW)

    # Simulate a request that checked before the winner was committed
    calls = []

    def stale_then_real(db_, employee_id, for_update=False):
        calls.append(employee_id)
        return None if len(calls) == 1 else get_active_assessment(db_, employee_id, for_update)

    monkeypatch.setattr(assessment_generation_service, "get_active_assessment", stale_then_real)

    result = _service(seed=9).start(db, employee.id, user.id, now=NOW)

    assert result.id == winner.id
    assert db.query(Assessment).filter_by(employee_id=employee.id).count() == 1
    assert db.query(AssessmentQuestion).filter_by(assessment_id=winner.id).count() == 10


# ==========================================
# Loaders
# ==========================================
@pytest.mark.integration
def test_employee_scoped_loader(db, factory):
    employee, user, _ = _setup(factory)
    other = factory.employee()
    assessment = _service().start(db, employee.id, user.id, now=NOW)

    assert get_employee_assessment(db, assessment.id, employee.id) is assessment
    assert get_employee_assessment(db, assessment.id, other.id) is None
