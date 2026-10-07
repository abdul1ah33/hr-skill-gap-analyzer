---
# API Documentation

This document describes the REST API endpoints provided by the backend.

Base URL: `http://localhost:8000`

Interactive docs (always up to date): `http://localhost:8000/docs`.

Authentication uses a Bearer JWT from `POST /auth/login`. Unless stated otherwise, routers require the **HR** role. Collection routes are declared with a trailing slash (e.g. `/departments/`); `my_frontend` calls them that way.

---

## Authentication

### `POST /auth/signup`
Creates a user account for an existing employee.
- **Body:** `{ "email": "employee@example.com", "username": "jdoe", "password": "secure123" }`
- **Response:** `201 Created`
- **Errors:** 400 (Account already exists, Username taken, Role not found), 404 (Employee not found).

### `POST /auth/login`
Authenticates a user and returns a JWT.
- **Body:** `{ "login": "employee@example.com", "password": "secure123" }` (Note: `login` accepts email or username)
- **Response:** `{ "access_token": "eyJhbG...", "token_type": "bearer" }`
- **Errors:** 401 (Incorrect credentials).

---

## Current User (Me)

### `GET /me/profile`
Gets the logged-in employee's profile.
- **Headers:** `Authorization: Bearer <token>` (Requires Employee role)
- **Response:** `EmployeeResponse`
- **Errors:** 404 (Employee profile not linked).

### `GET /me/skills`
Gets the logged-in employee's skills.
- **Headers:** `Authorization: Bearer <token>` (Requires Employee role)
- **Response:** `[EmployeeSkillResponse, ...]`

---

## Employees

> **Note:** The current backend code has `# dependencies=[Depends(get_current_hr)]` commented out for employee endpoints, meaning they are temporarily public.

### `GET /employees/count`
Returns `{ "count": <int> }`. Used by the dashboard.

### `GET /employees`
Lists all employees.
- **Response:** `[EmployeeResponse, ...]`

### `POST /employees`
Creates a new employee.
- **Body:** `EmployeeCreate` schema
- **Response:** `201 Created` with `EmployeeResponse`
- **Errors:** 400 (Email/Phone already registered).

### `GET /employees/{id}`
Gets a specific employee by ID.
- **Response:** `EmployeeResponse`
- **Errors:** 404 (Employee not found).

### `PUT /employees/{id}`
Updates an employee.
- **Body:** `EmployeeUpdate` schema (all fields optional)
- **Response:** `EmployeeResponse`
- **Errors:** 404 (Employee not found), 400 (Email/Phone taken).

### `DELETE /employees/{id}`
Deletes an employee.
- **Response:** `204 No Content`
- **Errors:** 404 (Employee not found).

### `GET /employees/{id}/skill-gap`
Generates an AI skill gap analysis for the employee based on their current position. Public for now, like the other `/employees` routes.
- **Response:** 
  ```json
  {
    "employee_id": 1,
    "job_title": "Software Engineer",
    "skill_diff": {
      "matched": [...],
      "needs_improvement": [...],
      "unmatched": [...],
      "additional_skills": [...]
    },
    "gap_analysis": {
      "readiness_score": 85,
      "readiness_status": "Ready",
      "managerial_summary": "...",
      "upskill_pathways": [...],
      "bonus_skills_analysis": [{ "skill": "...", "is_relevant": true, "leverage_evaluation": "..." }],
      "core_strengths": ["..."],
      "reconciled_skills": [
        { "target_skill": "...", "employee_skill": "...", "match_status": "Matched", "justification": "..." }
      ]
    }
  }
  ```
- Skills listed in `reconciled_skills` are removed from `skill_diff.unmatched`, `needs_improvement` and `additional_skills` before the response is returned.
- **Errors:** 404 (Employee/Position not found), 500 (Gemini API error or missing `GEMINI_API_KEY`).

---

## Employee Skills

*Requires HR role.*

### `GET /employees/{employee_id}/skills`
Lists all skills for an employee.

### `POST /employees/{employee_id}/skills`
Adds a skill to an employee.
- **Body:** `{ "skill_id": 1, "level": "Intermediate" }`
- **Errors:** 400 (Skill already assigned), 404.

### `PUT /employees/{employee_id}/skills/{skill_id}`
Updates an employee's skill level.
- **Body:** `{ "level": "Advanced" }`
- **Errors:** 404.

### `DELETE /employees/{employee_id}/skills/{skill_id}`
Removes a skill from an employee.

---

## Positions

*All endpoints require HR role.*

### `GET /positions/count`
Returns `{ "count": <int> }`.

### `GET /positions`
Lists all positions.

### `POST /positions`
Creates a new position and triggers background skill generation.
- **Body:** `PositionCreate` schema
- **Response:** `PositionResponse`

### `GET /positions/{id}`
Gets a specific position.

### `PUT /positions/{id}`
Updates a position. If the `title` changes, automatically deletes old required skills and generates new ones in the background.

### `DELETE /positions/{id}`
Deletes a position and cleans up orphaned skills.

---

## Position Skills

*All endpoints require HR role.*

### `GET /positionSkills/{position_id}/skills`
Lists all required skills for a position.
- **Response:** `[PositionSkillResponse, ...]`

### `POST /positionSkills/{position_id}/skills`
Manually adds a required skill to a position.
- **Body:** `{ "skill_id": 1, "required_skill_level": "Intermediate", "is_essential": true, "short_description": "..." }`

### `PUT /positionSkills/{position_id}/skills/{ps_id}`
Updates a required skill. `ps_id` is the **position-skill row id**, not the skill id.
- **Body:** any of `required_skill_level`, `is_essential`, `short_description`

### `DELETE /positionSkills/{position_id}/skills/{ps_id}`
Removes a required skill from a position (`ps_id` = position-skill row id).

### `POST /positionSkills/{position_id}/generate-skills`
Manually triggers AI skill generation for a position.
- **Response:** `{ "message": "Background task started..." }`

---

## Departments

*All endpoints require HR role.*

- `GET /departments/count` → `{ "count": <int> }`
- `GET /departments`
- `POST /departments`
- `GET /departments/{id}`
- `PUT /departments/{id}`
- `DELETE /departments/{id}`

---

## Skills & Aliases

`/skills` routes are currently **public** (HR dependency commented out). `/skill-aliases` requires HR.

- `GET /skills/count` → `{ "count": <int> }`
- `GET /skills`
- `POST /skills`
- `GET /skills/{id}`
- `PUT /skills/{id}`
- `DELETE /skills/{id}`

### `GET /skill-aliases`
Lists all skill aliases.

### `POST /skill-aliases`
Creates a new alias.
- **Body:** `{ "skill_id": 1, "alias": "ReactJS" }`

### `GET /skill-aliases/{id}`
Gets one alias.

### `GET /skill-aliases/skill/{skill_id}`
Lists the aliases of a skill.

### `DELETE /skill-aliases/{id}`
Deletes an alias.

---

## Resume Parsing

### `POST /resume/extract`
Uploads a resume and automatically creates an employee record.
- **Headers:** `Authorization: Bearer <token>` (Requires HR role)
- **Content-Type:** `multipart/form-data`
- **Body:** `file` (PDF or DOCX)
- **Response:**
  ```json
  { "message": "Employee created successfully", "employee_id": 12, "employee_number": "EMP0012", "candidate": { ... } }
  ```
  `candidate` is the profile Gemini extracted.
- **Errors:** 400 (Invalid file type), 500 (Parsing error).

---

## Assessment

### `POST /assessment/employee/{employee_id}/assess` (legacy)
- **Query:** `position_id` (optional)
- Returns `matched`, `missing`, `needs_improvement`, `match_percentage`, `ai_report`, `employee_data`.
- Imports `backend.app.services.old.assessment_service` and predates the current gap analysis and test-based assessment design. It will be replaced. See [assessment.md](assessment.md).

The new assessment endpoints (start session, get questions, submit answers, get result) are not built yet.
