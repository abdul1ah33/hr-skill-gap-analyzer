"""add employee number trigger

Revision ID: f0b97c54cac8
Revises: 4b7053b33651
Create Date: 2026-07-29 13:26:19.066096

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f0b97c54cac8'
down_revision: Union[str, Sequence[str], None] = '4b7053b33651'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():

    op.execute("""
        CREATE SEQUENCE employee_number_seq
        START WITH 1
        INCREMENT BY 1;
    """)

    op.execute("""
        CREATE OR REPLACE FUNCTION generate_employee_number()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.employee_number IS NULL THEN
                NEW.employee_number :=
                    'EMP' || LPAD(nextval('employee_number_seq')::text, 6, '0');
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER employee_number_trigger
        BEFORE INSERT ON employees
        FOR EACH ROW
        EXECUTE FUNCTION generate_employee_number();
    """)


def downgrade():

    op.execute("""
        DROP TRIGGER IF EXISTS employee_number_trigger
        ON employees;
    """)

    op.execute("""
        DROP FUNCTION IF EXISTS generate_employee_number();
    """)

    op.execute("""
        DROP SEQUENCE IF EXISTS employee_number_seq;
    """)
