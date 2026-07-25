from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_employee, get_current_user
from app.models.user import User
from app.schemas.employee import EmployeeResponse
from app.schemas.employee_skill import EmployeeSkillResponse
from app.crud.employee_skill import get_employee_skills
from app.dependencies import get_db


router = APIRouter()


@router.get(
    "/profile",
    response_model=EmployeeResponse,
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user.employee


@router.get(
    "/skills",
    response_model=list[EmployeeSkillResponse],
)
def get_my_skills(
    current_user: User = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    return get_employee_skills(
        db=db,
        employee_id=current_user.employee_id,
    )