from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.employee import EmployeeResponse


router = APIRouter()


@router.get(
    "/profile",
    response_model=EmployeeResponse,
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user.employee