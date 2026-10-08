"""
Strict validation for question-bank content (JSONL files in
app/data/question_bank/). Used by the question generator and, later, by the
importer, so both apply exactly the same rules.

Each question must have exactly six options, one of each OptionType, with
unique non-empty texts and explanations.
"""
from typing import Literal

from pydantic import BaseModel, field_validator, model_validator

OptionType = Literal[
    "correct",
    "near_miss",
    "misconception",
    "plausible_wrong_1",
    "plausible_wrong_2",
    "plausible_wrong_3",
]

QuestionLevel = Literal["Beginner", "Intermediate", "Advanced"]

REQUIRED_OPTION_TYPES: frozenset[str] = frozenset(OptionType.__args__)


def normalize_text(text: str) -> str:
    """Lowercase and collapse whitespace; used to detect duplicate texts."""
    return " ".join(text.split()).lower()


class BankOption(BaseModel):
    text: str
    type: OptionType
    explanation: str

    @field_validator("text", "explanation")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be empty")
        return value


class BankQuestion(BaseModel):
    question_text: str
    proficiency_level: QuestionLevel
    options: list[BankOption]

    @field_validator("question_text")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be empty")
        return value

    @model_validator(mode="after")
    def check_options(self) -> "BankQuestion":
        if len(self.options) != len(REQUIRED_OPTION_TYPES):
            raise ValueError(
                f"expected {len(REQUIRED_OPTION_TYPES)} options, got {len(self.options)}"
            )

        types = [option.type for option in self.options]
        if set(types) != REQUIRED_OPTION_TYPES:
            missing = sorted(REQUIRED_OPTION_TYPES - set(types))
            duplicated = sorted({t for t in types if types.count(t) > 1})
            raise ValueError(
                f"option types must be one of each; missing={missing}, duplicated={duplicated}"
            )

        # Case-sensitive: some questions are about capitalisation itself
        texts = [" ".join(option.text.split()) for option in self.options]
        if len(set(texts)) != len(texts):
            raise ValueError("option texts must be unique")

        return self


class SkillQuestionBank(BaseModel):
    skill_name: str
    questions: list[BankQuestion]

    @field_validator("skill_name")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("must not be empty")
        return value

    @model_validator(mode="after")
    def unique_questions(self) -> "SkillQuestionBank":
        texts = [normalize_text(q.question_text) for q in self.questions]
        if len(set(texts)) != len(texts):
            raise ValueError("question texts must be unique within a skill")
        return self
