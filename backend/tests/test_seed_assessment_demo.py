"""Demo data for skill assessments."""
import pytest

from app.core.security import verify_password
from app.models.assessment_enums import SkillGapCategory
from app.models.employee import Employee
from app.models.position import Position
from app.models.position_skill import PositionSkill
from app.models.user import User
from app.scripts.seed_assessment_demo import DEMO_PASSWORD, DEMO_POSITIONS, seed_demo
from app.services.assessment_target_service import AssessmentTargetService

pytestmark = pytest.mark.integration


@pytest.fixture
def bank(factory):
    factory.role("Employee")
    names = {name for _, _, _, skills, _ in DEMO_POSITIONS for name, _, _ in skills}
    names |= {employee[4] for *_, employee in DEMO_POSITIONS}
    for name in names:
        factory.bank_questions(factory.skill(name))


def test_seed_creates_positions_employees_and_logins(db, bank):
    accounts = seed_demo(db)

    assert len(accounts) == 9
    for title, _, skills, employee in [(p[0], p[1], p[3], p[4]) for p in DEMO_POSITIONS]:
        position = db.query(Position).filter_by(title=title).one()
        assert db.query(PositionSkill).filter_by(position_id=position.id).count() == len(skills)
        person = db.query(Employee).filter_by(employee_number=employee[0]).one()
        assert person.position_id == position.id
        user = db.query(User).filter_by(employee_id=person.id).one()
        assert user.role.name == "Employee"
        assert verify_password(DEMO_PASSWORD, user.password_hash)


def test_every_demo_employee_can_be_assessed_with_all_gap_categories(db, bank):
    seed_demo(db)

    for *_, employee in DEMO_POSITIONS:
        person = db.query(Employee).filter_by(employee_number=employee[0]).one()
        selection = AssessmentTargetService().select_targets(db, person.id)

        assert selection.not_assessable == []
        assert {t.category for t in selection.targets} == set(SkillGapCategory)


def test_seed_is_idempotent(db, bank):
    seed_demo(db)
    counts = (db.query(Position).count(), db.query(Employee).count(), db.query(User).count())

    seed_demo(db)

    assert (db.query(Position).count(), db.query(Employee).count(), db.query(User).count()) == counts


def test_demo_employees_load_through_the_api(client, db, factory, bank):
    seed_demo(db)
    headers = factory.auth_headers(factory.user(role="HR"))

    for *_, employee in DEMO_POSITIONS:
        person = db.query(Employee).filter_by(employee_number=employee[0]).one()
        response = client.get(f"/employees/{person.id}", headers=headers)
        assert response.status_code == 200, response.text
