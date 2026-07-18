from sqlalchemy.orm import Session, selectinload
from app.models.employee_skill import EmployeeSkill
from app.schemas.employee_skill import EmployeeSkillCreate, EmployeeSkillUpdate


def get_employee_skills(db: Session, employee_id: int) -> list[EmployeeSkill]:
    return (
        db.query(EmployeeSkill)
        .filter(EmployeeSkill.employee_id == employee_id)
        .options(selectinload(EmployeeSkill.skill))
        .all()
    )


def get_employee_skill(
    db: Session, employee_id: int, skill_id: int
) -> EmployeeSkill | None:
    return (
        db.query(EmployeeSkill)
        .filter(
            EmployeeSkill.employee_id == employee_id,
            EmployeeSkill.skill_id == skill_id,
        )
        .first()
    )


def add_skill_to_employee(
    db: Session, employee_id: int, employee_skill: EmployeeSkillCreate
) -> EmployeeSkill:
    db_employee_skill = EmployeeSkill(
        employee_id=employee_id, **employee_skill.model_dump()
    )
    db.add(db_employee_skill)
    db.commit()
    db.refresh(db_employee_skill)
    # Eager load skill model for the response representation
    return (
        db.query(EmployeeSkill)
        .filter(EmployeeSkill.id == db_employee_skill.id)
        .options(selectinload(EmployeeSkill.skill))
        .first()
    )


def update_employee_skill(
    db: Session,
    employee_id: int,
    skill_id: int,
    employee_skill: EmployeeSkillUpdate,
) -> EmployeeSkill | None:
    db_employee_skill = get_employee_skill(db, employee_id, skill_id)
    if not db_employee_skill:
        return None

    update_data = employee_skill.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_employee_skill, key, value)

    db.commit()
    db.refresh(db_employee_skill)
    return (
        db.query(EmployeeSkill)
        .filter(EmployeeSkill.id == db_employee_skill.id)
        .options(selectinload(EmployeeSkill.skill))
        .first()
    )


def remove_skill_from_employee(
    db: Session, employee_id: int, skill_id: int
) -> EmployeeSkill | None:
    db_employee_skill = get_employee_skill(db, employee_id, skill_id)
    if not db_employee_skill:
        return None

    db.delete(db_employee_skill)
    db.commit()
    return db_employee_skill
