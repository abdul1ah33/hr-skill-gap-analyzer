

class EmployeeNotFoundError(Exception):
    """Raised when the requested employee does not exist."""
    def __init__(self):
        super().__init__("Employee not found")


class SkillNotFoundError(Exception):
    """Raised when the requested skill does not exist."""
    def __init__(self):
        super().__init__("Skill not found")


class EmployeeSkillAlreadyExistsError(Exception):
    """Raised when an employee already has the given skill."""
    def __init__(self):
        super().__init__("Employee skill already exists")


class EmployeeSkillNotFoundError(Exception):
    def __init__(self):
        super().__init__("Employee does not have this skill.")


class PositionNotFoundError(Exception):
    """Raised when the requested position does not exist."""

    def __init__(self):
        super().__init__("Position not found.")


class PositionSkillNotFoundError(Exception):
    """Raised when a position does not require the given skill."""
    def __init__(self):
        super().__init__("Position does not require this skill.")


class PositionSkillAlreadyExistsError(Exception):
    """Raised when a position already requires the given skill."""
    def __init__(self):
        super().__init__("Position already requires this skill.")

# ─── Skill assessments ───────────────────────────────────────────────────────
#
# All assessment errors share one handler (exception_handlers.py). The JSON
# body is {"detail": message, "code": code, ...extra()}, so the frontend can
# react to the code (e.g. ASSESSMENT_OPEN_ELSEWHERE) instead of the text.

class AssessmentError(Exception):
    status_code = 400
    code = "ASSESSMENT_ERROR"
    message = "Assessment error."

    def __init__(self, message: str | None = None):
        super().__init__(message or self.message)

    def extra(self) -> dict:
        return {}


class PositionHasNoSkillsError(AssessmentError):
    """Raised when the position's required skills haven't been generated yet."""
    status_code = 422
    code = "POSITION_HAS_NO_SKILLS"
    message = "The employee's position has no required skills yet."


class NoAssessableSkillsError(AssessmentError):
    """Raised when none of the required skills can be tested."""
    status_code = 422
    code = "NO_ASSESSABLE_SKILLS"
    message = "None of the required skills can be assessed."

    def __init__(self, not_assessable: list | None = None):
        super().__init__()
        # SkippedSkill items from assessment_target_service
        self.not_assessable = not_assessable or []

    def extra(self) -> dict:
        return {
            "not_assessable": [
                {
                    "skill_id": item.skill.skill_id,
                    "skill_name": item.skill.skill_name,
                    "reason": item.reason,
                }
                for item in self.not_assessable
            ]
        }


class AssessmentNotFoundError(AssessmentError):
    """Also used when the assessment belongs to someone else, so ids can't be probed."""
    status_code = 404
    code = "ASSESSMENT_NOT_FOUND"
    message = "Assessment not found."


class AssessmentQuestionNotFoundError(AssessmentError):
    status_code = 404
    code = "ASSESSMENT_QUESTION_NOT_FOUND"
    message = "Question not found in this assessment."


class AssessmentNotInProgressError(AssessmentError):
    status_code = 409
    code = "ASSESSMENT_NOT_IN_PROGRESS"
    message = "The assessment is not in progress."


class AssessmentExpiredError(AssessmentError):
    status_code = 409
    code = "ASSESSMENT_EXPIRED"
    message = "The time for this assessment has run out."


class AssessmentNotFinalizedError(AssessmentError):
    status_code = 409
    code = "ASSESSMENT_NOT_FINALIZED"
    message = "The assessment has not been submitted yet."


class ActiveAssessmentExistsError(AssessmentError):
    status_code = 409
    code = "ACTIVE_ASSESSMENT_EXISTS"
    message = "The employee already has an assigned or running assessment."


class AssessmentNotAssignedError(AssessmentError):
    status_code = 409
    code = "ASSESSMENT_NOT_ASSIGNED"
    message = "Only an assigned assessment that hasn't started can be cancelled."


class AssessmentOpenElsewhereError(AssessmentError):
    """Another device or user holds the assessment session (plan §A.5)."""
    status_code = 409
    code = "ASSESSMENT_OPEN_ELSEWHERE"
    message = "This assessment is open on another device."

    def __init__(self, held_by: str | None = None, retry_after_seconds: int = 0):
        super().__init__()
        self.held_by = held_by
        self.retry_after_seconds = retry_after_seconds

    def extra(self) -> dict:
        return {"held_by": self.held_by, "retry_after_seconds": self.retry_after_seconds}
