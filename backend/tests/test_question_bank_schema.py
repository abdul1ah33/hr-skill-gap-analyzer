"""Question-bank validation rules (plan Phase 4)."""
import copy
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.schemas.question_bank import (
    BankQuestion,
    SkillQuestionBank,
    correct_is_obviously_longest,
)

pytestmark = pytest.mark.unit

FIXTURES = Path(__file__).parent / "fixtures" / "question_bank_cases.json"
BANK_DIR = Path(__file__).resolve().parents[1] / "app" / "data" / "question_bank"

CASES = json.loads(FIXTURES.read_text(encoding="utf-8"))


def _case_id(case: dict) -> str:
    return f"{case['skill_name']}#{case['number']}"


def _valid_question() -> dict:
    return {
        "question_text": "Which command shows the current branch in Git?",
        "proficiency_level": "Beginner",
        "options": [
            {"text": "git branch", "type": "correct", "explanation": "Marks the current branch."},
            {"text": "git branches", "type": "near_miss", "explanation": "Not a Git command."},
            {"text": "git log", "type": "misconception", "explanation": "Shows commit history."},
            {"text": "git status -v", "type": "plausible_wrong_1", "explanation": "Shows changes."},
            {"text": "git remote", "type": "plausible_wrong_2", "explanation": "Lists remotes."},
            {"text": "git tag", "type": "plausible_wrong_3", "explanation": "Lists tags."},
        ],
    }


# ==========================================
# Real invalid questions from the teammate's bank
# ==========================================
@pytest.mark.parametrize("case", CASES["invalid"], ids=_case_id)
def test_real_invalid_questions_are_rejected(case):
    with pytest.raises(ValidationError, match=case["expected_error"]):
        BankQuestion(**case["question"])


@pytest.mark.parametrize("case", CASES["valid_edge_cases"], ids=_case_id)
def test_options_differing_only_in_case_are_allowed(case):
    BankQuestion(**case["question"])


def test_fixture_covers_all_original_problems():
    assert len(CASES["invalid"]) == 21
    assert {c["expected_error"] for c in CASES["invalid"]} == {
        "expected 6 options",
        "one of each",
    }


# ==========================================
# Individual rules
# ==========================================
def test_valid_question_passes():
    question = BankQuestion(**_valid_question())
    assert question.proficiency_level == "Beginner"
    assert not correct_is_obviously_longest(question)


@pytest.mark.parametrize("count", [5, 7])
def test_wrong_option_count_is_rejected(count):
    data = _valid_question()
    if count == 5:
        data["options"].pop()
    else:
        data["options"].append(
            {"text": "git show", "type": "plausible_wrong_3", "explanation": "Shows objects."}
        )
    with pytest.raises(ValidationError, match="expected 6 options"):
        BankQuestion(**data)


def test_two_correct_options_are_rejected():
    data = _valid_question()
    data["options"][1]["type"] = "correct"
    with pytest.raises(ValidationError, match=r"duplicated=\['correct'\]"):
        BankQuestion(**data)


def test_duplicate_option_text_is_rejected():
    data = _valid_question()
    data["options"][5]["text"] = "  git   log "
    with pytest.raises(ValidationError, match="option texts must be unique"):
        BankQuestion(**data)


@pytest.mark.parametrize("field", ["text", "explanation"])
def test_blank_option_fields_are_rejected(field):
    data = _valid_question()
    data["options"][2][field] = "   "
    with pytest.raises(ValidationError, match="must not be empty"):
        BankQuestion(**data)


def test_blank_question_text_is_rejected():
    data = _valid_question()
    data["question_text"] = " "
    with pytest.raises(ValidationError, match="must not be empty"):
        BankQuestion(**data)


@pytest.mark.parametrize("field, value", [("proficiency_level", "Expert"), ("options", "x")])
def test_unknown_level_or_bad_options_are_rejected(field, value):
    data = _valid_question()
    data[field] = value
    with pytest.raises(ValidationError):
        BankQuestion(**data)


def test_unknown_option_type_is_rejected():
    data = _valid_question()
    data["options"][3]["type"] = "wrong"
    with pytest.raises(ValidationError):
        BankQuestion(**data)


def test_duplicate_questions_in_a_skill_are_rejected():
    first = _valid_question()
    second = copy.deepcopy(first)
    second["question_text"] = "which COMMAND shows the current  branch in git?"
    with pytest.raises(ValidationError, match="question texts must be unique"):
        SkillQuestionBank(skill_name="Git", questions=[first, second])


def test_skill_name_whitespace_is_collapsed():
    bank = SkillQuestionBank(skill_name="  version   control ", questions=[_valid_question()])
    assert bank.skill_name == "version control"


def test_correct_option_much_longer_than_others_is_detected():
    data = _valid_question()
    data["options"][0]["text"] = "git branch --show-current prints only the current branch name"
    assert correct_is_obviously_longest(BankQuestion(**data))


# ==========================================
# Bank files in the repository
# ==========================================
BANK_FILES = sorted(BANK_DIR.glob("*.jsonl")) + sorted(BANK_DIR.glob("generated/*.jsonl"))


def _load(path: Path) -> list[SkillQuestionBank]:
    lines = path.read_text(encoding="utf-8").splitlines()
    return [SkillQuestionBank(**json.loads(line)) for line in lines if line.strip()]


@pytest.mark.parametrize("path", BANK_FILES, ids=lambda p: p.name)
def test_bank_files_are_valid(path):
    assert _load(path)


@pytest.mark.parametrize(
    "path", sorted(BANK_DIR.glob("generated/*.jsonl")), ids=lambda p: p.name
)
def test_generated_questions_have_no_length_bias_and_full_coverage(path):
    for bank in _load(path):
        biased = [q.question_text[:60] for q in bank.questions if correct_is_obviously_longest(q)]
        assert biased == [], bank.skill_name

        levels = [q.proficiency_level for q in bank.questions]
        assert levels.count("Beginner") >= 1, bank.skill_name
        assert levels.count("Intermediate") >= 2, bank.skill_name
        assert levels.count("Advanced") >= 2, bank.skill_name
