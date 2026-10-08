"""
Skill assessments (plan §10.3, §A.5).

Self-service routes (preview, start, my history) need a user linked to an
employee. The /{assessment_id} routes accept the owning employee or any HR
user (HR can run an assessment on the employee's behalf); everyone else
gets 404. Reading questions and every write need the session token from
POST /assessments or POST /{assessment_id}/session, sent in the
X-Assessment-Session header.
"""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_current_user_with_employee
from app.dependencies import get_db
from app.models.user import User
from app.schemas.assessment import (
    AnswerRequest,
    AnswerSaved,
    AssessmentDetail,
    AssessmentPreview,
    AssessmentResult,
    AssessmentSession,
    AssessmentSummary,
    HeartbeatResponse,
    ViolationRecorded,
    ViolationRequest,
)
from app.services.assessment_service import AssessmentService

router = APIRouter(dependencies=[Depends(get_current_user)])

service = AssessmentService()


def session_header(
    x_assessment_session: str | None = Header(default=None, alias="X-Assessment-Session"),
) -> str | None:
    return x_assessment_session


# ─── Self-service ────────────────────────────────────────────────────────────

@router.get("/preview", response_model=AssessmentPreview, summary="Skills a new assessment would test")
def preview_assessment(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_with_employee),
):
    return service.preview(db, user.employee_id)


@router.post("", response_model=AssessmentSession, summary="Start or resume my assessment")
def start_assessment(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_with_employee),
    session_token: str | None = Depends(session_header),
):
    return service.start_self(db, user, session_token)


@router.get("", response_model=list[AssessmentSummary], summary="My assessments")
def list_my_assessments(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_with_employee),
):
    return service.list_for_employee(db, user.employee_id)


# ─── One assessment (owner or HR) ────────────────────────────────────────────

@router.get("/{assessment_id}", response_model=AssessmentDetail, summary="Assessment and its questions")
def get_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    session_token: str | None = Depends(session_header),
):
    return service.get_detail(db, assessment_id, user, session_token)


@router.post(
    "/{assessment_id}/session",
    response_model=AssessmentSession,
    summary="Open (or take over) the assessment session",
)
def open_session(
    assessment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    session_token: str | None = Depends(session_header),
):
    return service.open_session(db, assessment_id, user, session_token)


@router.post("/{assessment_id}/heartbeat", response_model=HeartbeatResponse, summary="Keep the session open")
def heartbeat(
    assessment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    session_token: str | None = Depends(session_header),
):
    return service.heartbeat(db, assessment_id, user, session_token)


@router.put(
    "/{assessment_id}/questions/{question_id}/answer",
    response_model=AnswerSaved,
    summary="Save or replace one answer",
)
def save_answer(
    assessment_id: int,
    question_id: int,
    body: AnswerRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    session_token: str | None = Depends(session_header),
):
    return service.save_answer(db, assessment_id, question_id, body.option_id, user, session_token)


@router.post(
    "/{assessment_id}/violations",
    response_model=ViolationRecorded,
    summary="Report a proctoring violation",
)
def record_violation(
    assessment_id: int,
    body: ViolationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    session_token: str | None = Depends(session_header),
):
    return service.record_violation(db, assessment_id, user, session_token)


@router.post("/{assessment_id}/submit", response_model=AssessmentResult, summary="Grade and apply")
def submit_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    session_token: str | None = Depends(session_header),
):
    return service.submit(db, assessment_id, user, session_token)


@router.get(
    "/{assessment_id}/result",
    response_model=AssessmentResult,
    summary="Result of a finished assessment",
)
def get_result(
    assessment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.get_result(db, assessment_id, user)
