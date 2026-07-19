"""seed roles

Revision ID: 88f667b8877b
Revises: 45722b9a247f
Create Date: 2026-07-18 23:22:13.047149

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from sqlalchemy.sql import table, column
from datetime import datetime


# revision identifiers, used by Alembic.
revision: str = '88f667b8877b'
down_revision: Union[str, Sequence[str], None] = '45722b9a247f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

roles_table = table(
    "roles",
    column("name", sa.String),
    column("description", sa.Text),
    column("created_at", sa.DateTime),
    column("updated_at", sa.DateTime),
)


def upgrade() -> None:
    now = datetime.utcnow()

    op.bulk_insert(
        roles_table,
        [
            {
                "name": "HR",
                "description": "Can manage employees, departments, positions, skills, and assessments.",
                "created_at": now,
                "updated_at": now,
            },
            {
                "name": "Employee",
                "description": "Can access their own profile, assessments, and personal information.",
                "created_at": now,
                "updated_at": now,
            },
        ],
    )


def downgrade() -> None:
    op.execute(
    """
    DELETE FROM roles
    WHERE name IN ('HR', 'Employee')
    """
    )   
