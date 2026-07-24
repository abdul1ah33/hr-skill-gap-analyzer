from sqlalchemy.orm import Session

from app.core.exceptions import EmployeeNotFoundError
from app.models.employee import Employee


def get_employee_or_raise(
    db: Session,
    employee_id: int,
) -> Employee:
    employee = (
        db.query(Employee)
        .filter(Employee.id == employee_id)
        .first()
    )

    if not employee:
        raise EmployeeNotFoundError()

    return employee