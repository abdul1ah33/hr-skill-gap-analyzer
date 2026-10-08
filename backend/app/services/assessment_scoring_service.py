"""
Pure scoring rules for skill assessments (plan §A.7, §A.8). No database access.

Each tested skill gets 5 questions: 1 Beginner, 2 Intermediate, 2 Advanced.
The assessed level comes from an explicit lookup table keyed by the number of
correct answers per level, so the table itself is the specification:

- 0-1 correct          -> None
- 4-5 correct          -> Advanced
- 3 correct with the Beginner and both Intermediate questions right -> Intermediate
- any other 2-3        -> Beginner

Unanswered and timed-out questions count as wrong.
"""
from collections.abc import Iterable
from dataclasses import dataclass

from app.models.assessment_enums import ProfileAction
from app.models.employee_skill import SkillLevel

# Stored on assessments.scoring_version; change it whenever the table changes
SCORING_RULES_VERSION = "2026-10-08.v1"

QUESTIONS_PER_LEVEL: dict[SkillLevel, int] = {
    SkillLevel.BEGINNER: 1,
    SkillLevel.INTERMEDIATE: 2,
    SkillLevel.ADVANCED: 2,
}

QUESTIONS_PER_SKILL = sum(QUESTIONS_PER_LEVEL.values())

_B = SkillLevel.BEGINNER
_I = SkillLevel.INTERMEDIATE
_A = SkillLevel.ADVANCED

# (beginner_correct, intermediate_correct, advanced_correct) -> assessed level
SCORING_TABLE: dict[tuple[int, int, int], SkillLevel | None] = {
    (0, 0, 0): None,
    (0, 0, 1): None,
    (0, 1, 0): None,
    (0, 0, 2): _B,
    (0, 1, 1): _B,
    (0, 2, 0): _B,
    (0, 1, 2): _B,
    (0, 2, 1): _B,
    (0, 2, 2): _A,
    (1, 0, 0): None,
    (1, 0, 1): _B,
    (1, 0, 2): _B,
    (1, 1, 0): _B,
    (1, 1, 1): _B,
    (1, 1, 2): _A,
    (1, 2, 0): _I,
    (1, 2, 1): _A,
    (1, 2, 2): _A,
}

_LEVEL_RANK = {_B: 1, _I: 2, _A: 3}


class ScoringError(ValueError):
    """The answers don't match the 1 Beginner / 2 Intermediate / 2 Advanced layout."""


@dataclass(frozen=True)
class SkillScore:
    beginner_correct: int
    intermediate_correct: int
    advanced_correct: int
    level: SkillLevel | None

    @property
    def total_correct(self) -> int:
        return self.beginner_correct + self.intermediate_correct + self.advanced_correct


def level_for_counts(
    beginner_correct: int,
    intermediate_correct: int,
    advanced_correct: int,
) -> SkillLevel | None:
    """Assessed level for the given number of correct answers per level."""
    key = (beginner_correct, intermediate_correct, advanced_correct)
    if key not in SCORING_TABLE:
        raise ScoringError(f"impossible correct-answer counts {key}")
    return SCORING_TABLE[key]


def score_skill(answers: Iterable[tuple[SkillLevel, bool | None]]) -> SkillScore:
    """
    Score one skill from (question level, is_correct) pairs. is_correct is
    None for unanswered questions, which count as wrong.
    """
    asked = {level: 0 for level in QUESTIONS_PER_LEVEL}
    correct = {level: 0 for level in QUESTIONS_PER_LEVEL}

    for level, is_correct in answers:
        if level not in asked:
            raise ScoringError(f"unknown question level {level!r}")
        asked[level] += 1
        if is_correct:
            correct[level] += 1

    if asked != QUESTIONS_PER_LEVEL:
        raise ScoringError(
            "expected 1 Beginner, 2 Intermediate and 2 Advanced questions, got "
            + ", ".join(f"{count} {level.value}" for level, count in asked.items())
        )

    return SkillScore(
        beginner_correct=correct[_B],
        intermediate_correct=correct[_I],
        advanced_correct=correct[_A],
        level=level_for_counts(correct[_B], correct[_I], correct[_A]),
    )


def profile_action_for(
    claimed_level: SkillLevel | None,
    assessed_level: SkillLevel | None,
) -> ProfileAction:
    """
    What applying the result does to the employee's profile (§A.8).
    claimed_level is None when the employee didn't have the skill (unmatched).
    Terminated attempts are not applied; the caller uses NOT_APPLIED for those.
    """
    if claimed_level is None:
        return ProfileAction.NO_CHANGE if assessed_level is None else ProfileAction.CREATED
    if assessed_level is None:
        return ProfileAction.REMOVED
    if _LEVEL_RANK[assessed_level] > _LEVEL_RANK[claimed_level]:
        return ProfileAction.UPGRADED
    if _LEVEL_RANK[assessed_level] < _LEVEL_RANK[claimed_level]:
        return ProfileAction.DOWNGRADED
    return ProfileAction.CONFIRMED
