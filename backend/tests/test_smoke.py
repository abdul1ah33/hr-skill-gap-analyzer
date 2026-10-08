import pytest
from sqlalchemy import text

pytestmark = pytest.mark.integration


def test_database_is_migrated_to_head(db):
    version = db.execute(text("SELECT version_num FROM alembic_version")).scalar()
    assert version == "a7c3e91d4b20"


def test_health_endpoint(client):
    assert client.get("/").status_code == 200


def test_factories_create_an_authenticated_employee(client, factory):
    employee = factory.employee()
    user = factory.user("HR", employee)
    response = client.get("/me/profile", headers=factory.auth_headers(user))
    assert response.status_code == 200
