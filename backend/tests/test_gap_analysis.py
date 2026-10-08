"""Gap analysis endpoint and Gemini retries."""

import pytest
from google.genai.errors import ServerError

from app.ai import gap_analysis_ai
from app.api.endpoints import employees as employees_endpoint
from app.services import gap_analysis_service


def test_skill_gap_returns_503_when_the_ai_call_fails(client, factory, monkeypatch):
    employee = factory.employee(factory.position())
    monkeypatch.setattr(employees_endpoint, "GEMINI_API_KEY", "test")
    monkeypatch.setattr(gap_analysis_service, "generate_gap_report", lambda **kwargs: None)

    response = client.get(f"/employees/{employee.id}/skill-gap")

    assert response.status_code == 503
    assert "try again" in response.json()["detail"]


class _FakeModels:
    def __init__(self, failures: int):
        self.failures = failures
        self.calls = 0

    def generate_content(self, **kwargs):
        self.calls += 1
        if self.calls <= self.failures:
            raise ServerError(503, {"error": {"code": 503, "message": "high demand", "status": "UNAVAILABLE"}})

        class Response:
            text = '{"readiness_score": 80, "readiness_status": "Ready", "managerial_summary": "Fine."}'

        return Response()


@pytest.fixture
def fake_gemini(monkeypatch):
    def install(failures: int) -> _FakeModels:
        models = _FakeModels(failures)

        class Client:
            def __init__(self, api_key):
                self.models = models

        monkeypatch.setattr(gap_analysis_ai.genai, "Client", Client)
        monkeypatch.setattr(gap_analysis_ai.time, "sleep", lambda seconds: None)
        return models

    return install


def test_gap_report_retries_temporary_server_errors(fake_gemini):
    models = fake_gemini(failures=2)

    report = gap_analysis_ai.generate_gap_report("Engineer", {}, api_key="test")

    assert models.calls == 3
    assert report["readiness_score"] == 80


def test_gap_report_gives_up_after_max_attempts(fake_gemini):
    models = fake_gemini(failures=10)

    report = gap_analysis_ai.generate_gap_report("Engineer", {}, api_key="test")

    assert models.calls == gap_analysis_ai.MAX_ATTEMPTS
    assert report is None
