"""Phase 3: skills are never deleted as a side effect, and referenced skills are protected."""
import hashlib

import pytest

from app.api.endpoints import positions as positions_endpoint
from app.models.position import Position
from app.models.position_skill import PositionSkill
from app.models.skill import Skill
from app.models.skill_question import SkillQuestion
from app.models.employee_skill import SkillLevel

pytestmark = pytest.mark.integration


@pytest.fixture
def hr_headers(factory):
    return factory.auth_headers(factory.user("HR"))


@pytest.fixture(autouse=True)
def no_skill_generation(monkeypatch):
    """Title changes trigger ESCO + Gemini generation; keep tests offline."""
    monkeypatch.setattr(positions_endpoint, "_generate_skills_background", lambda **_: None)


def _bank_question(db, skill: Skill) -> SkillQuestion:
    question = SkillQuestion(
        skill_id=skill.id,
        question_text="What is a test?",
        proficiency_level=SkillLevel.BEGINNER,
        content_hash=hashlib.sha256(f"q-{skill.id}".encode()).hexdigest(),
        source="curated",
    )
    db.add(question)
    db.flush()
    return question


def test_deleting_a_position_keeps_its_skills(client, db, factory, hr_headers):
    position = factory.position()
    only_here = factory.skill()
    factory.position_skill(position, only_here)

    response = client.delete(f"/positions/{position.id}", headers=hr_headers)

    assert response.status_code == 200
    assert db.get(Position, position.id) is None
    assert db.query(PositionSkill).filter_by(position_id=position.id).count() == 0
    assert db.get(Skill, only_here.id) is not None


def test_changing_position_title_removes_links_but_keeps_skills(client, db, factory, hr_headers):
    position = factory.position(title="Backend Engineer")
    skill = factory.skill()
    factory.position_skill(position, skill)

    response = client.put(
        f"/positions/{position.id}",
        json={"title": "Data Engineer"},
        headers=hr_headers,
    )

    assert response.status_code == 200
    assert db.query(PositionSkill).filter_by(position_id=position.id).count() == 0
    assert db.get(Skill, skill.id) is not None


def test_skill_with_bank_questions_cannot_be_deleted(client, db, factory):
    skill = factory.skill()
    _bank_question(db, skill)

    response = client.delete(f"/skills/{skill.id}")

    assert response.status_code == 409
    assert db.get(Skill, skill.id) is not None


def test_skill_held_by_an_employee_cannot_be_deleted(client, db, factory):
    skill = factory.skill()
    factory.employee_skill(factory.employee(), skill)

    response = client.delete(f"/skills/{skill.id}")

    assert response.status_code == 400
    assert db.get(Skill, skill.id) is not None


def test_unreferenced_skill_can_be_deleted(client, db, factory):
    skill = factory.skill()

    response = client.delete(f"/skills/{skill.id}")

    assert response.status_code == 200
    assert db.get(Skill, skill.id) is None
