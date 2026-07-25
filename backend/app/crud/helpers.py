from sqlalchemy.orm import Session

from app.core.exceptions import EmployeeNotFoundError
from app.models.employee import Employee

from app.models.position import Position
from app.core.exceptions import PositionNotFoundError


def get_position_or_raise(
    db: Session,
    position_id: int,
) -> Position:
    position = (
        db.query(Position)
        .filter(Position.id == position_id)
        .first()
    )

    if not position:
        raise PositionNotFoundError()

    return position


def get_skill_or_raise(
    db: Session,
    skill_id: int,
) -> Skill:

    skill = (
        db.query(Skill)
        .filter(Skill.id == skill_id)
        .first()
    )

    if not skill:
        raise SkillNotFoundError()

    return skill


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