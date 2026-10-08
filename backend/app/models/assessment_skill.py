from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLAlchemyEnum,
    ForeignKey,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.assessment_enums import ProfileAction, SkillGapCategory
from app.models.employee_skill import SkillLevel

if TYPE_CHECKING:
    from .assessment import Assessment
    from .assessment_question import AssessmentQuestion
    from .skill import Skill


def _skill_level_column():
    return SQLAlchemyEnum(SkillLevel, name="skilllevel", create_type=False)


class AssessmentSkill(Base):
    """A skill tested in one assessment, with its grading result."""

    __tablename__ = "assessment_skills"

    __table_args__ = (
        UniqueConstraint("assessment_id", "skill_id"),
        UniqueConstraint("assessment_id", "display_order"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False,
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="RESTRICT"),
        nullable=False,
    )

    display_order: Mapped[int] = mapped_column(Integer, nullable=False)

    # Snapshot of the gap analysis when the assessment started
    category: Mapped[SkillGapCategory] = mapped_column(
        SQLAlchemyEnum(SkillGapCategory, name="skillgapcategory"),
        nullable=False,
    )
    is_essential: Mapped[bool] = mapped_column(Boolean, nullable=False)
    claimed_level: Mapped[SkillLevel | None] = mapped_column(_skill_level_column())
    required_level: Mapped[SkillLevel | None] = mapped_column(_skill_level_column())

    # Filled when graded
    beginner_correct: Mapped[int | None] = mapped_column(Integer)
    intermediate_correct: Mapped[int | None] = mapped_column(Integer)
    advanced_correct: Mapped[int | None] = mapped_column(Integer)
    total_correct: Mapped[int | None] = mapped_column(Integer)
    # None after grading means the "None" result (no proficiency)
    assessed_level: Mapped[SkillLevel | None] = mapped_column(_skill_level_column())
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    profile_action: Mapped[ProfileAction | None] = mapped_column(
        SQLAlchemyEnum(ProfileAction, name="profileaction"),
    )

    assessment: Mapped["Assessment"] = relationship(back_populates="skills")

    skill: Mapped["Skill"] = relationship(back_populates="assessment_skills")

    questions: Mapped[list["AssessmentQuestion"]] = relationship(
        back_populates="assessment_skill",
        order_by="AssessmentQuestion.display_order",
    )
