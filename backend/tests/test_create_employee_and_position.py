"""Creating employees from the form, and positions with or without a department."""
import pytest

from app.api.endpoints import positions as positions_endpoint

pytestmark = pytest.mark.integration


@pytest.fixture(autouse=True)
def no_skill_generation(monkeypatch):
    """Creating a position starts ESCO + Gemini skill generation; not needed here."""
    monkeypatch.setattr(positions_endpoint, "_generate_skills_background", lambda **kwargs: None)


# ─── Employees ───────────────────────────────────────────────────────────────

def test_create_employee_gets_an_employee_number(client, factory, hr_headers):
    position = factory.position()

    response = client.post(
        "/employees/",
        json={"first_name": "Sam", "last_name": "Lee", "email": "sam.lee@example.com", "position_id": position.id},
        headers=hr_headers,
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["employee_number"] == f"EMP{body['id']:04d}"


def test_two_employees_get_different_numbers(client, factory, hr_headers):
    position = factory.position()
    numbers = {
        client.post(
            "/employees/",
            json={"first_name": "A", "last_name": str(n), "email": f"a{n}@example.com", "position_id": position.id},
            headers=hr_headers,
        ).json()["employee_number"]
        for n in range(2)
    }

    assert len(numbers) == 2


# ─── Positions ───────────────────────────────────────────────────────────────

def test_create_position_without_a_department(client, hr_headers):
    response = client.post("/positions/", json={"title": "Port Consultant"}, headers=hr_headers)

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["department_id"] is None
    assert body["department"] is None


def test_create_position_with_explicit_null_department(client, hr_headers):
    response = client.post(
        "/positions/", json={"title": "Port Advisor", "department_id": None}, headers=hr_headers
    )

    assert response.status_code == 201, response.text
    assert response.json()["department_id"] is None


def test_create_position_with_unknown_department_is_404(client, hr_headers):
    response = client.post(
        "/positions/", json={"title": "Port Advisor", "department_id": 999999}, headers=hr_headers
    )

    assert response.status_code == 404


def test_department_can_be_removed_from_a_position(client, factory, hr_headers):
    position = factory.position()
    assert position.department_id is not None

    response = client.put(f"/positions/{position.id}", json={"department_id": None}, headers=hr_headers)

    assert response.status_code == 200, response.text
    assert response.json()["department_id"] is None
