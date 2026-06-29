from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"),
        nullable=False,
    )

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id"),
        nullable=False,
    )

    reason: Mapped[str | None] = mapped_column(
        Text
    )

    priority: Mapped[str | None] = mapped_column(
        String(20)
    )

    status: Mapped[str | None] = mapped_column(
        String(20)
    )

    recommended_on: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    completed_on: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    employee: Mapped["Employee"] = relationship(
        back_populates="recommendations"
    )

    course: Mapped["Course"] = relationship(
        back_populates="recommendations"
    )