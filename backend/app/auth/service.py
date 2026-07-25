from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from app.auth import crud
from app.auth.schemas import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
)

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)

def signup(
    db: Session,
    signup_data: SignupRequest,
):
    """
    Create a user account for an existing employee.
    """
    # Verify that the employee exists.
    employee = crud.get_employee_by_email(
        db,
        signup_data.email,
    )

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )


    existing_user = crud.get_user_by_employee_id(
        db,
        employee.id,
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This employee already has an account.",
        )
    

    existing_username = crud.get_user_by_username(
        db,
        signup_data.username,
    )

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This employee already has an account.",
        )
    

    role = crud.get_role_by_name(
        db,
        "Employee",
    )

    if role is None:
        raise ValueError(
            "Employee role not found."
        )
    

    password_hash = hash_password(
        signup_data.password
    )

    # Create the account
    user = crud.create_user(
        db,
        username=signup_data.username,
        email=signup_data.email,
        password_hash=password_hash,
        role_id=role.id,
        employee_id=employee.id,
    )

    return user


def login(
    db: Session,
    login_data: LoginRequest,
) -> TokenResponse:
    """
    Authenticate a user and return an access token.
    """
    user = crud.get_user_by_login(
    db,
    login_data.login,
    )
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
        )
    
    if not verify_password(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
        )
    
    crud.update_last_login(
        db,
        user,
    )
    
    access_token = create_access_token(
        user_id=user.id,
        role=user.role.name,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
    )