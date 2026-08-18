from sqlalchemy.orm import Session, selectinload

from app.models.employee import Employee
from app.models.employee_skill import EmployeeSkill
from app.models.position import Position
from app.models.position_skill import PositionSkill
from app.models.user import User
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


def _base_query(db: Session):
    """
    Shared query with all relationship eager-loads to avoid N+1 queries
    and prevent lazy-loading errors when Pydantic serializes the response.
    """
    return db.query(Employee).options(
        selectinload(Employee.department),
        selectinload(Employee.position).selectinload(Position.position_skills).selectinload(PositionSkill.skill),
        selectinload(Employee.employee_skills).selectinload(EmployeeSkill.skill),
        selectinload(Employee.education),
        selectinload(Employee.certifications),
        selectinload(Employee.user).selectinload(User.role),
    )


# ─── Create ──────────────────────────────────────────────────────────────────

def create_employee(db: Session, employee: EmployeeCreate) -> Employee:
    db_employee = Employee(**employee.model_dump())

    db.add(db_employee)

    # Generate the database ID
    db.flush()

    # Generate employee number from the database ID
    db_employee.employee_number = f"EMP{db_employee.id:04d}"

    db.commit()
    db.refresh(db_employee)

    # Re-fetch with relationships loaded
    return (
        _base_query(db)
        .filter(Employee.id == db_employee.id)
        .first()
    )


# ─── Read all ────────────────────────────────────────────────────────────────

def get_employees(db: Session) -> list[Employee]:
    return _base_query(db).all()


# ─── Read one ────────────────────────────────────────────────────────────────

def get_employee(db: Session, employee_id: int) -> Employee | None:
    return _base_query(db).filter(Employee.id == employee_id).first()


# ─── Update (partial) ────────────────────────────────────────────────────────

def update_employee(
    db: Session,
    employee_id: int,
    employee: EmployeeUpdate,
) -> Employee | None:
    db_employee = get_employee(db, employee_id)

    if not db_employee:
        return None

    # Only update fields that were explicitly provided (not None)
    update_data = employee.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(db_employee, field, value)

    db.commit()
    db.refresh(db_employee)

    # Re-fetch with eager-loaded relationships
    return _base_query(db).filter(Employee.id == db_employee.id).first()


# ─── Delete ──────────────────────────────────────────────────────────────────

def delete_employee(db: Session, employee_id: int) -> Employee | None:
    db_employee = get_employee(db, employee_id)

    if not db_employee:
        return None

    db.delete(db_employee)
    db.commit()

    return db_employee


# ─── Count ───────────────────────────────────────────────────────────────────

def get_employee_count(db: Session) -> int:
    return db.query(Employee).count()
