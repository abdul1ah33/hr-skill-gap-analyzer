"""
Test setup.

Tests run against a separate PostgreSQL database: TEST_DATABASE_URL, or
the DATABASE_URL database with a "_test" suffix. It is dropped, recreated
and migrated with Alembic once per test run. Each test runs inside a
transaction that is rolled back afterwards.
"""
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

_base_url = make_url(os.environ["DATABASE_URL"])
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL") or _base_url.set(
    database=f"{_base_url.database}_test"
).render_as_string(hide_password=False)

if make_url(TEST_DATABASE_URL).database == _base_url.database:
    raise RuntimeError("TEST_DATABASE_URL must not point at the development database")

# Must happen before anything imports app.db.database
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.security import create_access_token, hash_password  # noqa: E402
from app.db.database import engine  # noqa: E402
from app.dependencies import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.department import Department  # noqa: E402
from app.models.employee import Employee  # noqa: E402
from app.models.position import Position  # noqa: E402
from app.models.employee_skill import EmployeeSkill, SkillLevel  # noqa: E402
from app.models.position_skill import PositionSkill  # noqa: E402
from app.models.role import Role  # noqa: E402
from app.models.skill import Skill  # noqa: E402
from app.models.assessment_enums import QuestionOptionType  # noqa: E402
from app.models.skill_question import SkillQuestion, SkillQuestionOption  # noqa: E402
from app.models.user import User  # noqa: E402


def _recreate_test_database() -> None:
    url = make_url(TEST_DATABASE_URL)
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f'DROP DATABASE IF EXISTS "{url.database}" WITH (FORCE)'))
        conn.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin.dispose()


@pytest.fixture(scope="session", autouse=True)
def test_database():
    _recreate_test_database()
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(config, "head")
    yield
    engine.dispose()


@pytest.fixture
def db(test_database):
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)


# ─── Factories ────────────────────────────────────────────────────────────────

class Factory:
    def __init__(self, db: Session):
        self.db = db
        self._counter = 0

    def _next(self) -> int:
        self._counter += 1
        return self._counter

    def role(self, name: str) -> Role:
        role = self.db.query(Role).filter(Role.name == name).first()
        if not role:
            role = Role(name=name)
            self.db.add(role)
            self.db.flush()
        return role

    def position(self, title: str = "Backend Engineer") -> Position:
        department = Department(name=f"Engineering {self._next()}")
        self.db.add(department)
        self.db.flush()
        position = Position(title=title, department_id=department.id)
        self.db.add(position)
        self.db.flush()
        return position

    def employee(self, position: Position | None = None) -> Employee:
        n = self._next()
        position = position or self.position()
        employee = Employee(
            employee_number=f"T{n:04d}",
            first_name="Test",
            last_name=f"Employee{n}",
            email=f"employee{n}@example.com",
            position_id=position.id,
        )
        self.db.add(employee)
        self.db.flush()
        return employee

    def user(self, role: str = "Employee", employee: Employee | None = None) -> User:
        n = self._next()
        user = User(
            username=f"user{n}",
            email=f"user{n}@example.com",
            password_hash=hash_password("password"),
            role_id=self.role(role).id,
            employee_id=employee.id if employee else None,
        )
        self.db.add(user)
        self.db.flush()
        return user

    def skill(self, name: str | None = None) -> Skill:
        skill = Skill(name=name or f"test skill {self._next()}")
        self.db.add(skill)
        self.db.flush()
        return skill

    def position_skill(
        self,
        position: Position,
        skill: Skill,
        level: SkillLevel = SkillLevel.INTERMEDIATE,
        is_essential: bool = True,
    ) -> PositionSkill:
        row = PositionSkill(
            position_id=position.id,
            skill_id=skill.id,
            required_skill_level=level,
            is_essential=is_essential,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def employee_skill(
        self,
        employee: Employee,
        skill: Skill,
        level: SkillLevel = SkillLevel.BEGINNER,
    ) -> EmployeeSkill:
        row = EmployeeSkill(employee_id=employee.id, skill_id=skill.id, level=level)
        self.db.add(row)
        self.db.flush()
        return row

    def bank_questions(
        self,
        skill: Skill,
        beginner: int = 1,
        intermediate: int = 2,
        advanced: int = 2,
        is_active: bool = True,
    ) -> list[SkillQuestion]:
        """Bank questions with six options each (one of every type)."""
        questions = []
        for level, count in (
            (SkillLevel.BEGINNER, beginner),
            (SkillLevel.INTERMEDIATE, intermediate),
            (SkillLevel.ADVANCED, advanced),
        ):
            for _ in range(count):
                n = self._next()
                questions.append(SkillQuestion(
                    skill_id=skill.id,
                    question_text=f"{skill.name} question {n}",
                    proficiency_level=level,
                    content_hash=f"{n:064d}",
                    source="test",
                    is_active=is_active,
                    options=[
                        SkillQuestionOption(
                            text=f"{option_type.value} {n}",
                            option_type=option_type,
                            explanation="Test option.",
                        )
                        for option_type in QuestionOptionType
                    ],
                ))
        self.db.add_all(questions)
        self.db.flush()
        return questions

    @staticmethod
    def auth_headers(user: User) -> dict[str, str]:
        token = create_access_token(user_id=user.id, role=user.role.name)
        return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def factory(db) -> Factory:
    return Factory(db)
