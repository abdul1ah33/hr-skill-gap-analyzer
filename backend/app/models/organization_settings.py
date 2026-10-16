from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class OrganizationSettings(Base):
    """
    Who this deployment belongs to. Each client has its own database
    (plan: docs/plans/industry_templates_plan.md §2), so this table holds
    exactly one row (id = 1).
    """

    __tablename__ = "organization_settings"

    __table_args__ = (
        CheckConstraint("id = 1", name="ck_organization_settings_single_row"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)

    name: Mapped[str] = mapped_column(String(150), nullable=False)

    # Free text for now, e.g. "port", "hospital"
    industry: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Set by the template applier
    template_key: Mapped[str | None] = mapped_column(String(50), nullable=True)
    template_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    template_applied_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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
