from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import ForeignKey, UniqueConstraint, Enum as SQLAlchemyEnum, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class SkillLevel(str, enum.Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    __table_args__ = (
        UniqueConstraint("employee_id", "skill_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
    )

    level: Mapped[SkillLevel] = mapped_column(
        SQLAlchemyEnum(SkillLevel),
        nullable=False,
    )

    # Set by a graded assessment; reset when the level is edited manually
    verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    last_assessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    last_assessment_id: Mapped[int | None] = mapped_column(
        ForeignKey("assessments.id", ondelete="SET NULL"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    employee: Mapped["Employee"] = relationship(
        back_populates="employee_skills",
    )

    skill: Mapped["Skill"] = relationship(
        back_populates="employee_skills",
    )