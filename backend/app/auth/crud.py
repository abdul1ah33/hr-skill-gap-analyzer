from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.employee import Employee
from app.models.user import User
from app.models.role import Role

from datetime import datetime, UTC


def get_employee_by_email(
    db: Session,
    email: str,
) -> Employee | None:

    return (
        db.query(Employee)
        .filter(Employee.email == email)
        .first()
    )


def get_user_by_employee_id(
    db: Session,
    employee_id: int,
) -> User | None:
    return (
        db.query(User)
        .filter(User.employee_id == employee_id)
        .first()
    )


def get_user_by_username(
    db: Session,
    username: str,
) -> User | None:
    return (
        db.query(User)
        .filter(User.username == username)
        .first()
    )


# To allow user to log in with either their email or username
def get_user_by_login(
    db: Session,
    login: str,
) -> User | None:

    return (
        db.query(User)
        .filter(
            or_(
                User.username == login,
                User.email == login,
            )
        )
        .first()
    )


def get_role_by_name(
    db: Session,
    name: str,
) -> Role | None:
    return (
        db.query(Role)
        .filter(Role.name == name)
        .first()
    )


def create_user(
    db: Session,
    *,
    username: str,
    email: str,
    password_hash: str,
    role_id: int,
    employee_id: int,
) -> User:
    user = User(
        username=username,
        email=email,
        password_hash=password_hash,
        role_id=role_id,
        employee_id=employee_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_last_login(
    db: Session,
    user: User,
) -> User:
    user.last_login = datetime.now(UTC)
    db.commit()
    db.refresh(user)
    return user