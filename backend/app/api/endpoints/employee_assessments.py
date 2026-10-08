"""
HR: an employee's assessments. HR can assign one, cancel it before it
starts, and start (or resume) it on the employee's behalf.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.endpoints.assessments import session_header
from app.auth.dependencies import get_current_hr
from app.dependencies import get_db
from app.models.user import User
from app.schemas.assessment import (
    AssessmentSession,
    AssessmentSummary,
    AssignAssessmentRequest,
)
from app.services.assessment_service import AssessmentService

router = APIRouter(dependencies=[Depends(get_current_hr)])

service = AssessmentService()


@router.get("", response_model=list[AssessmentSummary], summary="Employee's assessments")
def list_employee_assessments(employee_id: int, db: Session = Depends(get_db)):
    return service.list_for_employee(db, employee_id)


@router.post(
    "",
    response_model=AssessmentSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Assign an assessment",
)
def assign_assessment(
    employee_id: int,
    body: AssignAssessmentRequest | None = None,
    db: Session = Depends(get_db),
    hr_user: User = Depends(get_current_hr),
):
    return service.assign(db, employee_id, hr_user, body.due_at if body else None)


@router.delete(
    "/{assessment_id}",
    response_model=AssessmentSummary,
    summary="Cancel an assigned assessment",
)
def cancel_assessment(employee_id: int, assessment_id: int, db: Session = Depends(get_db)):
    return service.cancel(db, employee_id, assessment_id)


@router.post(
    "/{assessment_id}/start",
    response_model=AssessmentSession,
    summary="Start or resume the assessment on the employee's behalf",
)
def start_on_behalf(
    employee_id: int,
    assessment_id: int,
    db: Session = Depends(get_db),
    hr_user: User = Depends(get_current_hr),
    session_token: str | None = Depends(session_header),
):
    return service.start_on_behalf(db, hr_user, employee_id, assessment_id, session_token)
