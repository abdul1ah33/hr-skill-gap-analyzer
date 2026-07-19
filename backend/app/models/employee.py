from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    String,
    Text,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)

    last_name: Mapped[str] = mapped_column(String(100), nullable=False)

    email: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    phone: Mapped[str | None] = mapped_column(String(20), unique=True)

    gender: Mapped[str | None] = mapped_column(String(20))

    birth_date: Mapped[date | None] = mapped_column(Date)

    hire_date: Mapped[date | None] = mapped_column(Date)

    employment_type: Mapped[str | None] = mapped_column(String(30))

    employment_status: Mapped[str | None] = mapped_column(String(30))

    salary: Mapped[float | None] = mapped_column(Numeric(10, 2))

    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id"),
        nullable=False,
    )

    position_id: Mapped[int] = mapped_column(
        ForeignKey("positions.id"),
        nullable=False,
    )


    profile_picture: Mapped[str | None] = mapped_column(String(255))

    address: Mapped[str | None] = mapped_column(Text)

    emergency_contact: Mapped[str | None] = mapped_column(String(255))

    national_id: Mapped[str | None] = mapped_column(
        String(50),
        unique=True,
    )

    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    department: Mapped["Department"] = relationship(
        back_populates="employees",
        foreign_keys=[department_id],
    )

    position: Mapped["Position"] = relationship(
        back_populates="employees"
    )



    user: Mapped["User | None"] = relationship(
        back_populates="employee",
        uselist=False,
    )

    employee_skills: Mapped[list["EmployeeSkill"]] = relationship(
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    assessment_results: Mapped[list["AssessmentResult"]] = relationship(
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    # ─── Computed properties ─────────────────────────────────────────────────

    @property
    def role(self) -> Optional["Role"]:
        """Resolve the employee's role via their linked user account."""
        if self.user is not None:
            return self.user.role
        return None