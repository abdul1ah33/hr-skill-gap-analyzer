"""Skill names and aliases are stored in lowercase (plan §A.2)."""
import pytest
from sqlalchemy.exc import IntegrityError

from app.models.skill import Skill
from app.schemas.skill import SkillCreate, SkillUpdate
from app.schemas.skill_alias import SkillAliasCreate
from app.utils.skill_names import normalize_skill_name


@pytest.mark.unit
@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Risk Management", "risk management"),
        ("  risk   MANAGEMENT ", "risk management"),
        ("C#", "c#"),
        ("Node.js", "node.js"),
    ],
)
def test_normalize_skill_name(raw, expected):
    assert normalize_skill_name(raw) == expected


@pytest.mark.unit
def test_schemas_normalize_names():
    assert SkillCreate(name="Risk Management").name == "risk management"
    assert SkillUpdate(name=" SQL ").name == "sql"
    assert SkillUpdate().name is None
    assert SkillAliasCreate(alias="PostgreSQL", skill_id=1).alias == "postgresql"


@pytest.mark.integration
def test_database_rejects_uppercase_skill_names(db):
    db.add(Skill(name="Python"))
    with pytest.raises(IntegrityError):
        db.flush()


@pytest.mark.integration
def test_create_skill_endpoint_stores_lowercase_name(client):
    response = client.post("/skills/", json={"name": "  Risk   Management "})

    assert response.status_code == 201
    assert response.json()["name"] == "risk management"

    duplicate = client.post("/skills/", json={"name": "RISK MANAGEMENT"})
    assert duplicate.status_code == 400


@pytest.mark.integration
def test_update_skill_endpoint_normalizes_name(client, factory):
    skill = factory.skill("old name")

    response = client.put(f"/skills/{skill.id}", json={"name": "New Name"})

    assert response.status_code == 200
    assert response.json()["name"] == "new name"
