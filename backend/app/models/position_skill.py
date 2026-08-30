from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
    Enum as SQLAlchemyEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.employee_skill import SkillLevel


if TYPE_CHECKING:
    from .position import Position
    from .skill import Skill


class PositionSkill(Base):
    """
    Represents a skill required for a specific position.

    Example:

        Position:
            Senior Machine Learning Engineer

        Skill:
            Python

        Required level:
            Advanced

        Essential:
            True
    """

    __tablename__ = "position_skills"

    __table_args__ = (
        UniqueConstraint(
            "position_id",
            "skill_id",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    # ------------------------------------------
    # Position
    # ------------------------------------------

    position_id: Mapped[int] = mapped_column(
        ForeignKey(
            "positions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    # ------------------------------------------
    # Skill
    # ------------------------------------------

    skill_id: Mapped[int] = mapped_column(
        ForeignKey(
            "skills.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    # ------------------------------------------
    # Required proficiency
    # ------------------------------------------

    required_skill_level: Mapped[SkillLevel] = mapped_column(
        SQLAlchemyEnum(SkillLevel),
        nullable=False,
    )

    # ------------------------------------------
    # Essential / Optional
    # ------------------------------------------

    is_essential: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # ------------------------------------------
    # Optional description
    # ------------------------------------------

    short_description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # ------------------------------------------
    # Timestamps
    # ------------------------------------------

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # ------------------------------------------
    # Relationships
    # ------------------------------------------

    position: Mapped["Position"] = relationship(
        back_populates="position_skills",
    )

    skill: Mapped["Skill"] = relationship(
        back_populates="position_skills",
    )

