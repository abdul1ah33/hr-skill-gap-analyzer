from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True)

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(Text)

    difficulty: Mapped[str | None] = mapped_column(
        String(30)
    )

    passing_score: Mapped[int | None] = mapped_column(Integer)

    duration_minutes: Mapped[int | None] = mapped_column(Integer)

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id")
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

    creator: Mapped["User | None"] = relationship(
        back_populates="created_assessments"
    )

    assessment_skills: Mapped[list["AssessmentSkill"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )

    questions: Mapped[list["AssessmentQuestion"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )

    results: Mapped[list["AssessmentResult"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )