from __future__ import annotations

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class AssessmentSkill(Base):
    __tablename__ = "assessment_skills"

    __table_args__ = (
        UniqueConstraint("assessment_id", "skill_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id"),
        nullable=False,
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id"),
        nullable=False,
    )

    assessment: Mapped["Assessment"] = relationship(
        back_populates="assessment_skills"
    )

    skill: Mapped["Skill"] = relationship(
        back_populates="assessment_skills"
    )