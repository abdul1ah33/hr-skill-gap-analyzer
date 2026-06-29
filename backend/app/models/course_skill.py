from __future__ import annotations

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class CourseSkill(Base):
    __tablename__ = "course_skills"

    __table_args__ = (
        UniqueConstraint("course_id", "skill_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id"),
        nullable=False
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id"),
        nullable=False
    )

    course: Mapped[Course] = relationship(
        back_populates="course_skills"
    )

    skill: Mapped[Skill] = relationship(
        back_populates="course_skills"
    )