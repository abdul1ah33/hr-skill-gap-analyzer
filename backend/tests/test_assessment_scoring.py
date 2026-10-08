"""Scoring rules (plan §A.7) and profile actions (§A.8)."""
import itertools

import pytest

from app.models.assessment_enums import ProfileAction
from app.models.employee_skill import SkillLevel
from app.services.assessment_scoring_service import (
    SCORING_RULES_VERSION,
    SCORING_TABLE,
    ScoringError,
    level_for_counts,
    profile_action_for,
    score_skill,
)

pytestmark = pytest.mark.unit

B, I, A = SkillLevel.BEGINNER, SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED

# Copied from the approved table in plan §A.7
EXPECTED = [
    (0, 0, 0, None),
    (0, 0, 1, None),
    (0, 1, 0, None),
    (0, 0, 2, B),
    (0, 1, 1, B),
    (0, 2, 0, B),
    (0, 1, 2, B),
    (0, 2, 1, B),
    (0, 2, 2, A),
    (1, 0, 0, None),
    (1, 0, 1, B),
    (1, 0, 2, B),
    (1, 1, 0, B),
    (1, 1, 1, B),
    (1, 1, 2, A),
    (1, 2, 0, I),
    (1, 2, 1, A),
    (1, 2, 2, A),
]


def test_version():
    assert SCORING_RULES_VERSION == "2026-10-08.v1"


def test_table_covers_every_possible_outcome():
    possible = set(itertools.product(range(2), range(3), range(3)))
    assert set(SCORING_TABLE) == possible
    assert len(SCORING_TABLE) == 18


@pytest.mark.parametrize(("b", "i", "a", "level"), EXPECTED, ids=lambda v: str(v))
def test_all_18_outcomes(b, i, a, level):
    assert level_for_counts(b, i, a) == level


@pytest.mark.parametrize(("b", "i", "a"), sorted(SCORING_TABLE))
def test_table_matches_the_short_rule(b, i, a):
    total = b + i + a
    if total <= 1:
        expected = None
    elif total >= 4:
        expected = A
    elif total == 3 and b == 1 and i == 2:
        expected = I
    else:
        expected = B
    assert SCORING_TABLE[(b, i, a)] == expected


@pytest.mark.parametrize("counts", [(2, 0, 0), (0, 3, 0), (0, 0, 3), (-1, 0, 0)])
def test_impossible_counts_are_rejected(counts):
    with pytest.raises(ScoringError):
        level_for_counts(*counts)


# ==========================================
# score_skill
# ==========================================
def test_score_skill_counts_answers():
    score = score_skill([(B, True), (I, True), (I, True), (A, False), (A, False)])

    assert (score.beginner_correct, score.intermediate_correct, score.advanced_correct) == (1, 2, 0)
    assert score.total_correct == 3
    assert score.level == I


def test_unanswered_questions_count_as_wrong():
    score = score_skill([(B, None), (I, None), (I, None), (A, None), (A, None)])

    assert score.total_correct == 0
    assert score.level is None


def test_answer_order_does_not_matter():
    answers = [(A, True), (B, False), (I, True), (A, True), (I, False)]
    assert score_skill(answers) == score_skill(list(reversed(answers)))


@pytest.mark.parametrize(
    "answers",
    [
        [(B, True), (I, True), (I, True), (A, True)],               # 4 questions
        [(B, True), (B, True), (I, True), (A, True), (A, True)],    # 2 Beginner
        [(B, True), (I, True), (I, True), (A, True), (A, True), (A, True)],
    ],
)
def test_wrong_question_layout_is_rejected(answers):
    with pytest.raises(ScoringError, match="expected 1 Beginner"):
        score_skill(answers)


# ==========================================
# profile_action_for
# ==========================================
@pytest.mark.parametrize(
    ("claimed", "assessed", "action"),
    [
        (None, None, ProfileAction.NO_CHANGE),
        (None, B, ProfileAction.CREATED),
        (None, A, ProfileAction.CREATED),
        (B, None, ProfileAction.REMOVED),
        (A, None, ProfileAction.REMOVED),
        (B, B, ProfileAction.CONFIRMED),
        (I, I, ProfileAction.CONFIRMED),
        (A, A, ProfileAction.CONFIRMED),
        (B, I, ProfileAction.UPGRADED),
        (B, A, ProfileAction.UPGRADED),
        (I, A, ProfileAction.UPGRADED),
        (A, I, ProfileAction.DOWNGRADED),
        (A, B, ProfileAction.DOWNGRADED),
        (I, B, ProfileAction.DOWNGRADED),
    ],
)
def test_profile_action(claimed, assessed, action):
    assert profile_action_for(claimed, assessed) == action
