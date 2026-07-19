from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.schemas import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
)
from app.auth import service

from app.dependencies import get_db


router = APIRouter()


@router.post("/signup")
def signup_user(
    signup_data: SignupRequest,
    db: Session = Depends(get_db),
):
    service.signup(
        db,
        signup_data,
    )

    return {
        "message": "Account created successfully.",
    }


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login_user(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    return service.login(
        db,
        login_data,
    )