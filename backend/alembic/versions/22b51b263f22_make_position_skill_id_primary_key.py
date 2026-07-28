"""Make position_skill id primary key

Revision ID: 22b51b263f22
Revises: 38ab1d56fa57
Create Date: 2026-07-26 12:31:12.724776

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '22b51b263f22'
down_revision: Union[str, Sequence[str], None] = '38ab1d56fa57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade():
    op.drop_constraint(
        "position_skills_pkey",
        "position_skills",
        type_="primary",
    )

    op.create_primary_key(
        "position_skills_pkey",
        "position_skills",
        ["id"],
    )


def downgrade():
    op.drop_constraint(
        "position_skills_pkey",
        "position_skills",
        type_="primary",
    )

    op.create_primary_key(
        "position_skills_pkey",
        "position_skills",
        ["position_id", "skill_id"],
    )
