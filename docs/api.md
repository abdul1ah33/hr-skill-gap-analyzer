---
# API Documentation

This document describes the REST API endpoints provided by the backend.

Base URL: `http://localhost:8000`

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
Generates an AI skill gap analysis for the employee based on their current position.
- **Headers:** `Authorization: Bearer <token>` (Requires HR role)
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
      "bonus_skills_analysis": "...",
      "core_strengths": ["..."]
    }
  }
  ```
- **Errors:** 404 (Employee/Position not found), 500 (Gemini API error).

---

## Employee Skills

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

### `PUT /positionSkills/{position_id}/skills/{skill_id}`
Updates a required skill.

### `DELETE /positionSkills/{position_id}/skills/{skill_id}`
Removes a required skill from a position.

### `POST /positionSkills/{position_id}/generate-skills`
Manually triggers AI skill generation for a position.
- **Response:** `{ "message": "Background task started..." }`

---

## Departments

*All endpoints require HR role.*

- `GET /departments`
- `POST /departments`
- `GET /departments/{id}`
- `PUT /departments/{id}`
- `DELETE /departments/{id}`

---

## Skills & Aliases

*All endpoints require HR role.*

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

### `DELETE /skill-aliases/{id}`
Deletes an alias.

---

## Resume Parsing

### `POST /resume/extract`
Uploads a resume and automatically creates an employee record.
- **Headers:** `Authorization: Bearer <token>` (Requires HR role)
- **Content-Type:** `multipart/form-data`
- **Body:** `file` (PDF or DOCX)
- **Response:** `EmployeeResponse` (with newly created employee)
- **Errors:** 400 (Invalid file type), 500 (Parsing error).
