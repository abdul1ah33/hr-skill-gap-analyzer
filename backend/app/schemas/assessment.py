from typing import Literal
from pydantic import BaseModel

class AssessmentOptionResponse(BaseModel):
    id: int
    text: str


class AssessmentQuestionResponse(BaseModel):
    id: int
    question_text: str
    proficiency_level: Literal[
        "Beginner",
        "Intermediate",
        "Advanced"
    ]
    options: list[AssessmentOptionResponse]