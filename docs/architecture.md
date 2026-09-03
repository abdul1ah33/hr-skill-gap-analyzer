# System Architecture

This document describes the complete technical architecture of the AI-Based HR Assisting App.

---

## Overview

The application follows a three-tier architecture:

1. **Presentation Layer** — A React/TypeScript single-page application (SPA).
2. **Application Layer** — A FastAPI Python backend exposing a REST API.
3. **Data/Intelligence Layer** — PostgreSQL database, ESCO external API, and Google Gemini AI.

The frontend communicates exclusively with the backend via JSON HTTP requests. The backend orchestrates all database access, external API calls, and AI processing.

---

## Architecture Diagram

```
┌────────────────────────────────────────┐
│        React Frontend (SPA)             │
│  ┌─────────┐ ┌────────────┐           │
│  │AuthCtx  │ │useEmployees│           │
│  │(JWT)    │ │  (state)   │           │
│  └─────────┘ └────────────┘           │
│                employeeService.ts       │
│                axios (Bearer token)     │
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

The frontend is a React 19 single-page application built with Vite.

### Entry Point

- `src/main.tsx` — Renders `<App />` into `#root`.
- `src/App.tsx` — Wraps the entire application in `<AuthProvider>` and `<BrowserRouter>`, then defines the route tree.

### Routing

Two protected layout wrappers handle role-based routing:

- **HRLayout** — Available to users with `role === "HR"`. Includes Dashboard, Employees, Departments, Roles/Positions, Skills, Assessment, Recruitment, Analytics, Settings.
- **EmployeeLayout** — Available to users with `role === "Employee"`. Includes Profile and Assessments pages at `/employee/*`.
- **ProtectedRoute** — Component that checks authentication and role before rendering children. Redirects to `/login` if unauthenticated or to the appropriate home if wrong role.

### State Management

The application does not use Redux or Zustand. State is managed through:

- **`AuthContext`** — Global authentication state (token, decoded user, role, login/logout functions). Token is persisted to `localStorage`.
- **`useEmployees` hook** — Central data hook loaded in `HRLayout`. Fetches and manages `employees`, `departments`, `positions`, and `skills`. Provides CRUD action functions. Passes data down as props to pages.
- **Local component state** — Individual pages manage their own UI state (modals, form state, selected items).

### API Communication

- `src/api/axios.ts` — A configured `axios` instance with `baseURL: "http://localhost:8000"`.
- **Request interceptor** — Attaches `Authorization: Bearer <token>` header from `localStorage` on every request.
- **Response interceptor** — On 401 response, clears `localStorage` and redirects to `/login`.

### Services

- `src/services/employeeService.ts` — All CRUD functions for employees, departments, positions, skills, employee skills, and position skills. Includes field-mapping functions that translate between camelCase frontend types and snake_case backend JSON.
- `src/services/skillAliasService.ts` — Skill alias CRUD calls.

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
HRLayout (useEmployees hook)
     │
     ▼
employeeService.getEmployees()
     │
     ▼
GET /employees  [axios, Bearer token]
     │
     ▼
FastAPI employees router (app/api/endpoints/employees.py)
  get_employees_route()
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
JSON response
     │
     ▼
mapEmployeeToFrontend() in employeeService.ts
     │
     ▼
setEmployees(empData) in useEmployees
     │
     ▼
EmployeesPage renders table
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
     │      - Exact name match (case-insensitive)
     │      - Compare SkillLevel rank
     │      - Categorize as: matched / needs_improvement / unmatched
     │   6. Find additional skills (employee has but not required)
     │   Returns: {matched, needs_improvement, unmatched, additional_skills}
     │
     │ Phase D: generate_gap_report(job_title, skill_diff, api_key)
     │   → Google Gemini AI (gemini-3.5-flash-lite)
     │   Returns: GapAnalysisReport {
     │     readiness_score, readiness_status, managerial_summary,
     │     upskill_pathways, bonus_skills_analysis, core_strengths
     │   }
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
   Frontend: AuthContext.login(token)
     Store token in localStorage (both "token" and "access_token" keys)
     Decode JWT payload to extract role
     Redirect HR → /dashboard, Employee → /employee/profile

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
   Frontend AuthContext checks exp on startup
   If expired, clears localStorage before restoring session
   axios response interceptor redirects to /login on 401
```

---

## Data Flow: Employee Creation

```
HR fills EmployeeForm on frontend
     │
     ▼
React Hook Form validates fields (Zod schema)
     │
     ▼
useEmployees.addEmployee(employeeData)
     │
     ▼
employeeService.createEmployee()
  mapEmployeeToBackend() ← converts camelCase to snake_case
     │
     ▼
POST /employees {first_name, last_name, email, position_id, ...}
     │
     ▼
FastAPI: employees.py create_employee_route()
  EmployeeCreate schema validation (Pydantic)
     │
     ▼
crud.create_employee(db, employee_schema)
  Generates employee_number (EMP{id:04d})
  db.add(employee)
  db.commit()
  db.refresh(employee)
     │
     ▼
EmployeeResponse schema serialization
  Includes: department, position, role, employee_skills, education, certifications
     │
     ▼
JSON 201 response
     │
     ▼
Frontend: mapEmployeeToFrontend()
  setEmployees([...employees, newEmployee])
```

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
| **Dual localStorage keys** | The frontend stores the JWT under both `"token"` and `"access_token"` keys — this appears to handle compatibility between different storage conventions used across the codebase. |
