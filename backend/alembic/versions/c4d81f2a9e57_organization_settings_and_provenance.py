"""organization settings and provenance

- Creates organization_settings (single row: who this deployment belongs to).
- Adds esco_uri and description to skills.
- Adds source ("manual", "ai", "template:<key>@<version>") to positions and
  position_skills. Existing rows become "manual".

See docs/plans/industry_templates_plan.md (§5.1-5.3).

Revision ID: c4d81f2a9e57
Revises: a7c3e91d4b20
Create Date: 2026-10-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4d81f2a9e57'
down_revision: Union[str, Sequence[str], None] = 'a7c3e91d4b20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'organization_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('industry', sa.String(length=50), nullable=True),
        sa.Column('template_key', sa.String(length=50), nullable=True),
        sa.Column('template_version', sa.Integer(), nullable=True),
        sa.Column('template_applied_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('id = 1', name='ck_organization_settings_single_row'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.add_column('skills', sa.Column('esco_uri', sa.String(length=255), nullable=True))
    op.add_column('skills', sa.Column('description', sa.Text(), nullable=True))
    op.create_unique_constraint('skills_esco_uri_key', 'skills', ['esco_uri'])

    for table in ('positions', 'position_skills'):
        op.add_column(
            table,
            sa.Column('source', sa.String(length=100), nullable=False, server_default='manual'),
        )


def downgrade() -> None:
    for table in ('position_skills', 'positions'):
        op.drop_column(table, 'source')

    op.drop_constraint('skills_esco_uri_key', 'skills', type_='unique')
    op.drop_column('skills', 'description')
    op.drop_column('skills', 'esco_uri')

    op.drop_table('organization_settings')
