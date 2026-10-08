from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLAlchemyEnum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.assessment_enums import QuestionOptionType
from app.models.employee_skill import SkillLevel

if TYPE_CHECKING:
    from .skill import Skill


class SkillQuestion(Base):
    """A question in the permanent question bank."""

    __tablename__ = "skill_questions"

    __table_args__ = (
        Index(
            "ix_skill_questions_skill_level_active",
            "skill_id",
            "proficiency_level",
            "is_active",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="RESTRICT"),
        nullable=False,
    )

    question_text: Mapped[str] = mapped_column(Text, nullable=False)

    proficiency_level: Mapped[SkillLevel] = mapped_column(
        SQLAlchemyEnum(SkillLevel, name="skilllevel", create_type=False),
        nullable=False,
    )

    # SHA-256 of the normalized question + options; makes imports idempotent
    content_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
    )

    # Questions are deactivated, never deleted, so history stays valid
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    # "curated" or "generated:<model>"
    source: Mapped[str] = mapped_column(String(100), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    skill: Mapped["Skill"] = relationship(back_populates="questions")

    options: Mapped[list["SkillQuestionOption"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="SkillQuestionOption.id",
    )


class SkillQuestionOption(Base):
    """One of the six answer options of a bank question."""

    __tablename__ = "skill_question_options"

    __table_args__ = (
        UniqueConstraint("question_id", "option_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    question_id: Mapped[int] = mapped_column(
        ForeignKey("skill_questions.id", ondelete="CASCADE"),
        nullable=False,
    )

    text: Mapped[str] = mapped_column(Text, nullable=False)

    option_type: Mapped[QuestionOptionType] = mapped_column(
        SQLAlchemyEnum(QuestionOptionType, name="questionoptiontype"),
        nullable=False,
    )

    explanation: Mapped[str] = mapped_column(Text, nullable=False)

    question: Mapped["SkillQuestion"] = relationship(back_populates="options")
