import enum


class QuestionOptionType(str, enum.Enum):
    """Kind of answer option in the question bank. Only CORRECT scores."""
    CORRECT = "correct"
    NEAR_MISS = "near_miss"
    MISCONCEPTION = "misconception"
    PLAUSIBLE_WRONG_1 = "plausible_wrong_1"
    PLAUSIBLE_WRONG_2 = "plausible_wrong_2"
    PLAUSIBLE_WRONG_3 = "plausible_wrong_3"


class AssessmentStatus(str, enum.Enum):
    ASSIGNED = "assigned"          # created by HR, not started yet
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    EXPIRED = "expired"            # time ran out; graded and applied
    TERMINATED = "terminated"      # too many violations; graded, not applied
    CANCELLED = "cancelled"        # assignment cancelled by HR before start


# Statuses covered by the "one active assessment per employee" index
ACTIVE_ASSESSMENT_STATUSES = (AssessmentStatus.ASSIGNED, AssessmentStatus.IN_PROGRESS)


class AssessmentAdministration(str, enum.Enum):
    SELF = "self"
    HR_ON_BEHALF = "hr_on_behalf"


class SkillGapCategory(str, enum.Enum):
    MATCHED = "matched"
    NEEDS_IMPROVEMENT = "needs_improvement"
    UNMATCHED = "unmatched"


class ProfileAction(str, enum.Enum):
    CONFIRMED = "confirmed"      # assessed level equals the claimed level
    UPGRADED = "upgraded"
    DOWNGRADED = "downgraded"
    CREATED = "created"          # unmatched skill passed; new employee skill
    REMOVED = "removed"          # assessed None; employee skill deleted
    NO_CHANGE = "no_change"      # unmatched skill assessed None
    NOT_APPLIED = "not_applied"  # graded but not applied (e.g. terminated)
