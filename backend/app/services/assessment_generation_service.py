"""
Starts assessments: picks the questions and stores the attempt (plan §7.2–7.4).

- Skills come from AssessmentTargetService (order, availability, cap).
- Per skill: 1 Beginner, 2 Intermediate, 2 Advanced questions, picked with
  SystemRandom, preferring questions the employee hasn't been given before.
- Options are shuffled once and stored in option_order, so a refresh shows
  exactly the same questions in the same order.
- Starting is idempotent: a running assessment is returned instead of a new
  one, an assigned one is started, and a concurrent start that loses the race
  on the "one active assessment" index returns the winner's assessment.
- A running assessment past its deadline is graded and applied as EXPIRED
  (D12) before a new one starts.
"""
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import (
    ASSESSMENT_GRACE_SECONDS,
    ASSESSMENT_MAX_SKILLS,
    ASSESSMENT_MAX_VIOLATIONS,
    ASSESSMENT_SECONDS_PER_QUESTION,
)
from app.crud.assessment import get_active_assessment, served_question_ids
from app.crud.question_bank import active_question_pools, option_ids_by_question
from app.models.assessment import Assessment
from app.models.assessment_enums import AssessmentAdministration, AssessmentStatus
from app.models.assessment_question import AssessmentQuestion
from app.models.assessment_skill import AssessmentSkill
from app.models.employee import Employee
from app.models.employee_skill import SkillLevel
from app.services.assessment_grading_service import finalize_assessment
from app.services.assessment_scoring_service import QUESTIONS_PER_LEVEL
from app.services.assessment_target_service import AssessmentTargetService, CandidateSkill

ACTIVE_INDEX_NAME = "uq_assessments_one_active_per_employee"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def is_expired(assessment: Assessment, now: datetime | None = None) -> bool:
    """True when an in-progress assessment is past its server deadline."""
    return (
        assessment.status == AssessmentStatus.IN_PROGRESS
        and assessment.expires_at is not None
        and (now or utc_now()) > assessment.expires_at
    )


def pick_questions(
    pool: list[int],
    seen: set[int],
    count: int,
    rng: random.Random,
) -> list[int]:
    """
    Pick `count` question ids from the pool, unseen ones first. Seen questions
    are only used when there aren't enough unseen ones.
    """
    unseen = [q for q in pool if q not in seen]
    if len(unseen) >= count:
        return rng.sample(unseen, count)

    already_seen = [q for q in pool if q in seen]
    return rng.sample(unseen, len(unseen)) + rng.sample(already_seen, count - len(unseen))


class AssessmentGenerationService:
    def __init__(
        self,
        target_service: AssessmentTargetService | None = None,
        rng: random.Random | None = None,
    ):
        self.target_service = target_service or AssessmentTargetService()
        self.rng = rng or random.SystemRandom()

    # ==========================================
    # Main entry point
    # ==========================================
    def start(
        self,
        db: Session,
        employee_id: int,
        started_by_user_id: int | None,
        administered_by: AssessmentAdministration = AssessmentAdministration.SELF,
        max_skills: int = ASSESSMENT_MAX_SKILLS,
        now: datetime | None = None,
    ) -> Assessment:
        """
        Return the employee's running assessment, or start one (the assigned
        one if HR assigned it, otherwise a new one). Commits.
        """
        now = now or utc_now()

        active = get_active_assessment(db, employee_id, for_update=True)

        if active is not None and active.status == AssessmentStatus.IN_PROGRESS:
            if not is_expired(active, now):
                return active
            finalize_assessment(db, active, AssessmentStatus.EXPIRED, now)
            active = None

        selection = self.target_service.select_targets(db, employee_id, max_skills)
        employee = db.get(Employee, employee_id)

        assessment = active or Assessment(employee_id=employee_id)
        assessment.status = AssessmentStatus.IN_PROGRESS
        assessment.position_id = employee.position_id
        assessment.position_title = employee.position.title
        assessment.administered_by = administered_by
        assessment.started_by_user_id = started_by_user_id
        assessment.started_at = now
        assessment.seconds_per_question = ASSESSMENT_SECONDS_PER_QUESTION
        assessment.max_violations = ASSESSMENT_MAX_VIOLATIONS

        self._add_questions(db, assessment, selection.targets)

        assessment.expires_at = now + timedelta(
            seconds=len(assessment.questions) * ASSESSMENT_SECONDS_PER_QUESTION
            + ASSESSMENT_GRACE_SECONDS
        )

        try:
            with db.begin_nested():
                db.add(assessment)
                db.flush()
        except IntegrityError as err:
            # Another request started an assessment for this employee first
            if ACTIVE_INDEX_NAME not in str(err.orig):
                raise
            winner = get_active_assessment(db, employee_id)
            if winner is None:
                raise
            return winner

        db.commit()
        return assessment

    # ==========================================
    # Question selection
    # ==========================================
    def _add_questions(
        self,
        db: Session,
        assessment: Assessment,
        targets: list[CandidateSkill],
    ) -> None:
        pools = active_question_pools(db, [t.skill_id for t in targets])
        seen = served_question_ids(db, assessment.employee_id)

        picked: list[tuple[AssessmentSkill, SkillLevel, int]] = []
        for skill_order, target in enumerate(targets, start=1):
            assessment_skill = AssessmentSkill(
                skill_id=target.skill_id,
                display_order=skill_order,
                category=target.category,
                is_essential=target.is_essential,
                claimed_level=target.claimed_level,
                required_level=target.required_level,
            )
            assessment.skills.append(assessment_skill)

            # Beginner → Intermediate → Advanced inside each skill (D11)
            for level, count in QUESTIONS_PER_LEVEL.items():
                pool = pools.get((target.skill_id, level), [])
                for question_id in pick_questions(pool, seen, count, self.rng):
                    picked.append((assessment_skill, level, question_id))

        options = option_ids_by_question(db, [question_id for _, _, question_id in picked])

        for display_order, (assessment_skill, level, question_id) in enumerate(picked, start=1):
            option_ids = options[question_id]
            assessment.questions.append(AssessmentQuestion(
                assessment_skill=assessment_skill,
                skill_question_id=question_id,
                display_order=display_order,
                proficiency_level=level,
                option_order=self.rng.sample(option_ids, len(option_ids)),
            ))
