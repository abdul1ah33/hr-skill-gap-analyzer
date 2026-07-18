from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, Date, ForeignKey, UniqueConstraint, Enum as SQLAlchemyEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class SkillLevel(str, enum.Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"
    EXPERT = "Expert"


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    __table_args__ = (
        UniqueConstraint("employee_id", "skill_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False
    )

    level: Mapped[SkillLevel | None] = mapped_column(
        SQLAlchemyEnum(SkillLevel)
    )

    years_experience: Mapped[int | None]

    verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    last_assessed: Mapped[datetime | None] = mapped_column(Date)

    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    employee: Mapped[Employee] = relationship(
        back_populates="employee_skills"
    )

    skill: Mapped[Skill] = relationship(
        back_populates="employee_skills"
    )