from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    __table_args__ = (
        UniqueConstraint("employee_id", "skill_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"),
        nullable=False
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id"),
        nullable=False
    )

    level: Mapped[int | None]

    years_experience: Mapped[int | None]

    verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    last_assessed: Mapped[datetime | None] = mapped_column(Date)

    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    employee: Mapped[Employee] = relationship(
        back_populates="employee_skills"
    )

    skill: Mapped[Skill] = relationship(
        back_populates="employee_skills"
    )