"""Make position_skill id autoincrement

Revision ID: 4b7053b33651
Revises: 22b51b263f22
Create Date: 2026-07-26 12:36:10.307548

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b7053b33651'
down_revision: Union[str, Sequence[str], None] = '22b51b263f22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE SEQUENCE IF NOT EXISTS position_skills_id_seq;
        """
    )

    op.execute(
        """
        ALTER TABLE position_skills
        ALTER COLUMN id
        SET DEFAULT nextval('position_skills_id_seq');
        """
    )

    op.execute(
        """
        SELECT setval(
            'position_skills_id_seq',
            COALESCE((SELECT MAX(id) FROM position_skills), 1)
        );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE position_skills
        ALTER COLUMN id
        DROP DEFAULT;
        """
    )

    op.execute(
        """
        DROP SEQUENCE IF EXISTS position_skills_id_seq;
        """
    )