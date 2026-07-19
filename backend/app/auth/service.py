from sqlalchemy.orm import Session

from app.auth import crud
from app.auth.schemas import SignupRequest

from app.core.security import hash_password


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
        raise ValueError("Employee not found.")


    existing_user = crud.get_user_by_employee_id(
        db,
        employee.id,
    )

    if existing_user:
        raise ValueError(
            "This employee already has an account."
        )
    

    existing_username = crud.get_user_by_username(
        db,
        signup_data.username,
    )

    if existing_username:
        raise ValueError(
            "Username already exists."
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