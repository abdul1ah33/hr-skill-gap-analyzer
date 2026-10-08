"""
Grades a finished assessment and applies the result to the employee's
profile (plan §9.4, §A.8, D12).

- SUBMITTED and EXPIRED attempts are graded and applied.
- TERMINATED attempts are graded but not applied (NOT_APPLIED).
- Applying: assessed None deletes the employee skill (REMOVED); otherwise
  the level is set (or the skill created) and marked verified.

The caller holds the row lock and commits.
"""
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.assessment_enums import AssessmentStatus, ProfileAction
from app.models.assessment_skill import AssessmentSkill
from app.models.employee_skill import EmployeeSkill
from app.services.assessment_scoring_service import (
    SCORING_RULES_VERSION,
    profile_action_for,
    score_skill,
)

FINAL_STATUSES = (
    AssessmentStatus.SUBMITTED,
    AssessmentStatus.EXPIRED,
    AssessmentStatus.TERMINATED,
)


def finalize_assessment(
    db: Session,
    assessment: Assessment,
    final_status: AssessmentStatus,
    now: datetime,
) -> None:
    """Grade every skill, apply the result if allowed, and close the attempt."""
    if final_status not in FINAL_STATUSES:
        raise ValueError(f"{final_status} is not a final status")
    if assessment.status != AssessmentStatus.IN_PROGRESS:
        raise ValueError("only an in-progress assessment can be finalized")

    apply = final_status != AssessmentStatus.TERMINATED

    for assessment_skill in assessment.skills:
        _grade_skill(assessment_skill, now)
        if apply:
            assessment_skill.profile_action = _apply_to_profile(db, assessment, assessment_skill, now)
        else:
            assessment_skill.profile_action = ProfileAction.NOT_APPLIED

    assessment.status = final_status
    assessment.submitted_at = now
    assessment.applied_to_profile = apply
    assessment.scoring_version = SCORING_RULES_VERSION
    assessment.session_token_hash = None
    assessment.session_user_id = None
    db.flush()


def _grade_skill(assessment_skill: AssessmentSkill, now: datetime) -> None:
    score = score_skill(
        (question.proficiency_level, question.is_correct)
        for question in assessment_skill.questions
    )
    assessment_skill.beginner_correct = score.beginner_correct
    assessment_skill.intermediate_correct = score.intermediate_correct
    assessment_skill.advanced_correct = score.advanced_correct
    assessment_skill.total_correct = score.total_correct
    assessment_skill.assessed_level = score.level
    assessment_skill.graded_at = now


def _apply_to_profile(
    db: Session,
    assessment: Assessment,
    assessment_skill: AssessmentSkill,
    now: datetime,
) -> ProfileAction:
    # Compare with the profile as it is now; it may have changed since the start
    employee_skill = (
        db.query(EmployeeSkill)
        .filter(
            EmployeeSkill.employee_id == assessment.employee_id,
            EmployeeSkill.skill_id == assessment_skill.skill_id,
        )
        .first()
    )
    current_level = employee_skill.level if employee_skill else None
    assessed_level = assessment_skill.assessed_level
    action = profile_action_for(current_level, assessed_level)

    if action == ProfileAction.REMOVED:
        db.delete(employee_skill)
    elif action == ProfileAction.CREATED:
        db.add(EmployeeSkill(
            employee_id=assessment.employee_id,
            skill_id=assessment_skill.skill_id,
            level=assessed_level,
            verified=True,
            last_assessed_at=now,
            last_assessment_id=assessment.id,
        ))
    elif action != ProfileAction.NO_CHANGE:
        employee_skill.level = assessed_level
        employee_skill.verified = True
        employee_skill.last_assessed_at = now
        employee_skill.last_assessment_id = assessment.id

    return action
