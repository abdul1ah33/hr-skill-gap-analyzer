from __future__ import annotations

from datetime import datetime

from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .position_skill import PositionSkill
    from .skill_alias import SkillAlias


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    category: Mapped[str | None] = mapped_column(
        String(100)
    )

    description: Mapped[str | None] = mapped_column(
        Text
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    employee_skills: Mapped[list[EmployeeSkill]] = relationship(
        back_populates="skill"
    )

    course_skills: Mapped[list[CourseSkill]] = relationship(
        back_populates="skill"
    )

    assessment_skills: Mapped[list[AssessmentSkill]] = relationship(
        back_populates="skill"
    )

    position_skills: Mapped[list["PositionSkill"]] = relationship(
        back_populates="skill",
    )

    aliases: Mapped[list["SkillAlias"]] = relationship(
        "SkillAlias",
        back_populates="skill",
        cascade="all, delete-orphan",
    )