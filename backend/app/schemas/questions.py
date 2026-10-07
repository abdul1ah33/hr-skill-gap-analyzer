from typing import Literal
from pydantic import BaseModel

OptionType = Literal[
    "correct",
    "near_miss",
    "misconception",
    "plausible_wrong_1",
    "plausible_wrong_2",
    "plausible_wrong_3"
]


class Option(BaseModel):
    text: str
    type: OptionType
    explanation: str


class Question(BaseModel):
    question_text: str
    proficiency_level: Literal[
        "Beginner",
        "Intermediate",
        "Advanced"
    ]
    options: list[Option]


class SkillQuestionBank(BaseModel):
    skill_name: str
    questions: list[Question]