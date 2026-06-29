from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"),
        nullable=False,
    )

    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id"),
        nullable=False,
    )

    score: Mapped[int | None] = mapped_column(Integer)

    percentage: Mapped[float | None] = mapped_column(
        Numeric(5, 2)
    )

    status: Mapped[str | None] = mapped_column(
        String(30)
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    attempt_number: Mapped[int | None] = mapped_column(
        Integer
    )

    feedback: Mapped[str | None] = mapped_column(
        Text
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

    employee: Mapped["Employee"] = relationship(
        back_populates="assessment_results"
    )

    assessment: Mapped["Assessment"] = relationship(
        back_populates="results"
    )

    answers: Mapped[list["AssessmentAnswer"]] = relationship(
        back_populates="result",
        cascade="all, delete-orphan",
    )