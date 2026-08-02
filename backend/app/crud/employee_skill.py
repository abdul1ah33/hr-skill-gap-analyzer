from datetime import date

from sqlalchemy.orm import Session, selectinload

from app.crud.helpers import get_employee_or_raise, get_skill_or_raise

from app.models.employee_skill import EmployeeSkill

from app.schemas.employee_skill import (
    EmployeeSkillCreate,
    EmployeeSkillUpdate,
)

from app.core.exceptions import (
    EmployeeSkillNotFoundError,
    EmployeeSkillAlreadyExistsError,
)



def add_skill_to_employee(
    db: Session,
    employee_id: int,
    employee_skill: EmployeeSkillCreate,
) -> EmployeeSkill:
    """Add a skill to an employee."""
    # Check if the employee exists
    get_employee_or_raise(db, employee_id)    

    # Check if the skill exists
    get_skill_or_raise(db, employee_skill.skill_id)

    # Check if the employee already has the skill
    existing = (
        db.query(EmployeeSkill)
        .filter(
            EmployeeSkill.employee_id == employee_id,
            EmployeeSkill.skill_id == employee_skill.skill_id,
        )
        .first()
    )

    if existing:
        raise EmployeeSkillAlreadyExistsError()

    # Create a new EmployeeSkill entry
    db_employee_skill = EmployeeSkill(
        employee_id=employee_id,
        **employee_skill.model_dump(),
    )

    # Add the new entry to the database
    if db_employee_skill.verified:
        db_employee_skill.last_assessed = date.today()

    db.add(db_employee_skill)
    db.commit()
    db.refresh(db_employee_skill)

    return (
        db.query(EmployeeSkill)
        .filter(EmployeeSkill.id == db_employee_skill.id)
        .options(selectinload(EmployeeSkill.skill))
        .first()
    )


def get_employee_skills(
    db: Session,
    employee_id: int,
) -> list[EmployeeSkill]:
    """Retrieve all skills associated with a specific employee."""

    get_employee_or_raise(db, employee_id)  # Ensure the employee exists

    return (
        db.query(EmployeeSkill)
        .filter(EmployeeSkill.employee_id == employee_id)
        .options(selectinload(EmployeeSkill.skill))
        .all()
    )


def update_employee_skill(
    db: Session,
    employee_id: int,
    skill_id: int,
    employee_skill: EmployeeSkillUpdate,
) -> EmployeeSkill:
    """Update an existing skill for a specific employee."""

    get_employee_or_raise(db, employee_id)  # Ensure the employee exists

    db_employee_skill = (
        db.query(EmployeeSkill)
        .filter(
            EmployeeSkill.employee_id == employee_id,
            EmployeeSkill.skill_id == skill_id,
        )
        .first()
    )

    if not db_employee_skill:
        raise EmployeeSkillNotFoundError()

    update_data = employee_skill.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_employee_skill, key, value)

    if "verified" in update_data and update_data["verified"]:
        db_employee_skill.last_assessed = date.today()

    db.commit()
    db.refresh(db_employee_skill)

    return (
        db.query(EmployeeSkill)
        .filter(EmployeeSkill.id == db_employee_skill.id)
        .options(selectinload(EmployeeSkill.skill))
        .first()
    )


def remove_skill_from_employee(
    db: Session,
    employee_id: int,
    skill_id: int,
) -> EmployeeSkill:
    """Remove a skill from a specific employee."""

    get_employee_or_raise(db, employee_id)  # Ensure the employee exists

    db_employee_skill = (
        db.query(EmployeeSkill)
        .filter(
            EmployeeSkill.employee_id == employee_id,
            EmployeeSkill.skill_id == skill_id,
        )
        .first()
    )

    if not db_employee_skill:
        raise EmployeeSkillNotFoundError()

    db.delete(db_employee_skill)
    db.commit()

    return db_employee_skill


# from sqlalchemy.orm import Session, selectinload
# from app.models.employee_skill import EmployeeSkill
# from app.schemas.employee_skill import EmployeeSkillCreate, EmployeeSkillUpdate


# def get_employee_skills(db: Session, employee_id: int) -> list[EmployeeSkill]:
#     return (
#         db.query(EmployeeSkill)
#         .filter(EmployeeSkill.employee_id == employee_id)
#         .options(selectinload(EmployeeSkill.skill))
#         .all()
#     )


# def get_employee_skill(
#     db: Session, employee_id: int, skill_id: int
# ) -> EmployeeSkill | None:
#     return (
#         db.query(EmployeeSkill)
#         .filter(
#             EmployeeSkill.employee_id == employee_id,
#             EmployeeSkill.skill_id == skill_id,
#         )
#         .first()
#     )


# def add_skill_to_employee(
#     db: Session, employee_id: int, employee_skill: EmployeeSkillCreate
# ) -> EmployeeSkill:
#     db_employee_skill = EmployeeSkill(
#         employee_id=employee_id, **employee_skill.model_dump()
#     )
#     db.add(db_employee_skill)
#     db.commit()
#     db.refresh(db_employee_skill)
#     # Eager load skill model for the response representation
#     return (
#         db.query(EmployeeSkill)
#         .filter(EmployeeSkill.id == db_employee_skill.id)
#         .options(selectinload(EmployeeSkill.skill))
#         .first()
#     )


# def update_employee_skill(
#     db: Session,
#     employee_id: int,
#     skill_id: int,
#     employee_skill: EmployeeSkillUpdate,
# ) -> EmployeeSkill | None:
#     db_employee_skill = get_employee_skill(db, employee_id, skill_id)
#     if not db_employee_skill:
#         return None

#     update_data = employee_skill.model_dump(exclude_unset=True)
#     for key, value in update_data.items():
#         setattr(db_employee_skill, key, value)

#     db.commit()
#     db.refresh(db_employee_skill)
#     return (
#         db.query(EmployeeSkill)
#         .filter(EmployeeSkill.id == db_employee_skill.id)
#         .options(selectinload(EmployeeSkill.skill))
#         .first()
#     )


# def remove_skill_from_employee(
#     db: Session, employee_id: int, skill_id: int
# ) -> EmployeeSkill | None:
#     db_employee_skill = get_employee_skill(db, employee_id, skill_id)
#     if not db_employee_skill:
#         return None

#     db.delete(db_employee_skill)
#     db.commit()
#     return db_employee_skill
