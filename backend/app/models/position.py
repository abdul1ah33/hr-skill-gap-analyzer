from __future__ import annotations

from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .position_skill import PositionSkill

class Position(Base):
    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(primary_key=True)

    title: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id"),
        nullable=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    level: Mapped[str | None] = mapped_column(
        String(50)
    )

    salary_grade: Mapped[str | None] = mapped_column(
        String(50)
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

    department: Mapped["Department | None"] = relationship(
        back_populates="positions"
    )

    employees: Mapped[list[Employee]] = relationship(
        back_populates="position"
    )

    position_skills: Mapped[list["PositionSkill"]] = relationship(
        back_populates="position",
        cascade="all, delete-orphan",
    )