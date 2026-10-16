"""Phase 2 of the industry templates plan: organization settings, skill fields, source."""
from types import SimpleNamespace

import pytest
from sqlalchemy.exc import IntegrityError

from app.api.endpoints import positions as positions_endpoint
from app.models.organization_settings import OrganizationSettings
from app.models.position_skill import PositionSkill
from app.services import position_skill_service as service_module
from app.services.position_skill_service import PositionSkillService

pytestmark = pytest.mark.integration


@pytest.fixture(autouse=True)
def no_skill_generation(monkeypatch):
    """Creating or renaming a position triggers ESCO + Gemini; keep tests offline."""
    monkeypatch.setattr(positions_endpoint, "_generate_skills_background", lambda **_: None)


# ─── Organization settings ───────────────────────────────────────────────────

def test_organization_table_holds_a_single_row(db):
    db.add(OrganizationSettings(id=1, name="Client A"))
    db.flush()

    db.add(OrganizationSettings(id=2, name="Client B"))
    with pytest.raises(IntegrityError):
        db.flush()


def test_organization_is_404_until_configured(client, hr_headers):
    assert client.get("/organization", headers=hr_headers).status_code == 404


def test_hr_creates_then_updates_the_organization(client, hr_headers):
    response = client.put(
        "/organization",
        json={"name": " Client A Port ", "industry": " Port "},
        headers=hr_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Client A Port"
    assert response.json()["industry"] == "port"
    assert response.json()["template_key"] is None

    response = client.put("/organization", json={"name": "Client A"}, headers=hr_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Client A"
    assert response.json()["industry"] is None


def test_any_user_can_read_but_only_hr_can_update(client, factory, hr_headers):
    client.put("/organization", json={"name": "Client A"}, headers=hr_headers)
    employee_headers = factory.auth_headers(factory.user("Employee", factory.employee()))

    assert client.get("/organization").status_code == 401
    assert client.get("/organization", headers=employee_headers).status_code == 200
    assert client.put(
        "/organization", json={"name": "Hacked"}, headers=employee_headers
    ).status_code == 403


def test_organization_name_must_not_be_blank(client, hr_headers):
    assert client.put("/organization", json={"name": "  "}, headers=hr_headers).status_code == 422


# ─── Skill fields ────────────────────────────────────────────────────────────

def test_skill_description_and_esco_uri_round_trip(client, hr_headers):
    response = client.post(
        "/skills/",
        json={
            "name": "Lashing",
            "description": "Securing containers on deck.",
            "esco_uri": "http://data.europa.eu/esco/skill/test-lashing",
        },
        headers=hr_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["description"] == "Securing containers on deck."
    assert body["esco_uri"] == "http://data.europa.eu/esco/skill/test-lashing"


def test_duplicate_esco_uri_is_rejected(client, factory, hr_headers):
    uri = "http://data.europa.eu/esco/skill/test-duplicate"
    first = client.post("/skills/", json={"name": "skill one", "esco_uri": uri}, headers=hr_headers)
    other = factory.skill()

    assert client.post(
        "/skills/", json={"name": "skill two", "esco_uri": uri}, headers=hr_headers
    ).status_code == 400
    assert client.put(
        f"/skills/{other.id}", json={"esco_uri": uri}, headers=hr_headers
    ).status_code == 400
    # A skill can keep its own URI
    assert client.put(
        f"/skills/{first.json()['id']}", json={"esco_uri": uri}, headers=hr_headers
    ).status_code == 200


# ─── Source ──────────────────────────────────────────────────────────────────

def test_positions_created_by_hr_are_manual(client, factory, hr_headers):
    department_id = factory.position().department_id

    response = client.post(
        "/positions/",
        json={"title": "Crane Operator", "department_id": department_id},
        headers=hr_headers,
    )

    assert response.status_code == 201
    assert response.json()["source"] == "manual"


def test_editing_a_templated_position_makes_it_manual(client, db, factory, hr_headers):
    position = factory.position()
    position.source = "template:port@1"
    db.flush()

    response = client.put(
        f"/positions/{position.id}", json={"description": "Edited"}, headers=hr_headers
    )

    assert response.status_code == 200
    assert response.json()["source"] == "manual"


def test_position_skills_added_by_hr_are_manual(client, factory, hr_headers):
    position = factory.position()
    skill = factory.skill()

    response = client.post(
        f"/positionSkills/{position.id}/skills",
        json={"skill_id": skill.id, "required_skill_level": "Intermediate"},
        headers=hr_headers,
    )

    assert response.status_code == 201
    assert response.json()["source"] == "manual"


def test_editing_a_templated_position_skill_makes_it_manual(client, db, factory, hr_headers):
    position = factory.position()
    row = factory.position_skill(position, factory.skill())
    row.source = "template:port@1"
    db.flush()

    response = client.put(
        f"/positionSkills/{position.id}/skills/{row.id}",
        json={"required_skill_level": "Advanced"},
        headers=hr_headers,
    )

    assert response.status_code == 200
    assert response.json()["source"] == "manual"


def test_ai_generated_position_skills_are_marked_ai(db, factory, monkeypatch):
    position = factory.position(title="Crane Operator")
    factory.skill("crane operation")

    monkeypatch.setenv("GEMINI_API_KEY", "test")
    monkeypatch.setattr(
        service_module,
        "generate_perfect_profile",
        lambda **_: SimpleNamespace(skills=[
            SimpleNamespace(name="Crane Operation", target_proficiency="Advanced", priority="Essential"),
            SimpleNamespace(name="Load Planning", target_proficiency="Intermediate", priority="Optional"),
        ]),
    )
    service = PositionSkillService()
    monkeypatch.setattr(
        service.esco_service,
        "get_role_skills",
        lambda title: {"skills": {"essential": ["operate crane"], "optional": []}},
    )

    service.generate_position_skills(db, position.id)

    rows = db.query(PositionSkill).filter_by(position_id=position.id).all()
    assert len(rows) == 2
    assert {row.source for row in rows} == {"ai"}
