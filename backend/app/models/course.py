from __future__ import annotations

from datetime import datetime

from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)

    title: Mapped[str] = mapped_column(String(150), nullable=False)

    provider: Mapped[str | None] = mapped_column(String(100))

    url: Mapped[str | None] = mapped_column(String(255))

    difficulty: Mapped[str | None] = mapped_column(String(30))

    estimated_hours: Mapped[int | None]

    description: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    course_skills: Mapped[list[CourseSkill]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan"
    )

    recommendations: Mapped[list[Recommendation]] = relationship(
        back_populates="course"
    )