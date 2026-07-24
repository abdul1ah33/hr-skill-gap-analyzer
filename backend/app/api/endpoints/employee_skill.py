from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.crud.employee_skill import (
    add_skill_to_employee,
    get_employee_skills,
    update_employee_skill,
    remove_skill_from_employee,
)

from app.schemas.employee_skill import (
    EmployeeSkillCreate,
    EmployeeSkillUpdate,
    EmployeeSkillResponse,
)

from app.auth.dependencies import get_current_hr, get_current_employee


router = APIRouter(
    dependencies=[Depends(get_current_hr)],
)


@router.get(
    "",
    response_model=list[EmployeeSkillResponse],
)
def get_employee_skills_endpoint(
    employee_id: int,
    db: Session = Depends(get_db),
):
    return get_employee_skills(
        db=db,
        employee_id=employee_id,
    )


@router.post(
    "",
    response_model=EmployeeSkillResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_employee_skill_endpoint(
    employee_id: int,
    employee_skill: EmployeeSkillCreate,
    db: Session = Depends(get_db),
):
    return add_skill_to_employee(
        db=db,
        employee_id=employee_id,
        employee_skill=employee_skill,
    )


@router.put(
    "/{skill_id}",
    response_model=EmployeeSkillResponse,
)
def update_employee_skill_endpoint(
    employee_id: int,
    skill_id: int,
    employee_skill: EmployeeSkillUpdate,
    db: Session = Depends(get_db),
):
    return update_employee_skill(
        db=db,
        employee_id=employee_id,
        skill_id=skill_id,
        employee_skill=employee_skill,
    )


@router.delete(
    "/{skill_id}",
    status_code=204,
)
def remove_employee_skill(
    employee_id: int,
    skill_id: int,
    db: Session = Depends(get_db),
):
    remove_skill_from_employee(
        db=db,
        employee_id=employee_id,
        skill_id=skill_id,
    )