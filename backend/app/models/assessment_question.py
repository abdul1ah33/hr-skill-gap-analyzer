from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"

    id: Mapped[int] = mapped_column(primary_key=True)

    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id"),
        nullable=False,
    )

    question_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    question_type: Mapped[str | None] = mapped_column(
        String(30)
    )

    option_a: Mapped[str | None] = mapped_column(
        String(255)
    )

    option_b: Mapped[str | None] = mapped_column(
        String(255)
    )

    option_c: Mapped[str | None] = mapped_column(
        String(255)
    )

    option_d: Mapped[str | None] = mapped_column(
        String(255)
    )

    correct_answer: Mapped[str | None] = mapped_column(
        String(255)
    )

    points: Mapped[int] = mapped_column(
        Integer,
        default=1,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    assessment: Mapped["Assessment"] = relationship(
        back_populates="questions"
    )

    answers: Mapped[list["AssessmentAnswer"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
    )