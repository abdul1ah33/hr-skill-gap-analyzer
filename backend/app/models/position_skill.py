from __future__ import annotations
from sqlalchemy import Enum as SQLAlchemyEnum

from app.models.employee_skill import SkillLevel

from datetime import datetime

from sqlalchemy import (
    ForeignKey,
    UniqueConstraint,
    Boolean,
    DateTime,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.database import Base


class PositionSkill(Base):
    __tablename__ = "position_skills"

    __table_args__ = (
        UniqueConstraint("position_id", "skill_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    position_id: Mapped[int] = mapped_column(
        ForeignKey("positions.id", ondelete="CASCADE"),
        nullable=False,
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
    )

    required_skill_level: Mapped[SkillLevel] = mapped_column(
        SQLAlchemyEnum(SkillLevel),
        nullable=False,
    )

    is_essential: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    short_description: Mapped[str | None]

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    position: Mapped["Position"] = relationship(
        back_populates="position_skills",
    )

    skill: Mapped["Skill"] = relationship(
        back_populates="position_skills",
    )