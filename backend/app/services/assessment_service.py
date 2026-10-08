"""
Assessment use cases behind the API (plan §10, §A.5): preview, start, the
single open session, answers, violations, submit, results, and HR
assignment.

Access: an assessment can be used by its employee or by any HR user (HR can
run it on the employee's behalf). Anyone else gets 404, so ids can't be
probed.

Single open session: opening a session returns a random token; only its
hash is stored. Every question read and every write must send it
(X-Assessment-Session). While the holder is active (heartbeat or answer
within ASSESSMENT_SESSION_TIMEOUT_SECONDS) nobody else can open the session;
after that, the next opener takes it over. expires_at never moves.

Every write locks the assessment row (SELECT ... FOR UPDATE) and commits.
Expired attempts are graded and applied lazily on the next access (D12).
"""
import hashlib
import hmac
import math
import secrets
from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import (
    ASSESSMENT_MAX_VIOLATIONS,
    ASSESSMENT_SECONDS_PER_QUESTION,
    ASSESSMENT_SESSION_TIMEOUT_SECONDS,
)
from app.core.exceptions import (
    ActiveAssessmentExistsError,
    AssessmentExpiredError,
    AssessmentNotAssignedError,
    AssessmentNotFinalizedError,
    AssessmentNotFoundError,
    AssessmentNotInProgressError,
    AssessmentOpenElsewhereError,
    AssessmentQuestionNotFoundError,
    EmployeeNotFoundError,
    NoAssessableSkillsError,
)
from app.crud.assessment import (
    get_active_assessment,
    get_assessment,
    get_employee_assessment,
    get_employee_assessments,
)
from app.crud.question_bank import count_active_questions
from app.models.assessment import Assessment
from app.models.assessment_enums import (
    AssessmentAdministration,
    AssessmentStatus,
    QuestionOptionType,
)
from app.models.assessment_question import AssessmentQuestion
from app.models.employee import Employee
from app.models.employee_skill import SkillLevel
from app.models.skill import Skill
from app.models.skill_question import SkillQuestion, SkillQuestionOption
from app.models.user import User
from app.schemas.assessment import (
    AnswerSaved,
    AssessmentConfigPublic,
    AssessmentDetail,
    AssessmentOptionPublic,
    AssessmentPreview,
    AssessmentQuestionPublic,
    AssessmentResult,
    AssessmentSession,
    AssessmentSkillPublic,
    AssessmentSummary,
    HeartbeatResponse,
    NotAssessableSkill,
    PreviewSkill,
    SkillCoverage,
    SkillResultPublic,
    ViolationRecorded,
)
from app.services.assessment_generation_service import (
    ACTIVE_INDEX_NAME,
    AssessmentGenerationService,
    is_expired,
    utc_now,
)
from app.services.assessment_grading_service import FINAL_STATUSES, finalize_assessment
from app.services.assessment_scoring_service import QUESTIONS_PER_LEVEL, QUESTIONS_PER_SKILL
from app.services.assessment_target_service import AssessmentTargetService


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _is_hr(user: User) -> bool:
    return user.role is not None and user.role.name == "HR"


def _value(enum_member) -> str | None:
    return enum_member.value if enum_member is not None else None


class AssessmentService:
    def __init__(
        self,
        generation_service: AssessmentGenerationService | None = None,
        target_service: AssessmentTargetService | None = None,
    ):
        self.target_service = target_service or AssessmentTargetService()
        self.generation_service = generation_service or AssessmentGenerationService(
            target_service=self.target_service
        )

    # ==========================================
    # Access and common checks
    # ==========================================
    def _load(
        self,
        db: Session,
        assessment_id: int,
        user: User,
        for_update: bool = False,
    ) -> Assessment:
        """The assessment if the user owns it or is HR; 404 otherwise."""
        if _is_hr(user):
            assessment = get_assessment(db, assessment_id, for_update=for_update)
        elif user.employee_id is not None:
            assessment = get_employee_assessment(
                db, assessment_id, user.employee_id, for_update=for_update
            )
        else:
            assessment = None

        if assessment is None:
            raise AssessmentNotFoundError()
        return assessment

    def _expire_if_due(self, db: Session, assessment: Assessment, now: datetime) -> bool:
        """Grade and apply an in-progress assessment past its deadline. Commits."""
        if not is_expired(assessment, now):
            return False
        finalize_assessment(db, assessment, AssessmentStatus.EXPIRED, now)
        db.commit()
        return True

    def _check_running(self, db: Session, assessment: Assessment, now: datetime) -> None:
        if assessment.status != AssessmentStatus.IN_PROGRESS:
            raise AssessmentNotInProgressError()
        if self._expire_if_due(db, assessment, now):
            raise AssessmentExpiredError()

    def _session_is_fresh(self, assessment: Assessment, now: datetime) -> bool:
        return (
            assessment.session_token_hash is not None
            and assessment.session_last_seen_at is not None
            and (now - assessment.session_last_seen_at).total_seconds()
            < ASSESSMENT_SESSION_TIMEOUT_SECONDS
        )

    def _open_elsewhere(self, db: Session, assessment: Assessment, now: datetime) -> AssessmentOpenElsewhereError:
        held_by = None
        if assessment.session_user_id is not None:
            holder = db.get(User, assessment.session_user_id)
            if holder is not None:
                held_by = "employee" if holder.employee_id == assessment.employee_id else "hr"

        retry_after = 0
        if self._session_is_fresh(assessment, now):
            idle = (now - assessment.session_last_seen_at).total_seconds()
            retry_after = math.ceil(ASSESSMENT_SESSION_TIMEOUT_SECONDS - idle)

        return AssessmentOpenElsewhereError(held_by, retry_after)

    def _token_matches(self, assessment: Assessment, token: str | None) -> bool:
        return (
            token is not None
            and assessment.session_token_hash is not None
            and hmac.compare_digest(assessment.session_token_hash, _hash_token(token))
        )

    def _require_session(
        self,
        db: Session,
        assessment: Assessment,
        token: str | None,
        now: datetime,
    ) -> None:
        if not self._token_matches(assessment, token):
            raise self._open_elsewhere(db, assessment, now)
        assessment.session_last_seen_at = now

    # ==========================================
    # Response builders (field by field: nothing secret can leak)
    # ==========================================
    def _remaining_seconds(self, assessment: Assessment, now: datetime) -> int | None:
        if assessment.status != AssessmentStatus.IN_PROGRESS or assessment.expires_at is None:
            return None
        return max(0, int((assessment.expires_at - now).total_seconds()))

    def _question_public(self, question: AssessmentQuestion) -> AssessmentQuestionPublic:
        texts = {option.id: option.text for option in question.skill_question.options}
        selected = (
            question.option_order.index(question.selected_option_id) + 1
            if question.selected_option_id is not None
            else None
        )
        return AssessmentQuestionPublic(
            question_id=question.id,
            question_text=question.skill_question.question_text,
            proficiency_level=question.proficiency_level.value,
            options=[
                AssessmentOptionPublic(id=position, text=texts[option_id])
                for position, option_id in enumerate(question.option_order, start=1)
            ],
            selected_option_id=selected,
        )

    def _detail(
        self,
        assessment: Assessment,
        now: datetime,
        include_questions: bool,
    ) -> AssessmentDetail:
        skills = []
        if include_questions:
            skills = [
                AssessmentSkillPublic(
                    skill_id=assessment_skill.skill_id,
                    skill_name=assessment_skill.skill.name,
                    questions=[self._question_public(q) for q in assessment_skill.questions],
                )
                for assessment_skill in assessment.skills
            ]

        return AssessmentDetail(
            id=assessment.id,
            employee_id=assessment.employee_id,
            status=assessment.status.value,
            administered_by=_value(assessment.administered_by),
            position_title=assessment.position_title,
            assigned_at=assessment.assigned_at,
            due_at=assessment.due_at,
            started_at=assessment.started_at,
            expires_at=assessment.expires_at,
            remaining_seconds=self._remaining_seconds(assessment, now),
            violation_count=assessment.violation_count,
            config=AssessmentConfigPublic(
                seconds_per_question=assessment.seconds_per_question,
                max_violations=assessment.max_violations,
                total_questions=len(assessment.questions),
            ),
            skills=skills,
        )

    def _result(self, assessment: Assessment) -> AssessmentResult:
        return AssessmentResult(
            id=assessment.id,
            employee_id=assessment.employee_id,
            status=assessment.status.value,
            administered_by=_value(assessment.administered_by),
            position_title=assessment.position_title,
            started_at=assessment.started_at,
            submitted_at=assessment.submitted_at,
            applied_to_profile=assessment.applied_to_profile,
            scoring_version=assessment.scoring_version,
            skills=[
                SkillResultPublic(
                    skill_id=s.skill_id,
                    skill_name=s.skill.name,
                    category=s.category.value,
                    claimed_level=_value(s.claimed_level),
                    required_level=_value(s.required_level),
                    assessed_level=_value(s.assessed_level),
                    correct=s.total_correct or 0,
                    total=len(s.questions),
                    profile_action=_value(s.profile_action),
                )
                for s in assessment.skills
            ],
        )

    @staticmethod
    def _summary(assessment: Assessment) -> AssessmentSummary:
        return AssessmentSummary(
            id=assessment.id,
            status=assessment.status.value,
            administered_by=_value(assessment.administered_by),
            position_title=assessment.position_title,
            assigned_at=assessment.assigned_at,
            due_at=assessment.due_at,
            started_at=assessment.started_at,
            submitted_at=assessment.submitted_at,
            skill_count=len(assessment.skills),
        )

    # ==========================================
    # Preview and start
    # ==========================================
    def preview(self, db: Session, employee_id: int) -> AssessmentPreview:
        """Which skills a new assessment would test, and which can't be tested."""
        try:
            selection = self.target_service.select_targets(db, employee_id)
            targets, skipped = selection.targets, selection.skipped
        except NoAssessableSkillsError as err:
            targets, skipped = [], err.not_assessable

        total_questions = len(targets) * QUESTIONS_PER_SKILL
        employee = db.get(Employee, employee_id)

        return AssessmentPreview(
            position_title=employee.position.title,
            assessable=[
                PreviewSkill(
                    skill_id=t.skill_id,
                    skill_name=t.skill_name,
                    category=t.category.value,
                    is_essential=t.is_essential,
                    claimed_level=_value(t.claimed_level),
                    required_level=t.required_level.value,
                )
                for t in targets
            ],
            not_assessable=[
                NotAssessableSkill(
                    skill_id=s.skill.skill_id,
                    skill_name=s.skill.skill_name,
                    reason=s.reason,
                )
                for s in skipped
            ],
            total_questions=total_questions,
            estimated_minutes=math.ceil(total_questions * ASSESSMENT_SECONDS_PER_QUESTION / 60),
            seconds_per_question=ASSESSMENT_SECONDS_PER_QUESTION,
            max_violations=ASSESSMENT_MAX_VIOLATIONS,
        )

    def start_self(
        self,
        db: Session,
        user: User,
        session_token: str | None = None,
        now: datetime | None = None,
    ) -> AssessmentSession:
        """Start (or resume) the current user's own assessment and open its session."""
        now = now or utc_now()
        assessment = self.generation_service.start(
            db,
            user.employee_id,
            started_by_user_id=user.id,
            administered_by=AssessmentAdministration.SELF,
            now=now,
        )
        return self._open_session(db, assessment, user, session_token, now)

    def start_on_behalf(
        self,
        db: Session,
        hr_user: User,
        employee_id: int,
        assessment_id: int,
        session_token: str | None = None,
        now: datetime | None = None,
    ) -> AssessmentSession:
        """HR starts (or resumes) an employee's assigned assessment for them."""
        now = now or utc_now()
        active = get_active_assessment(db, employee_id)
        if active is None or active.id != assessment_id:
            raise AssessmentNotFoundError()

        assessment = self.generation_service.start(
            db,
            employee_id,
            started_by_user_id=hr_user.id,
            administered_by=AssessmentAdministration.HR_ON_BEHALF,
            now=now,
        )
        return self._open_session(db, assessment, hr_user, session_token, now)

    # ==========================================
    # Session
    # ==========================================
    def open_session(
        self,
        db: Session,
        assessment_id: int,
        user: User,
        session_token: str | None = None,
        now: datetime | None = None,
    ) -> AssessmentSession:
        now = now or utc_now()
        assessment = self._load(db, assessment_id, user, for_update=True)
        return self._open_session(db, assessment, user, session_token, now)

    def _open_session(
        self,
        db: Session,
        assessment: Assessment,
        user: User,
        session_token: str | None,
        now: datetime,
    ) -> AssessmentSession:
        # Lock (start() committed, which released any earlier lock)
        assessment = get_assessment(db, assessment.id, for_update=True)
        self._check_running(db, assessment, now)

        if self._token_matches(assessment, session_token):
            # Same client again (e.g. page refresh): keep its token
            token = session_token
        elif self._session_is_fresh(assessment, now):
            raise self._open_elsewhere(db, assessment, now)
        else:
            token = secrets.token_urlsafe(32)
            assessment.session_token_hash = _hash_token(token)
            assessment.session_user_id = user.id

        assessment.session_last_seen_at = now
        db.commit()

        return AssessmentSession(
            session_token=token,
            assessment=self._detail(assessment, now, include_questions=True),
        )

    def heartbeat(
        self,
        db: Session,
        assessment_id: int,
        user: User,
        session_token: str | None,
        now: datetime | None = None,
    ) -> HeartbeatResponse:
        now = now or utc_now()
        assessment = self._load(db, assessment_id, user, for_update=True)
        self._check_running(db, assessment, now)
        self._require_session(db, assessment, session_token, now)
        db.commit()
        return HeartbeatResponse(remaining_seconds=self._remaining_seconds(assessment, now))

    # ==========================================
    # Reading
    # ==========================================
    def get_detail(
        self,
        db: Session,
        assessment_id: int,
        user: User,
        session_token: str | None,
        now: datetime | None = None,
    ) -> AssessmentDetail:
        """Questions are only returned to the session holder while in progress."""
        now = now or utc_now()
        assessment = self._load(db, assessment_id, user, for_update=True)

        if assessment.status == AssessmentStatus.IN_PROGRESS and not self._expire_if_due(db, assessment, now):
            self._require_session(db, assessment, session_token, now)
            db.commit()
            return self._detail(assessment, now, include_questions=True)

        db.commit()
        return self._detail(assessment, now, include_questions=False)

    def get_result(
        self,
        db: Session,
        assessment_id: int,
        user: User,
        now: datetime | None = None,
    ) -> AssessmentResult:
        now = now or utc_now()
        assessment = self._load(db, assessment_id, user, for_update=True)
        self._expire_if_due(db, assessment, now)
        db.commit()

        if assessment.status not in FINAL_STATUSES:
            raise AssessmentNotFinalizedError()
        return self._result(assessment)

    def list_for_employee(self, db: Session, employee_id: int) -> list[AssessmentSummary]:
        return [self._summary(a) for a in get_employee_assessments(db, employee_id)]

    # ==========================================
    # Writing
    # ==========================================
    def save_answer(
        self,
        db: Session,
        assessment_id: int,
        question_id: int,
        option_position: int,
        user: User,
        session_token: str | None,
        now: datetime | None = None,
    ) -> AnswerSaved:
        now = now or utc_now()
        assessment = self._load(db, assessment_id, user, for_update=True)
        self._check_running(db, assessment, now)
        self._require_session(db, assessment, session_token, now)

        # Loaded through the assessment, so another assessment's question can't be named
        question = (
            db.query(AssessmentQuestion)
            .filter(
                AssessmentQuestion.id == question_id,
                AssessmentQuestion.assessment_id == assessment.id,
            )
            .first()
        )
        if question is None:
            raise AssessmentQuestionNotFoundError()

        option_id = question.option_order[option_position - 1]
        option = db.get(SkillQuestionOption, option_id)

        question.selected_option_id = option.id
        question.selected_option_type = option.option_type
        question.is_correct = option.option_type == QuestionOptionType.CORRECT
        question.answered_at = now
        db.commit()

        return AnswerSaved(question_id=question.id, selected_option_id=option_position)

    def record_violation(
        self,
        db: Session,
        assessment_id: int,
        user: User,
        session_token: str | None,
        now: datetime | None = None,
    ) -> ViolationRecorded:
        """Count a proctoring violation; too many terminate the attempt (graded, not applied)."""
        now = now or utc_now()
        assessment = self._load(db, assessment_id, user, for_update=True)
        self._check_running(db, assessment, now)
        self._require_session(db, assessment, session_token, now)

        assessment.violation_count += 1
        terminated = (
            assessment.max_violations is not None
            and assessment.violation_count >= assessment.max_violations
        )
        if terminated:
            finalize_assessment(db, assessment, AssessmentStatus.TERMINATED, now)
        db.commit()

        return ViolationRecorded(
            violation_count=assessment.violation_count,
            max_violations=assessment.max_violations,
            terminated=terminated,
        )

    def submit(
        self,
        db: Session,
        assessment_id: int,
        user: User,
        session_token: str | None,
        now: datetime | None = None,
    ) -> AssessmentResult:
        """Grade and apply. Submitting after the deadline finalizes it as EXPIRED."""
        now = now or utc_now()
        assessment = self._load(db, assessment_id, user, for_update=True)
        if assessment.status != AssessmentStatus.IN_PROGRESS:
            raise AssessmentNotInProgressError()

        if not self._expire_if_due(db, assessment, now):
            self._require_session(db, assessment, session_token, now)
            finalize_assessment(db, assessment, AssessmentStatus.SUBMITTED, now)
            db.commit()

        return self._result(assessment)

    # ==========================================
    # HR assignment
    # ==========================================
    def assign(
        self,
        db: Session,
        employee_id: int,
        hr_user: User,
        due_at: datetime | None = None,
        now: datetime | None = None,
    ) -> AssessmentSummary:
        """Create an ASSIGNED assessment; questions are picked when it starts."""
        now = now or utc_now()
        if db.get(Employee, employee_id) is None:
            raise EmployeeNotFoundError()

        active = get_active_assessment(db, employee_id)
        if active is not None:
            if not self._expire_if_due(db, active, now):
                raise ActiveAssessmentExistsError()

        assessment = Assessment(
            employee_id=employee_id,
            status=AssessmentStatus.ASSIGNED,
            assigned_by_user_id=hr_user.id,
            assigned_at=now,
            due_at=due_at,
        )
        try:
            with db.begin_nested():
                db.add(assessment)
                db.flush()
        except IntegrityError as err:
            if ACTIVE_INDEX_NAME not in str(err.orig):
                raise
            raise ActiveAssessmentExistsError() from err

        db.commit()
        return self._summary(assessment)

    def cancel(self, db: Session, employee_id: int, assessment_id: int) -> AssessmentSummary:
        assessment = get_employee_assessment(db, assessment_id, employee_id, for_update=True)
        if assessment is None:
            raise AssessmentNotFoundError()
        if assessment.status != AssessmentStatus.ASSIGNED:
            raise AssessmentNotAssignedError()

        assessment.status = AssessmentStatus.CANCELLED
        db.commit()
        return self._summary(assessment)

    # ==========================================
    # Question bank coverage (HR)
    # ==========================================
    def coverage(self, db: Session) -> list[SkillCoverage]:
        """Every skill that has bank questions, with active counts per level."""
        skills = (
            db.query(Skill)
            .filter(Skill.id.in_(db.query(SkillQuestion.skill_id).distinct()))
            .order_by(Skill.name)
            .all()
        )
        counts = count_active_questions(db, [s.id for s in skills])

        result = []
        for skill in skills:
            per_level = counts.get(skill.id, {})
            result.append(SkillCoverage(
                skill_id=skill.id,
                skill_name=skill.name,
                beginner=per_level.get(SkillLevel.BEGINNER, 0),
                intermediate=per_level.get(SkillLevel.INTERMEDIATE, 0),
                advanced=per_level.get(SkillLevel.ADVANCED, 0),
                assessable=all(
                    per_level.get(level, 0) >= quota
                    for level, quota in QUESTIONS_PER_LEVEL.items()
                ),
            ))
        return result
