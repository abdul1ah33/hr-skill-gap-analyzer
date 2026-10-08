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
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.assessment_enums import QuestionOptionType
from app.models.employee_skill import SkillLevel

if TYPE_CHECKING:
    from .assessment import Assessment
    from .assessment_skill import AssessmentSkill
    from .skill_question import SkillQuestion, SkillQuestionOption


class AssessmentQuestion(Base):
    """
    A bank question presented in one assessment, and the employee's answer.

    Its id is the question id the frontend sees. Options are shown in the
    order stored in option_order (bank option ids); the frontend only sees
    their 1-based positions, never bank ids or option types.
    """

    __tablename__ = "assessment_questions"

    __table_args__ = (
        UniqueConstraint("assessment_id", "display_order"),
        UniqueConstraint("assessment_id", "skill_question_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False,
    )

    assessment_skill_id: Mapped[int] = mapped_column(
        ForeignKey("assessment_skills.id", ondelete="CASCADE"),
        nullable=False,
    )

    skill_question_id: Mapped[int] = mapped_column(
        ForeignKey("skill_questions.id", ondelete="RESTRICT"),
        nullable=False,
    )

    display_order: Mapped[int] = mapped_column(Integer, nullable=False)

    proficiency_level: Mapped[SkillLevel] = mapped_column(
        SQLAlchemyEnum(SkillLevel, name="skilllevel", create_type=False),
        nullable=False,
    )

    # Bank option ids in the order shown to the employee
    option_order: Mapped[list[int]] = mapped_column(JSONB, nullable=False)

    selected_option_id: Mapped[int | None] = mapped_column(
        ForeignKey("skill_question_options.id", ondelete="RESTRICT"),
    )
    # Stored for later analysis (near_miss vs misconception...); scoring only
    # uses is_correct
    selected_option_type: Mapped[QuestionOptionType | None] = mapped_column(
        SQLAlchemyEnum(QuestionOptionType, name="questionoptiontype", create_type=False),
    )
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    assessment: Mapped["Assessment"] = relationship(back_populates="questions")

    assessment_skill: Mapped["AssessmentSkill"] = relationship(
        back_populates="questions",
    )

    skill_question: Mapped["SkillQuestion"] = relationship()

    selected_option: Mapped["SkillQuestionOption | None"] = relationship()
