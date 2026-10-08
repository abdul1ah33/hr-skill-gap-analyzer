"""
Request and response schemas for skill assessments (plan §10.4–10.5).

Responses are built field by field in assessment_service, never from ORM
objects, so option types, explanations, correctness and bank ids can't leak.
Option ids the client sees are 1-based positions in the shuffled order.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Level = Literal["Beginner", "Intermediate", "Advanced"]

AssessmentStatusValue = Literal[
    "assigned",
    "in_progress",
    "submitted",
    "expired",
    "terminated",
    "cancelled",
]


# ==========================================
# Requests
# ==========================================
class AnswerRequest(BaseModel):
    option_id: int = Field(ge=1, le=6, description="Position of the option in the shown order")


class ViolationRequest(BaseModel):
    reason: Literal["tab_hidden", "window_blur", "fullscreen_exit", "copy_attempt"]


class AssignAssessmentRequest(BaseModel):
    due_at: datetime | None = None


# ==========================================
# Taking an assessment
# ==========================================
class AssessmentOptionPublic(BaseModel):
    id: int
    text: str


class AssessmentQuestionPublic(BaseModel):
    question_id: int
    question_text: str
    proficiency_level: Level
    options: list[AssessmentOptionPublic]
    selected_option_id: int | None


class AssessmentSkillPublic(BaseModel):
    skill_id: int
    skill_name: str
    questions: list[AssessmentQuestionPublic]


class AssessmentConfigPublic(BaseModel):
    seconds_per_question: int | None
    max_violations: int | None
    total_questions: int


class AssessmentDetail(BaseModel):
    id: int
    employee_id: int
    status: AssessmentStatusValue
    administered_by: Literal["self", "hr_on_behalf"] | None
    position_title: str | None
    assigned_at: datetime | None
    due_at: datetime | None
    started_at: datetime | None
    expires_at: datetime | None
    remaining_seconds: int | None
    violation_count: int
    config: AssessmentConfigPublic
    # Only filled while in progress, for the session holder
    skills: list[AssessmentSkillPublic]


class AssessmentSession(BaseModel):
    """Returned when a session is opened; send the token as X-Assessment-Session."""
    session_token: str
    assessment: AssessmentDetail


class HeartbeatResponse(BaseModel):
    remaining_seconds: int


class AnswerSaved(BaseModel):
    saved: bool = True
    question_id: int
    selected_option_id: int


class ViolationRecorded(BaseModel):
    violation_count: int
    max_violations: int | None
    terminated: bool


# ==========================================
# Preview
# ==========================================
class PreviewSkill(BaseModel):
    skill_id: int
    skill_name: str
    category: Literal["matched", "needs_improvement", "unmatched"]
    is_essential: bool
    claimed_level: Level | None
    required_level: Level


class NotAssessableSkill(BaseModel):
    skill_id: int
    skill_name: str
    reason: Literal["no_question_bank", "insufficient_questions", "over_limit"]


class AssessmentPreview(BaseModel):
    position_title: str
    assessable: list[PreviewSkill]
    not_assessable: list[NotAssessableSkill]
    total_questions: int
    estimated_minutes: int
    seconds_per_question: int
    max_violations: int


# ==========================================
# Results and history
# ==========================================
class SkillResultPublic(BaseModel):
    skill_id: int
    skill_name: str
    category: Literal["matched", "needs_improvement", "unmatched"]
    claimed_level: Level | None
    required_level: Level | None
    assessed_level: Level | None      # None = no proficiency
    correct: int
    total: int
    profile_action: str | None


class AssessmentResult(BaseModel):
    id: int
    employee_id: int
    status: AssessmentStatusValue
    administered_by: Literal["self", "hr_on_behalf"] | None
    position_title: str | None
    started_at: datetime | None
    submitted_at: datetime | None
    applied_to_profile: bool
    scoring_version: str | None
    skills: list[SkillResultPublic]


class AssessmentSummary(BaseModel):
    id: int
    status: AssessmentStatusValue
    administered_by: Literal["self", "hr_on_behalf"] | None
    position_title: str | None
    assigned_at: datetime | None
    due_at: datetime | None
    started_at: datetime | None
    submitted_at: datetime | None
    skill_count: int


# ==========================================
# Question bank coverage (HR)
# ==========================================
class SkillCoverage(BaseModel):
    skill_id: int
    skill_name: str
    beginner: int
    intermediate: int
    advanced: int
    assessable: bool
