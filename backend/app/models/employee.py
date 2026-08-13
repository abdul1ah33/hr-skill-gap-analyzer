from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from .department import Department
    from .position import Position
    from .user import User
    from .employee_skill import EmployeeSkill
    from .assessment_result import AssessmentResult
    from .recommendation import Recommendation
    from .role import Role
    from .education import Education
    from .certification import Certification
    from .course_skill import CourseSkill
    from .assessment_skill import AssessmentSkill
    from .position_skill import PositionSkill
    from .skill_alias import SkillAlias


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_number: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
    )

    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    phone: Mapped[str | None] = mapped_column(
        String(20),
        unique=True,
    )

    gender: Mapped[str | None] = mapped_column(
        String(20)
    )

    years_experience: Mapped[int | None] = mapped_column()

    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id"),
        nullable=True,
    )

    position_id: Mapped[int] = mapped_column(
        ForeignKey("positions.id"),
        nullable=False,
    )

    notes: Mapped[str | None] = mapped_column(
        Text
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

    department: Mapped["Department | None"] = relationship(
        back_populates="employees",
        foreign_keys=[department_id],
    )

    position: Mapped["Position"] = relationship(
        back_populates="employees",
    )

    user: Mapped["User | None"] = relationship(
        back_populates="employee",
        uselist=False,
    )

    employee_skills: Mapped[list["EmployeeSkill"]] = relationship(
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    education: Mapped[list["Education"]] = relationship(
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    certifications: Mapped[list["Certification"]] = relationship(
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

    @property
    def role(self) -> Optional["Role"]:
        """Resolve the employee's role via their linked user account."""
        if self.user is not None:
            return self.user.role
        return None