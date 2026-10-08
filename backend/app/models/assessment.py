from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLAlchemyEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.assessment_enums import (
    AssessmentAdministration,
    AssessmentStatus,
)

if TYPE_CHECKING:
    from .employee import Employee
    from .position import Position
    from .user import User
    from .assessment_skill import AssessmentSkill
    from .assessment_question import AssessmentQuestion


class Assessment(Base):
    """One assessment attempt of one employee."""

    __tablename__ = "assessments"

    __table_args__ = (
        # At most one assigned or running assessment per employee
        Index(
            "uq_assessments_one_active_per_employee",
            "employee_id",
            unique=True,
            postgresql_where=text("status IN ('ASSIGNED', 'IN_PROGRESS')"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Snapshot of the position the skills were taken from
    position_id: Mapped[int | None] = mapped_column(
        ForeignKey("positions.id", ondelete="SET NULL"),
    )
    position_title: Mapped[str | None] = mapped_column(String(150))

    status: Mapped[AssessmentStatus] = mapped_column(
        SQLAlchemyEnum(AssessmentStatus, name="assessmentstatus"),
        nullable=False,
    )

    administered_by: Mapped[AssessmentAdministration | None] = mapped_column(
        SQLAlchemyEnum(AssessmentAdministration, name="assessmentadministration"),
    )

    # ─── Assignment (HR) ─────────────────────────────────────────────────────
    assigned_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ─── Attempt ─────────────────────────────────────────────────────────────
    started_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Config snapshot, so later config changes don't affect this attempt
    seconds_per_question: Mapped[int | None] = mapped_column(Integer)
    max_violations: Mapped[int | None] = mapped_column(Integer)

    violation_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    # ─── Single open session (see plan §A.5) ─────────────────────────────────
    session_token_hash: Mapped[str | None] = mapped_column(String(64))
    session_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    session_last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    # ─── Result ──────────────────────────────────────────────────────────────
    applied_to_profile: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    scoring_version: Mapped[str | None] = mapped_column(String(30))

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
        back_populates="assessments",
        foreign_keys=[employee_id],
    )

    position: Mapped["Position | None"] = relationship()

    assigned_by: Mapped["User | None"] = relationship(
        foreign_keys=[assigned_by_user_id],
    )

    started_by: Mapped["User | None"] = relationship(
        foreign_keys=[started_by_user_id],
    )

    skills: Mapped[list["AssessmentSkill"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="AssessmentSkill.display_order",
    )

    questions: Mapped[list["AssessmentQuestion"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="AssessmentQuestion.display_order",
    )
