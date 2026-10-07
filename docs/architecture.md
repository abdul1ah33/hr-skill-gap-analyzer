# System Architecture

This document describes the complete technical architecture of the AI-Based HR Assisting App.

---

## Overview

The application follows a three-tier architecture:

1. **Presentation Layer** — A React/TypeScript single-page application (SPA) in `my_frontend/`. The older `frontend/` app is legacy and not covered here (see [legacy-frontend.md](legacy-frontend.md)).
2. **Application Layer** — A FastAPI Python backend exposing a REST API.
3. **Data/Intelligence Layer** — PostgreSQL database, ESCO external API, and Google Gemini AI.

The frontend communicates exclusively with the backend via JSON HTTP requests. The backend orchestrates all database access, external API calls, and AI processing.

---

## Architecture Diagram

```
┌────────────────────────────────────────┐
│     my_frontend — React SPA (Vite)      │
│  pages/  →  services/*.ts               │
│  ThemeContext   assessment hooks        │
│  axios (Bearer token from localStorage) │
└────────────────────────────────────────┘
                        │ HTTP/JSON
                        ▼
┌────────────────────────────────────────┐
│            FastAPI Backend               │
│  ┌───────────┐ ┌───────────┐          │
│  │ Routers   │ │ Services  │          │
│  │ /auth     │ │ Gap       │          │
│  │ /employees│ │ PositionSk│          │
│  │ /positions│ │ Comparison│          │
│  │ /skills   │ │ Resume    │          │
│  │ /positionS│ │ ESCO      │          │
│  └───────────┘ └───────────┘          │
│      ┌───────────┐ ┌──────────┐       │
│      │ Schemas   │ │ Models   │       │
│      │ (Pydantic)│ │(SQLAlch) │       │
│      └───────────┘ └──────────┘       │
└────────────────────────────────────────┘
          │                 │
          ▼                 ▼
    ┌──────────┐   ┌───────────────┐
    │PostgreSQL│   │ External APIs   │
    └──────────┘   ├───────────────┤
                    │ ESCO API        │
                    ├───────────────┤
                    │ Google Gemini   │
                    └───────────────┘
```

---

## Frontend Architecture

The frontend (`my_frontend/`) is a React 19 single-page application built with Vite, Tailwind CSS 4 and shadcn/ui. Full details: [frontend.md](frontend.md).

### Entry Point

- `src/main.tsx` — Renders `<App />` inside `<ThemeProvider>`.
- `src/App.tsx` — `<BrowserRouter>` with `/login` public and every other route wrapped in `ProtectedRoute` and `AppLayout`.

### Routing

- **ProtectedRoute** — Redirects to `/login` if there is no `access_token` in `localStorage`. It does not check the role or token expiry.
- **AppLayout** — Sidebar navigation (Dashboard, Employees, Departments, Positions, Gap Analysis, Skills, Settings) and a header; pages render in its `<Outlet />`.
- There is no separate Employee portal; the UI is built for HR users.

### State Management

No global store. Each page fetches what it needs through the service functions on mount and keeps it in local `useState`. Shared state is limited to:

- **`ThemeContext`** — light / dark / system theme, persisted in `localStorage`.
- **Assessment hooks** — `useAssessmentAttempt`, `useAssessmentTimer`, `useAssessmentSecurity` hold the state of a running assessment.

### API Communication

- `src/services/api.ts` — Shared `axios` instance with `baseURL: "http://localhost:8000"`.
- **Request interceptor** — Adds `Authorization: Bearer <access_token>` on every request.
- No response interceptor: a 401 is handled (or not) by the page that made the call.

### Services

One file per backend resource in `src/services/` (`employeeService`, `employeeSkillService`, `departmentService`, `positionService`, `positionSkillService`, `skillService`, `resumeService`, `gapAnalysisService`, `authService`). They send and receive the backend's snake_case JSON directly; types in `src/types/` mirror the backend schemas.

---

## Backend Architecture

The backend is a FastAPI application organized into layers.

### Layer Structure

```
HTTP Request
     │
     ▼
 app/api/endpoints/      ← Route handlers (routers)
     │
     ▼
 app/auth/dependencies.py ← JWT validation, role enforcement
     │
     ▼
 app/schemas/            ← Pydantic validation
     │
     ▼
 app/crud/               ← Database queries
 app/services/           ← Business logic (AI, gap analysis)
     │
     ▼
 app/models/             ← SQLAlchemy ORM models
     │
     ▼
 PostgreSQL
```

### Dependency Injection

- `app/dependencies.py` — `get_db()` generator yields a `SessionLocal` instance and ensures it is closed after the request.
- `app/auth/dependencies.py` — `get_current_user()` decodes JWT; `get_current_hr()` enforces HR role; `get_current_employee()` enforces Employee role and linked employee record.

---

## Request Flow Examples

### List All Employees

```
User opens /employees
     │
     ▼
EmployeesPage (useEffect on mount)
     │
     ▼
employeeService.getEmployees()
     │
     ▼
GET /employees  [axios, Bearer token]
     │
     ▼
FastAPI employees router (app/api/endpoints/employees.py)
     │
     ▼
crud.get_employees(db)
     │
     ▼
SQLAlchemy: SELECT * FROM employees
     │
     ▼
EmployeeResponse (Pydantic serialization)
     │
     ▼
JSON response → setEmployees(data)
     │
     ▼
EmployeesPage renders the table (client-side search filter)
```

### Generate Position Skills (AI)

```
HR creates new Position via POST /positions
     │
     ▼
positions.py: create_position_route()
  create_position(db, position_data)
  background_tasks.add_task(_generate_skills_background, ...)
     │
     ▼
Background task: _generate_skills_background()
     │
     ▼
PositionSkillService.generate_position_skills(db, position_id)
     │
     │ 1. Check if PositionSkill records already exist (cache check)
     │ 2. Call EscoService.get_role_skills(position.title)
     │       a. search_occupation(title) → ESCO API
     │       b. get_skills(uri)          → ESCO API
     │       Returns: {essential: [...], optional: [...]}
     │ 3. Call generate_perfect_profile(title, esco_skills, api_key)
     │       → Google Gemini AI (gemini-3.5-flash-lite)
     │       Returns: PerfectProfile {skills: [TargetSkill, ...]}
     │ 4. For each TargetSkill:
     │       a. Find or create Skill record
     │       b. Create PositionSkill record
     │ 5. db.commit()
     ▼
PositionSkill records stored in PostgreSQL
```

### Skill Gap Analysis

```
HR requests GET /employees/{id}/skill-gap
     │
     ▼
employees.py: employee_skill_gap_route()
     │
     ▼
SkillGapService.generate_employee_gap_analysis(db, employee_id, api_key)
     │
     │ Phase C: SkillComparisonService.compare_employee_to_position()
     │   1. Load employee
     │   2. Load employee's EmployeeSkill records
     │   3. Load position's PositionSkill records
     │   4. Build case-insensitive skill map from employee skills
     │   5. For each position skill:
     │      - Exact name match (case-insensitive, no alias lookup)
     │      - Compare SkillLevel rank
     │      - Categorize as: matched / needs_improvement / unmatched
     │   6. Find additional skills (employee has but not required)
     │   Returns: {matched, needs_improvement, unmatched, additional_skills}
     │
     │ Phase D: generate_gap_report(job_title, skill_diff, api_key)
     │   → Google Gemini AI (gemini-3.5-flash-lite)
     │   Returns: GapAnalysisReport {
     │     readiness_score, readiness_status, managerial_summary,
     │     upskill_pathways, bonus_skills_analysis, core_strengths,
     │     reconciled_skills
     │   }
     │
     │ Reconciliation: skills Gemini matched semantically
     │   (reconciled_skills) are removed from unmatched /
     │   needs_improvement / additional_skills in skill_diff
     ▼
Combined response returned to frontend
```

### Authentication Flow

```
1. LOGIN
   POST /auth/login {login, password}
     │
     ▼
   auth/service.py: login()
     Look up user by username or email
     Verify bcrypt password hash
     Update last_login timestamp
     create_access_token(user_id, role)
     Return {access_token, token_type: "bearer"}
     │
     ▼
   Frontend: LoginPage
     Store token in localStorage under "access_token"
     Navigate to /dashboard

2. AUTHENTICATED REQUEST
   axios request interceptor reads token from localStorage
   Attaches: Authorization: Bearer <token>
     │
     ▼
   FastAPI: OAuth2PasswordBearer extracts token
   auth/dependencies.py: get_current_user()
     decode_access_token() → TokenPayload {user_id, role}
     crud.get_user_by_id(db, user_id)
     Returns User model

3. ROLE ENFORCEMENT
   get_current_hr() → checks user.role.name == "HR"
   get_current_employee() → checks user.role.name == "Employee" AND user.employee_id is not None

4. TOKEN EXPIRY
   Token contains exp claim (default: 60 minutes)
   The frontend does not check exp or handle 401 globally;
   requests fail until the user logs out and logs in again
```

---

## Data Flow: Employee Creation

```
HR fills the form on AddEmployeePage
     │
     ▼
React Hook Form + zodResolver(createEmployeeSchema)
     │
     ▼
employeeService.createEmployee(data)   (snake_case payload)
     │
     ▼
POST /employees/ {first_name, last_name, email, position_id, ...}
     │
     ▼
FastAPI: employees.py create route
  EmployeeCreate schema validation (Pydantic)
     │
     ▼
crud.create_employee(db, employee_schema)
  Generates employee_number (EMP{id:04d})
  db.add / commit / refresh
     │
     ▼
EmployeeResponse (department, position, employee_skills,
                  education, certifications)
     │
     ▼
201 JSON → navigate("/employees")
```

**From a resume instead:** AddEmployeePage → `resumeService.extractResume(file)` → `POST /resume/extract` (multipart) → Gemini parses the resume → employee, skills, education and certifications are created → response `{ employee_id, employee_number, candidate }` → navigate to `/employees/{employee_id}`.

---

## External Services

### ESCO API

- **What it is:** The European Commission's European Skills, Competences, Qualifications and Occupations classification system.
- **Base URL:** `https://ec.europa.eu/esco/api`
- **Why used:** Provides a comprehensive, structured list of occupation skills (essential and optional) for thousands of job titles.
- **What is retrieved:** Occupation search results (by job title), then detailed occupation data including `hasEssentialSkill` and `hasOptionalSkill` link arrays.
- **Where:** `backend/app/services/esco_skills_extractor.py` (`EscoService` class)
- **In-memory caching:** The service caches occupation search results and skill sets for the lifetime of the Python process.
- **Failure handling:** If ESCO returns no results or the request fails, `PositionSkillService` raises a `ValueError` which causes a 400 or 500 HTTP error.

### Google Gemini AI

- **Model:** `gemini-3.5-flash-lite`
- **Why used:** ESCO skills are verbose and contain generic noise. Gemini filters, normalizes, and augments the raw ESCO skill list into a clean structured profile.
- **Three use cases:**
  1. `generate_perfect_profile()` — Produces the required skill profile for a position (filtering ESCO noise, assigning proficiency levels, adding missing industry-standard skills).
  2. `generate_gap_report()` — Takes the deterministic skill diff and generates a human-readable report with readiness score, upskill pathways, timelines.
  3. `parse_resume()` — Extracts structured candidate data from raw resume text.
- **Structured output:** All three functions use Pydantic schemas as `response_schema` in the Gemini config, forcing JSON output that is then validated by Pydantic.
- **Where:** `backend/app/ai/perfect_profile.py`, `backend/app/ai/gap_analysis_ai.py`, `backend/app/ai/resume_parser.py`
- **Failure handling:** API errors, validation errors, and empty responses are caught and return `None`, which propagates as a 500 or 400 HTTP error.

---

## Architectural Decisions

| Decision | Observed Design |
|---|---|
| **Background skill generation** | Position creation triggers skill generation as a FastAPI `BackgroundTask` so the HTTP response is returned immediately without waiting for ESCO + Gemini. |
| **In-memory ESCO cache** | The `EscoService` caches results per Python process to avoid redundant API calls for the same occupation. |
| **Case-insensitive skill matching** | `SkillComparisonService` lowercases all skill names before comparison to avoid false mismatches from capitalization. |
| **Skill-level ranking** | Proficiency levels are ranked numerically (Beginner=1, Intermediate=2, Advanced=3, Expert=4) to enable `>=` comparisons. |
| **Cascading deletes** | Foreign key `ondelete="CASCADE"` on `EmployeeSkill`, `PositionSkill`, `Education`, `Certification` ensures clean removal when parent records are deleted. |
| **Orphan skill cleanup** | When a position is deleted or its title changes, skills that are no longer referenced by any `PositionSkill` row are also deleted. |
| **CRUD layer separation** | Database queries are in `app/crud/`, business logic is in `app/services/`, and HTTP routing is in `app/api/endpoints/`. |
| **Semantic reconciliation by AI** | Exact-name comparison is deterministic; Gemini then lists near-identical skills under different names in `reconciled_skills`, and the service removes them from the gap lists. |
| **Server-side assessment grading** | The planned assessment flow sends questions without answers and grades on the backend (see [assessment.md](assessment.md)). |
