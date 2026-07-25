"""Convert position_skills to association model

Revision ID: 6fda1ec3d967
Revises: 952d78e439e7
Create Date: 2026-07-25 01:13:47.613458

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6fda1ec3d967'
down_revision: Union[str, Sequence[str], None] = '952d78e439e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("position_skills")

    op.create_table(
        "position_skills",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "position_id",
            sa.Integer(),
            sa.ForeignKey("positions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "skill_id",
            sa.Integer(),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "required_skill_level",
            sa.Enum(
                "BEGINNER",
                "INTERMEDIATE",
                "ADVANCED",
                "EXPERT",
                name="skilllevel",
            ),
            nullable=False,
        ),
        sa.Column("is_essential", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("short_description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("position_id", "skill_id"),
    )


def downgrade() -> None:
    op.drop_table("position_skills")

    op.create_table(
        "position_skills",
        sa.Column(
            "position_id",
            sa.Integer(),
            sa.ForeignKey("positions.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "skill_id",
            sa.Integer(),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )