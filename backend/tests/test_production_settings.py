"""Per-client production settings: HR-only routes, CORS and the connection pool."""
import pytest

from app.core.config import CORS_ORIGINS, DB_MAX_OVERFLOW, DB_POOL_SIZE
from app.db.database import engine

pytestmark = pytest.mark.integration


@pytest.mark.parametrize("path", ["/employees", "/skills/"])
def test_hr_routes_require_a_token(client, path):
    assert client.get(path).status_code == 401


@pytest.mark.parametrize("path", ["/employees", "/skills/"])
def test_hr_routes_reject_employees(client, factory, path):
    employee_user = factory.user("Employee", factory.employee())

    response = client.get(path, headers=factory.auth_headers(employee_user))

    assert response.status_code == 403


@pytest.mark.parametrize("path", ["/employees", "/skills/"])
def test_hr_routes_allow_hr(client, hr_headers, path):
    assert client.get(path, headers=hr_headers).status_code == 200


def test_employee_portal_still_works(client, factory):
    employee_user = factory.user("Employee", factory.employee())

    response = client.get("/me/profile", headers=factory.auth_headers(employee_user))

    assert response.status_code == 200


def test_cors_allows_configured_origin_only(client):
    allowed = CORS_ORIGINS[0]

    response = client.get("/", headers={"Origin": allowed})
    assert response.headers.get("access-control-allow-origin") == allowed

    response = client.get("/", headers={"Origin": "https://evil.example.com"})
    assert "access-control-allow-origin" not in response.headers


def test_engine_uses_configured_pool():
    assert engine.pool.size() == DB_POOL_SIZE
    assert engine.pool._max_overflow == DB_MAX_OVERFLOW
