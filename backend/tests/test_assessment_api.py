"""Assessment API: sessions, answers, grading, profile updates, HR flows (Phase 9)."""
import json
from datetime import datetime, timedelta, timezone

import pytest

from app.models.assessment import Assessment
from app.models.assessment_enums import AssessmentStatus, QuestionOptionType
from app.models.assessment_question import AssessmentQuestion
from app.models.employee_skill import EmployeeSkill, SkillLevel
from app.models.skill_question import SkillQuestionOption

pytestmark = pytest.mark.integration

B, I, A = SkillLevel.BEGINNER, SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED

SESSION = "X-Assessment-Session"


@pytest.fixture
def world(db, factory):
    """
    An employee whose position requires:
      - "sql" (employee has it at Beginner → matched since required Beginner)
      - "docker" (employee doesn't have it → unmatched)
      - "vague skill" (no bank questions → not assessable)
    """
    position = factory.position("Data Engineer")
    employee = factory.employee(position)
    sql = factory.skill("sql")
    docker = factory.skill("docker")
    vague = factory.skill("vague skill")
    factory.position_skill(position, sql, level=B)
    factory.position_skill(position, docker, level=I)
    factory.position_skill(position, vague, level=B)
    factory.bank_questions(sql, beginner=2, intermediate=3, advanced=3)
    factory.bank_questions(docker, beginner=2, intermediate=3, advanced=3)
    factory.employee_skill(employee, sql, B)

    user = factory.user(role="Employee", employee=employee)
    hr = factory.user(role="HR")
    return {
        "employee": employee,
        "user": user,
        "hr": hr,
        "sql": sql,
        "docker": docker,
        "vague": vague,
        "headers": factory.auth_headers(user),
        "hr_headers": factory.auth_headers(hr),
    }


def _start(client, headers) -> dict:
    response = client.post("/assessments", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def _with_session(headers: dict, token: str) -> dict:
    return {**headers, SESSION: token}


def _position_of(db, question_id: int, correct: bool) -> int:
    """1-based position of the correct option (or of a wrong one)."""
    question = db.get(AssessmentQuestion, question_id)
    for position, option_id in enumerate(question.option_order, start=1):
        option = db.get(SkillQuestionOption, option_id)
        if (option.option_type == QuestionOptionType.CORRECT) == correct:
            return position
    raise AssertionError("no matching option")


def _answer_skill(client, db, headers, started: dict, skill_id: int, correct: bool) -> None:
    assessment_id = started["assessment"]["id"]
    skill = next(s for s in started["assessment"]["skills"] if s["skill_id"] == skill_id)
    for question in skill["questions"]:
        response = client.put(
            f"/assessments/{assessment_id}/questions/{question['question_id']}/answer",
            headers=headers,
            json={"option_id": _position_of(db, question["question_id"], correct)},
        )
        assert response.status_code == 200, response.text


# ==========================================
# Preview and start
# ==========================================
def test_preview_lists_assessable_and_skipped_skills(client, world):
    response = client.get("/assessments/preview", headers=world["headers"])

    assert response.status_code == 200
    body = response.json()
    assert [s["skill_name"] for s in body["assessable"]] == ["sql", "docker"]
    assert body["assessable"][0]["category"] == "matched"
    assert body["not_assessable"] == [
        {"skill_id": world["vague"].id, "skill_name": "vague skill", "reason": "no_question_bank"}
    ]
    assert body["total_questions"] == 10
    assert (body["seconds_per_question"], body["max_violations"]) == (60, 3)


def test_hr_preview_for_an_employee(client, world):
    response = client.get(f"/employees/{world['employee'].id}/assessments/preview", headers=world["hr_headers"])

    assert response.status_code == 200
    assert [s["skill_name"] for s in response.json()["assessable"]] == ["sql", "docker"]
    assert client.get("/employees/999999/assessments/preview", headers=world["hr_headers"]).status_code == 404
    assert client.get(
        f"/employees/{world['employee'].id}/assessments/preview", headers=world["headers"]
    ).status_code == 403


def test_start_returns_session_and_safe_questions(client, world):
    body = _start(client, world["headers"])

    assert body["session_token"]
    assessment = body["assessment"]
    assert assessment["status"] == "in_progress"
    assert assessment["administered_by"] == "self"
    assert assessment["config"]["total_questions"] == 10
    assert assessment["remaining_seconds"] > 0
    questions = [q for s in assessment["skills"] for q in s["questions"]]
    assert len(questions) == 10
    assert all([o["id"] for o in q["options"]] == [1, 2, 3, 4, 5, 6] for q in questions)
    assert all(q["selected_option_id"] is None for q in questions)


def test_responses_never_leak_answers(client, db, world):
    started = _start(client, world["headers"])
    headers = _with_session(world["headers"], started["session_token"])
    assessment_id = started["assessment"]["id"]
    question_id = started["assessment"]["skills"][0]["questions"][0]["question_id"]

    responses = [
        started,
        client.get(f"/assessments/{assessment_id}", headers=headers).json(),
        client.put(
            f"/assessments/{assessment_id}/questions/{question_id}/answer",
            headers=headers,
            json={"option_id": _position_of(db, question_id, correct=True)},
        ).json(),
    ]

    text = json.dumps(responses).lower()
    for secret in ("option_type", "explanation", "is_correct", "near_miss", "misconception", "plausible", "correct"):
        assert secret not in text, secret


def test_user_without_employee_cannot_start(client, factory, world):
    hr_headers = world["hr_headers"]  # HR user not linked to an employee

    assert client.get("/assessments/preview", headers=hr_headers).status_code == 403
    assert client.post("/assessments", headers=hr_headers).status_code == 403


def test_no_assessable_skills_returns_reasons(client, factory):
    position = factory.position()
    employee = factory.employee(position)
    factory.position_skill(position, factory.skill("vague skill"))
    headers = factory.auth_headers(factory.user(employee=employee))

    response = client.post("/assessments", headers=headers)

    assert response.status_code == 422
    assert response.json()["code"] == "NO_ASSESSABLE_SKILLS"
    assert response.json()["not_assessable"][0]["reason"] == "no_question_bank"


# ==========================================
# Single open session
# ==========================================
def test_refresh_with_the_same_token_resumes(client, world):
    first = _start(client, world["headers"])

    again = client.post("/assessments", headers=_with_session(world["headers"], first["session_token"]))

    assert again.status_code == 200
    assert again.json()["session_token"] == first["session_token"]
    assert again.json()["assessment"]["skills"] == first["assessment"]["skills"]


def test_second_device_is_rejected_while_session_is_fresh(client, world):
    first = _start(client, world["headers"])
    assessment_id = first["assessment"]["id"]

    response = client.post(f"/assessments/{assessment_id}/session", headers=world["headers"])

    assert response.status_code == 409
    body = response.json()
    assert body["code"] == "ASSESSMENT_OPEN_ELSEWHERE"
    assert body["held_by"] == "employee"
    assert 0 < body["retry_after_seconds"] <= 60

    # Reading questions without the token is refused too
    assert client.get(f"/assessments/{assessment_id}", headers=world["headers"]).status_code == 409


def test_stale_session_can_be_taken_over(client, db, world):
    first = _start(client, world["headers"])
    assessment_id = first["assessment"]["id"]
    assessment = db.get(Assessment, assessment_id)
    assessment.session_last_seen_at = datetime.now(timezone.utc) - timedelta(seconds=61)
    expires_at = assessment.expires_at
    db.flush()

    takeover = client.post(f"/assessments/{assessment_id}/session", headers=world["headers"])
    assert takeover.status_code == 200
    new_token = takeover.json()["session_token"]
    assert new_token != first["session_token"]
    assert db.get(Assessment, assessment_id).expires_at == expires_at  # the clock doesn't move

    old = client.post(
        f"/assessments/{assessment_id}/heartbeat",
        headers=_with_session(world["headers"], first["session_token"]),
    )
    assert old.status_code == 409

    new = client.post(
        f"/assessments/{assessment_id}/heartbeat",
        headers=_with_session(world["headers"], new_token),
    )
    assert new.status_code == 200
    assert new.json()["remaining_seconds"] > 0


# ==========================================
# Answers
# ==========================================
def test_answer_is_saved_replaced_and_shown_on_resume(client, db, world):
    started = _start(client, world["headers"])
    headers = _with_session(world["headers"], started["session_token"])
    assessment_id = started["assessment"]["id"]
    question_id = started["assessment"]["skills"][0]["questions"][0]["question_id"]
    url = f"/assessments/{assessment_id}/questions/{question_id}/answer"

    assert client.put(url, headers=headers, json={"option_id": 2}).json() == {
        "saved": True, "question_id": question_id, "selected_option_id": 2,
    }
    client.put(url, headers=headers, json={"option_id": 5})

    detail = client.get(f"/assessments/{assessment_id}", headers=headers).json()
    assert detail["skills"][0]["questions"][0]["selected_option_id"] == 5


@pytest.mark.parametrize("option_id", [0, 7])
def test_out_of_range_option_is_rejected(client, world, option_id):
    started = _start(client, world["headers"])
    headers = _with_session(world["headers"], started["session_token"])
    assessment_id = started["assessment"]["id"]
    question_id = started["assessment"]["skills"][0]["questions"][0]["question_id"]

    response = client.put(
        f"/assessments/{assessment_id}/questions/{question_id}/answer",
        headers=headers,
        json={"option_id": option_id},
    )
    assert response.status_code == 422


def test_question_from_another_assessment_is_not_found(client, factory, world):
    started = _start(client, world["headers"])
    headers = _with_session(world["headers"], started["session_token"])

    response = client.put(
        f"/assessments/{started['assessment']['id']}/questions/999999/answer",
        headers=headers,
        json={"option_id": 1},
    )
    assert response.status_code == 404


def test_other_employees_get_404(client, factory, world):
    started = _start(client, world["headers"])
    assessment_id = started["assessment"]["id"]
    stranger = factory.auth_headers(factory.user(employee=factory.employee()))

    assert client.get(f"/assessments/{assessment_id}", headers=stranger).status_code == 404
    assert client.get(f"/assessments/{assessment_id}/result", headers=stranger).status_code == 404
    assert client.post(f"/assessments/{assessment_id}/session", headers=stranger).status_code == 404
    response = client.post(
        f"/assessments/{assessment_id}/submit",
        headers=_with_session(stranger, started["session_token"]),
    )
    assert response.status_code == 404


# ==========================================
# Submit, grading and profile application
# ==========================================
def test_submit_grades_and_updates_the_profile(client, db, world):
    started = _start(client, world["headers"])
    headers = _with_session(world["headers"], started["session_token"])
    assessment_id = started["assessment"]["id"]
    _answer_skill(client, db, headers, started, world["sql"].id, correct=True)
    _answer_skill(client, db, headers, started, world["docker"].id, correct=False)

    assert client.get(f"/assessments/{assessment_id}/result", headers=world["headers"]).status_code == 409

    response = client.post(f"/assessments/{assessment_id}/submit", headers=headers)

    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "submitted"
    assert result["employee_id"] == world["employee"].id
    assert result["applied_to_profile"] is True
    assert result["scoring_version"] == "2026-10-08.v1"
    by_skill = {s["skill_name"]: s for s in result["skills"]}
    assert by_skill["sql"] == {
        "skill_id": world["sql"].id, "skill_name": "sql", "category": "matched",
        "claimed_level": "Beginner", "required_level": "Beginner",
        "assessed_level": "Advanced", "correct": 5, "total": 5, "profile_action": "upgraded",
    }
    assert by_skill["docker"]["assessed_level"] is None
    assert by_skill["docker"]["profile_action"] == "no_change"

    sql_row = db.query(EmployeeSkill).filter_by(employee_id=world["employee"].id, skill_id=world["sql"].id).one()
    assert (sql_row.level, sql_row.verified, sql_row.last_assessment_id) == (A, True, assessment_id)
    assert db.query(EmployeeSkill).filter_by(employee_id=world["employee"].id, skill_id=world["docker"].id).first() is None

    # Finished: no more writes, result readable by the employee and HR
    assert client.post(f"/assessments/{assessment_id}/submit", headers=headers).status_code == 409
    question_id = started["assessment"]["skills"][0]["questions"][0]["question_id"]
    late = client.put(
        f"/assessments/{assessment_id}/questions/{question_id}/answer", headers=headers, json={"option_id": 1}
    )
    assert late.status_code == 409
    assert client.get(f"/assessments/{assessment_id}/result", headers=world["hr_headers"]).json() == result
    detail = client.get(f"/assessments/{assessment_id}", headers=world["headers"]).json()
    assert detail["status"] == "submitted"
    assert detail["skills"] == []


def test_failing_an_owned_skill_removes_it_and_passing_a_new_one_creates_it(client, db, world):
    started = _start(client, world["headers"])
    headers = _with_session(world["headers"], started["session_token"])
    assessment_id = started["assessment"]["id"]
    _answer_skill(client, db, headers, started, world["sql"].id, correct=False)
    _answer_skill(client, db, headers, started, world["docker"].id, correct=True)

    result = client.post(f"/assessments/{assessment_id}/submit", headers=headers).json()

    actions = {s["skill_name"]: s["profile_action"] for s in result["skills"]}
    assert actions == {"sql": "removed", "docker": "created"}
    rows = {
        row.skill_id: row
        for row in db.query(EmployeeSkill).filter_by(employee_id=world["employee"].id)
    }
    assert world["sql"].id not in rows
    assert (rows[world["docker"].id].level, rows[world["docker"].id].verified) == (A, True)


def test_unanswered_questions_count_as_wrong(client, world):
    started = _start(client, world["headers"])
    headers = _with_session(world["headers"], started["session_token"])

    result = client.post(f"/assessments/{started['assessment']['id']}/submit", headers=headers).json()

    assert all(s["correct"] == 0 and s["assessed_level"] is None for s in result["skills"])


def test_too_many_violations_terminate_without_changing_the_profile(client, db, world):
    started = _start(client, world["headers"])
    headers = _with_session(world["headers"], started["session_token"])
    assessment_id = started["assessment"]["id"]
    url = f"/assessments/{assessment_id}/violations"

    first = client.post(url, headers=headers, json={"reason": "tab_hidden"}).json()
    client.post(url, headers=headers, json={"reason": "window_blur"})
    third = client.post(url, headers=headers, json={"reason": "fullscreen_exit"}).json()

    assert first == {"violation_count": 1, "max_violations": 3, "terminated": False}
    assert third == {"violation_count": 3, "max_violations": 3, "terminated": True}
    result = client.get(f"/assessments/{assessment_id}/result", headers=world["headers"]).json()
    assert result["status"] == "terminated"
    assert result["applied_to_profile"] is False
    assert {s["profile_action"] for s in result["skills"]} == {"not_applied"}
    sql_row = db.query(EmployeeSkill).filter_by(employee_id=world["employee"].id, skill_id=world["sql"].id).one()
    assert (sql_row.level, sql_row.verified) == (B, False)


def test_unknown_violation_reason_is_rejected(client, world):
    started = _start(client, world["headers"])
    headers = _with_session(world["headers"], started["session_token"])

    response = client.post(
        f"/assessments/{started['assessment']['id']}/violations", headers=headers, json={"reason": "other"}
    )
    assert response.status_code == 422


def test_expired_assessment_is_graded_and_applied(client, db, world):
    started = _start(client, world["headers"])
    headers = _with_session(world["headers"], started["session_token"])
    assessment_id = started["assessment"]["id"]
    _answer_skill(client, db, headers, started, world["docker"].id, correct=True)
    assessment = db.get(Assessment, assessment_id)
    assessment.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.flush()

    question_id = started["assessment"]["skills"][0]["questions"][0]["question_id"]
    late = client.put(
        f"/assessments/{assessment_id}/questions/{question_id}/answer", headers=headers, json={"option_id": 1}
    )

    assert late.status_code == 409
    assert late.json()["code"] == "ASSESSMENT_EXPIRED"
    result = client.get(f"/assessments/{assessment_id}/result", headers=world["headers"]).json()
    assert result["status"] == "expired"
    assert result["applied_to_profile"] is True
    actions = {s["skill_name"]: s["profile_action"] for s in result["skills"]}
    assert actions == {"sql": "removed", "docker": "created"}


# ==========================================
# History
# ==========================================
def test_my_assessments(client, world):
    started = _start(client, world["headers"])

    history = client.get("/assessments", headers=world["headers"]).json()

    assert [(h["id"], h["status"], h["skill_count"]) for h in history] == [
        (started["assessment"]["id"], "in_progress", 2)
    ]


# ==========================================
# HR
# ==========================================
def test_hr_assigns_lists_and_cancels(client, world):
    url = f"/employees/{world['employee'].id}/assessments"

    assigned = client.post(url, headers=world["hr_headers"], json={"due_at": "2026-12-01T00:00:00Z"})
    assert assigned.status_code == 201
    assert assigned.json()["status"] == "assigned"
    assert assigned.json()["skill_count"] == 0

    again = client.post(url, headers=world["hr_headers"])
    assert again.status_code == 409
    assert again.json()["code"] == "ACTIVE_ASSESSMENT_EXISTS"

    assert [a["status"] for a in client.get(url, headers=world["hr_headers"]).json()] == ["assigned"]

    assessment_id = assigned.json()["id"]
    cancelled = client.delete(f"{url}/{assessment_id}", headers=world["hr_headers"])
    assert cancelled.json()["status"] == "cancelled"
    assert client.delete(f"{url}/{assessment_id}", headers=world["hr_headers"]).status_code == 409


def test_employee_starts_an_assigned_assessment(client, world):
    url = f"/employees/{world['employee'].id}/assessments"
    assigned = client.post(url, headers=world["hr_headers"]).json()

    started = _start(client, world["headers"])

    assert started["assessment"]["id"] == assigned["id"]
    assert started["assessment"]["assigned_at"] is not None


def test_hr_runs_the_assessment_on_behalf_and_blocks_the_employee(client, db, world):
    url = f"/employees/{world['employee'].id}/assessments"
    assessment_id = client.post(url, headers=world["hr_headers"]).json()["id"]

    started = client.post(f"{url}/{assessment_id}/start", headers=world["hr_headers"])
    assert started.status_code == 200, started.text
    started = started.json()
    assert started["assessment"]["administered_by"] == "hr_on_behalf"

    # The employee can't open it at the same time
    blocked = client.post(f"/assessments/{assessment_id}/session", headers=world["headers"])
    assert blocked.status_code == 409
    assert blocked.json()["held_by"] == "hr"

    hr_session = _with_session(world["hr_headers"], started["session_token"])
    _answer_skill(client, db, hr_session, started, world["docker"].id, correct=True)
    result = client.post(f"/assessments/{assessment_id}/submit", headers=hr_session).json()

    assert result["administered_by"] == "hr_on_behalf"
    assert {s["skill_name"]: s["assessed_level"] for s in result["skills"]}["docker"] == "Advanced"


def test_hr_start_needs_the_active_assessment_id(client, world):
    url = f"/employees/{world['employee'].id}/assessments"

    response = client.post(f"{url}/12345/start", headers=world["hr_headers"])

    assert response.status_code == 404


def test_hr_routes_are_forbidden_for_employees(client, world):
    url = f"/employees/{world['employee'].id}/assessments"

    assert client.get(url, headers=world["headers"]).status_code == 403
    assert client.post(url, headers=world["headers"]).status_code == 403
    assert client.get("/question-bank/skills", headers=world["headers"]).status_code == 403


def test_question_bank_coverage(client, world):
    coverage = client.get("/question-bank/skills", headers=world["hr_headers"]).json()

    assert {c["skill_name"]: (c["beginner"], c["intermediate"], c["advanced"], c["assessable"]) for c in coverage} == {
        "docker": (2, 3, 3, True),
        "sql": (2, 3, 3, True),
    }


def test_requires_login(client):
    assert client.get("/assessments").status_code == 401
