from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class AssessmentAnswer(Base):
    __tablename__ = "assessment_answers"

    id: Mapped[int] = mapped_column(primary_key=True)

    result_id: Mapped[int] = mapped_column(
        ForeignKey("assessment_results.id"),
        nullable=False,
    )

    question_id: Mapped[int] = mapped_column(
        ForeignKey("assessment_questions.id"),
        nullable=False,
    )

    employee_answer: Mapped[str | None] = mapped_column(
        Text
    )

    is_correct: Mapped[bool | None] = mapped_column(
        Boolean
    )

    earned_points: Mapped[int | None] = mapped_column(
        Integer
    )

    answered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    result: Mapped["AssessmentResult"] = relationship(
        back_populates="answers"
    )

    question: Mapped["AssessmentQuestion"] = relationship(
        back_populates="answers"
    )