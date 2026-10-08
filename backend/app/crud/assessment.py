from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.assessment_enums import ACTIVE_ASSESSMENT_STATUSES
from app.models.assessment_question import AssessmentQuestion


def get_assessment(
    db: Session,
    assessment_id: int,
    for_update: bool = False,
) -> Assessment | None:
    """Load an assessment; for_update locks the row until the transaction ends."""
    query = db.query(Assessment).filter(Assessment.id == assessment_id)
    if for_update:
        query = query.with_for_update()
    return query.first()


def get_employee_assessment(
    db: Session,
    assessment_id: int,
    employee_id: int,
    for_update: bool = False,
) -> Assessment | None:
    """Load an assessment only if it belongs to the employee (owner-scoped)."""
    query = db.query(Assessment).filter(
        Assessment.id == assessment_id,
        Assessment.employee_id == employee_id,
    )
    if for_update:
        query = query.with_for_update()
    return query.first()


def get_active_assessment(
    db: Session,
    employee_id: int,
    for_update: bool = False,
) -> Assessment | None:
    """The employee's assigned or in-progress assessment (at most one exists)."""
    query = db.query(Assessment).filter(
        Assessment.employee_id == employee_id,
        Assessment.status.in_(ACTIVE_ASSESSMENT_STATUSES),
    )
    if for_update:
        query = query.with_for_update()
    return query.first()


def get_employee_assessments(db: Session, employee_id: int) -> list[Assessment]:
    """All assessments of an employee, newest first."""
    return (
        db.query(Assessment)
        .filter(Assessment.employee_id == employee_id)
        .order_by(Assessment.created_at.desc(), Assessment.id.desc())
        .all()
    )


def served_question_ids(db: Session, employee_id: int) -> set[int]:
    """Bank question ids the employee was given in any earlier assessment."""
    rows = (
        db.query(AssessmentQuestion.skill_question_id)
        .join(Assessment, Assessment.id == AssessmentQuestion.assessment_id)
        .filter(Assessment.employee_id == employee_id)
        .distinct()
        .all()
    )
    return {question_id for (question_id,) in rows}
