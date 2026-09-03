# Backend Documentation

This document covers the complete backend implementation of the AI-Based HR Assisting App.

See also: [API Reference](api.md) | [Database](database.md) | [AI Analysis](ai-analysis.md)

---

## Directory Structure

```
backend/
├── .env                         # Environment variables (not committed)
├── alembic.ini                  # Alembic migration configuration
├── requirements.txt             # Python dependencies (full lock file)
├── generate_hash_pass.py        # Utility: generate a bcrypt password hash
├── test_skill_alias_system.py   # Test: skill alias matching
├── test_skill_comparison.py     # Test: skill comparison service
├── alembic/
│   ├── env.py                   # Alembic environment configuration
│   └── versions/                # Migration files
└── app/
    ├── main.py                  # FastAPI application entry point
    ├── dependencies.py          # Database session dependency
    ├── auth/                    # Authentication module
    │   ├── router.py
    │   ├── service.py
    │   ├── crud.py
    │   ├── schemas.py
    │   └── dependencies.py
    ├── core/                    # Application core
    │   ├── config.py            # Environment variable loading
    │   ├── security.py          # JWT and password utilities
    │   ├── exceptions.py        # Custom exception classes
    │   ├── exception_handlers.py# FastAPI exception handlers
    │   └── paths.py             # Path helpers
    ├── db/
    │   └── database.py          # SQLAlchemy engine and session
    ├── models/                  # SQLAlchemy ORM models
    │   ├── __init__.py          # Imports all models for Alembic
    │   ├── user.py
    │   ├── role.py
    │   ├── employee.py
    │   ├── department.py
    │   ├── position.py
    │   ├── skill.py
    │   ├── skill_alias.py
    │   ├── employee_skill.py
    │   ├── position_skill.py
    │   ├── education.py
    │   ├── certification.py
    │   ├── assessment.py
    │   ├── assessment_question.py
    │   ├── assessment_answer.py
    │   ├── assessment_result.py
    │   ├── assessment_skill.py
    │   ├── course.py
    │   ├── course_skill.py
    │   └── recommendation.py
    ├── schemas/                 # Pydantic request/response schemas
    │   ├── employee.py
    │   ├── department.py
    │   ├── position.py
    │   ├── skill.py
    │   ├── skill_alias.py
    │   ├── employee_skill.py
    │   └── position_skill.py
    ├── crud/                    # Database CRUD operations
    │   ├── employee.py
    │   ├── department.py
    │   ├── position.py
    │   ├── skill.py
    │   ├── skill_alias.py
    │   ├── employee_skill.py
    │   ├── position_skill.py
    │   └── helpers.py
    ├── api/
    │   └── endpoints/
    │       ├── employees.py
    │       ├── departments.py
    │       ├── positions.py
    │       ├── skills.py
    │       ├── skill_aliases.py
    │       ├── employee_skill.py
    │       ├── position_skill.py
    │       ├── me.py
    │       ├── resume.py
    │       └── assessment.py
    ├── services/                # Business logic
    │   ├── esco_skills_extractor.py
    │   ├── position_skill_service.py
    │   ├── skill_comparison_service.py
    │   ├── gap_analysis_service.py
    │   ├── resume_service.py
    │   └── pdf_extractor.py
    ├── ai/                      # Gemini AI modules
    │   ├── perfect_profile.py
    │   ├── gap_analysis_ai.py
    │   └── resume_parser.py
    └── scripts/
        └── seed_skill_aliases.py
```

---

## app/main.py

The entry point for the FastAPI application.

**Application creation:**
```python
app = FastAPI(
    title="AI-Based HR Assisting App",
    description="REST API for the AI-powered HR assistant.",
    version="1.0.0",
)
```

**Middleware:**
- CORS is configured with `allow_origins=["*"]`, allowing requests from any origin. In production this should be restricted.

**Router registration:**

| Router | Prefix | Tag |
|---|---|---|
| `auth_router` | `/auth` | Authentication |
| `me_router` | `/me` | Me |
| `employee_router` | `/employees` | Employees |
| `department_router` | `/departments` | Departments |
| `position_router` | `/positions` | Positions |
| `skill_router` | `/skills` | Skills |
| `skill_alias_router` | `/skill-aliases` | Skill Aliases |
| `employee_skill_router` | `/employees/{employee_id}/skills` | Employee Skills |
| `position_skill_router` | `/positionSkills` | Position Skills |
| `resume_router` | `/resume` | Resume Import |
| `assessment_router` | `/assessment` | Assessment |

**Health check:**
- `GET /` returns `{"message": "Welcome to the AI HR Assistant API"}`.

---

## app/core/config.py

Loads environment variables using `python-dotenv`:

- `DATABASE_URL` — PostgreSQL connection string.
- `SECRET_KEY` — JWT signing secret.
- `ALGORITHM` — JWT algorithm (e.g., `"HS256"`).
- `ACCESS_TOKEN_EXPIRE_MINUTES` — Defaults to `60`.
- `GEMINI_API_KEY` — Google Gemini API key.

---

## app/core/security.py

Provides cryptography utilities:

- **`hash_password(password)`** — Returns a bcrypt hash using `passlib`.
- **`verify_password(plain_password, hashed_password)`** — Verifies a bcrypt hash.
- **`create_access_token(user_id, role)`** — Creates a JWT with `sub` (user ID), `role`, and `exp` claims.
- **`decode_access_token(token)`** — Decodes and validates a JWT. Returns `TokenPayload(user_id, role)`. Raises `JWTError` on invalid/expired tokens.

---

## app/dependencies.py

Provides the database session dependency:

```python
def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Used via `Depends(get_db)` in every route that requires database access.

---

## app/auth/

### router.py

Two public endpoints:

- `POST /auth/signup` — Creates a user account for an existing employee.
- `POST /auth/login` — Returns a JWT access token.

### service.py

- **`signup(db, signup_data)`** — Validates that the employee exists (by email), that no account exists yet, that the username is unique, looks up the `Employee` role, hashes the password, and creates the `User` record.
- **`login(db, login_data)`** — Looks up user by `login` (can be email or username), verifies the password, updates `last_login`, and returns a `TokenResponse`.

### dependencies.py

- **`get_current_user(token, db)`** — Extracts and validates the Bearer JWT. Returns the `User` model or raises HTTP 401.
- **`get_current_hr(current_user)`** — Requires `user.role.name == "HR"`. Raises HTTP 403 otherwise.
- **`get_current_employee(current_user)`** — Requires `user.role.name == "Employee"` and `user.employee_id is not None`.

---

## app/models/

### Employee (`employees` table)

| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | Auto-increment |
| `employee_number` | String(20) | Unique, format EMP0001 |
| `first_name` | String(100) | Required |
| `last_name` | String(100) | Required |
| `email` | String(100) | Unique, required |
| `phone` | String(20) | Optional, unique |
| `gender` | String(20) | Optional |
| `years_experience` | Integer | Optional |
| `department_id` | FK departments.id | Optional |
| `position_id` | FK positions.id | Required |
| `notes` | Text | Optional |
| `created_at` | DateTime | Auto |
| `updated_at` | DateTime | Auto, onupdate |

Relationships: `department`, `position`, `user` (one-to-one), `employee_skills`, `education`, `certifications`, `assessment_results`, `recommendations`.

Property `role` — returns `user.role` if the user account exists.

### Position (`positions` table)

| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | |
| `title` | String(100) | Required |
| `department_id` | FK departments.id | Optional |
| `description` | Text | Optional |
| `level` | String(50) | Optional (e.g., Senior, Junior) |
| `salary_grade` | String(50) | Optional |
| `created_at` | DateTime | Auto |
| `updated_at` | DateTime | Auto |

Relationships: `department`, `employees`, `position_skills`.

### Skill (`skills` table)

| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | |
| `name` | String(100) | Unique |
| `created_at` | DateTime | Auto |
| `updated_at` | DateTime | Auto |

Relationships: `employee_skills`, `position_skills`, `aliases`.

### SkillAlias (`skill_aliases` table)

| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | |
| `skill_id` | FK skills.id CASCADE | |
| `alias` | String(100) | Unique, indexed |
| `created_at` | DateTime | Auto |
| `updated_at` | DateTime | Auto |

### EmployeeSkill (`employee_skills` table)

| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | |
| `employee_id` | FK employees.id CASCADE | |
| `skill_id` | FK skills.id CASCADE | |
| `level` | Enum(SkillLevel) | Beginner/Intermediate/Advanced/Expert |
| `created_at` | DateTime | Auto |
| `updated_at` | DateTime | Auto |

Unique constraint: `(employee_id, skill_id)`.

### PositionSkill (`position_skills` table)

| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | |
| `position_id` | FK positions.id CASCADE | |
| `skill_id` | FK skills.id CASCADE | |
| `required_skill_level` | Enum(SkillLevel) | Required proficiency |
| `is_essential` | Boolean | True = essential, False = optional |
| `short_description` | Text | Optional |
| `created_at` | DateTime | Auto |
| `updated_at` | DateTime | Auto |

Unique constraint: `(position_id, skill_id)`.

### SkillLevel Enum

Defined in `app/models/employee_skill.py`:
```python
class SkillLevel(str, enum.Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"
    EXPERT = "Expert"
```

---

## app/schemas/

### employee.py

- **`EmployeeBase`** — Common fields: first_name, last_name, email, phone, gender, years_experience, department_id, position_id, notes.
- **`EmployeeCreate`** — Inherits `EmployeeBase`. No additional fields.
- **`EmployeeUpdate`** — All fields optional (partial updates).
- **`EmployeeResponse`** — Full response including `id`, `employee_number`, timestamps, nested `department`, `position`, `role`, `employee_skills`, `education`, `certifications`.

### position_skill.py

- **`PositionSkillCreate`** — `skill_id`, `required_skill_level`, `is_essential`, `short_description`.
- **`PositionSkillUpdate`** — All optional.
- **`PositionSkillResponse`** — Includes `id`, `position_id`, timestamps, nested `skill`.

### auth/schemas.py

- **`SignupRequest`** — `email`, `username`, `password`.
- **`LoginRequest`** — `login` (email or username), `password`.
- **`TokenResponse`** — `access_token`, `token_type`.
- **`TokenPayload`** — `user_id`, `role` (internal, not exposed to clients).

---

## app/services/

### EscoService (`esco_skills_extractor.py`)

Communicates with the ESCO REST API.

**Key methods:**
- `search_occupation(occupation_name)` — Calls `GET /search?text=...&type=occupation&limit=1` and returns the top result. Cached in `occupation_cache`.
- `get_occupation(occupation_uri)` — Calls `GET /resource/occupation?uri=...` for detailed occupation data.
- `get_skills(occupation_uri)` — Extracts `hasEssentialSkill` and `hasOptionalSkill` from occupation details. Cached in `skills_cache`. Returns `{"essential": [...], "optional": [...]}`.
- `get_role_skills(occupation_name)` — Complete pipeline: search → get skills. Returns `{"occupation": ..., "uri": ..., "skills": {essential, optional}}`.
- `clear_cache()` — Clears in-memory caches.

### PositionSkillService (`position_skill_service.py`)

Orchestrates the full pipeline for generating required position skills.

**`generate_position_skills(db, position_id)`:**
1. Load position from database.
2. Return existing `PositionSkill` records immediately if they exist (cache-first).
3. Fetch ESCO skills via `EscoService.get_role_skills(position.title)`.
4. Send ESCO skills to `generate_perfect_profile()` (Gemini AI).
5. For each skill in the `PerfectProfile`: find or create a `Skill` record, create a `PositionSkill` record.
6. Commit to database.

Raises `ValueError` if position is not found, ESCO fails, Gemini fails, or no skills are produced.

### SkillComparisonService (`skill_comparison_service.py`)

Deterministic skill comparison with no external API calls.

**`compare_employee_to_position(db, employee_id)`:**
- Loads employee's skills and the position's required skills.
- Builds a lowercase name map of employee skills.
- For each required skill: checks if employee has it (case-insensitive), compares `SkillLevel` rank.
- Returns a dict with four lists: `matched`, `needs_improvement`, `unmatched`, `additional_skills`.

Each item in the lists is a dict: `{skill, employee_level, required_level, priority}`.

**Proficiency rank:**
```python
LEVEL_RANK = {"Beginner": 1, "Intermediate": 2, "Advanced": 3, "Expert": 4}
```
A skill is `matched` if `employee_rank >= required_rank`, `needs_improvement` if employee has the skill but at a lower level.

### SkillGapService (`gap_analysis_service.py`)

Orchestrates the two-phase gap analysis:

**`generate_employee_gap_analysis(db, employee_id, api_key)`:**
1. Load employee.
2. Get job title from `employee.position.title`.
3. **Phase C:** Call `SkillComparisonService.compare_employee_to_position()`.
4. **Phase D:** Call `generate_gap_report(job_title, skill_diff, api_key)` (Gemini AI).
5. Return combined dict: `{employee_id, job_title, skill_diff, gap_analysis}`.

### ResumeService (`resume_service.py`)

Handles PDF/DOCX resume import.

**`extract_candidate(file_path)`:**
- Reads API key from environment.
- Calls `PDFService.extract_text(file_path)` to get raw text.
- Calls `parse_resume(raw_text, api_key)` (Gemini AI).
- Returns candidate dict.

**`create_employee_from_resume(db, candidate)`:**
1. Find or create a `Position` record from `candidate["position"]`.
2. Create `Employee` record with a temporary number, then update to `EMP{id:04d}`.
3. For each skill: find or create `Skill`, create `EmployeeSkill`.
4. Create `Education` records.
5. Create `Certification` records.
6. Commit to database.
7. If the position was newly created, trigger `PositionSkillService.generate_position_skills()`.

---

## app/ai/

### perfect_profile.py

**`generate_perfect_profile(job_title, esco_skills, api_key, model_name)`:**

Uses Gemini with a structured system instruction that:
1. Filters generic ESCO noise ("use internet", "work in teams").
2. Normalizes skill names to industry standards ("NodeJS" → "Node.js").
3. Infers required proficiency levels based on seniority markers in the job title.
4. Adds missing industry-standard skills not covered by ESCO.

Output: `PerfectProfile {position: str, skills: [TargetSkill, ...]}`

Each `TargetSkill`: `{name: str, target_proficiency: Literal["Beginner","Intermediate","Advanced"], priority: Literal["Essential","Optional"]}`.

Note: `target_proficiency` only supports `Beginner/Intermediate/Advanced` (not `Expert`). `Expert` is only used for `EmployeeSkill.level`.

### gap_analysis_ai.py

**`generate_gap_report(job_title, skill_diff, api_key)`:**

Using `GapAnalysisReport` Pydantic schema as the forced response schema, Gemini produces:

- `readiness_score` — 0–100 integer.
- `readiness_status` — `"Ready"` / `"Needs Upskilling"` / `"Not a Fit"`.
- `managerial_summary` — 2–3 sentence executive summary.
- `upskill_pathways` — List of `UpskillRecommendation` objects, each with `skill`, `gap_type`, `priority`, `tactical_steps` (3 items), `estimated_timeline`, `suggested_resources`.
- `bonus_skills_analysis` — Analysis of the employee's additional skills.
- `core_strengths` — 2–3 bullet points on the employee's strongest matching skills.

### resume_parser.py

**`parse_resume(raw_text, api_key, model_name)`:**

Extracts and normalizes candidate information from raw resume text. Uses `CandidateProfile` as the forced response schema:

- `first_name`, `last_name`, `email`, `phone`, `position` — Basic contact info.
- `years_experience` — Calculated total.
- `education` — List of strings.
- `certifications` — List of strings.
- `skills` — List of `{name, proficiency}` objects.

---

## app/core/exception_handlers.py

Registers custom FastAPI exception handlers for domain-specific exceptions:

| Exception | HTTP Status |
|---|---|
| `EmployeeNotFoundError` | 404 |
| `SkillNotFoundError` | 404 |
| `EmployeeSkillAlreadyExistsError` | 400 |
| `EmployeeSkillNotFoundError` | 404 |
| `PositionNotFoundError` | 404 |
| `PositionSkillNotFoundError` | 404 |
| `PositionSkillAlreadyExistsError` | 400 |

All return `{"detail": str(exc)}` JSON body.

---

## Backend Request Lifecycle

```
HTTP Request arrives at uvicorn
     │
     ▼
FastAPI middleware (CORS)
     │
     ▼
FastAPI Router matches path + method
     │
     ▼
Dependency Injection resolves:
  - get_db() → database session
  - get_current_hr() → validates JWT, checks role
     │
     ▼
Pydantic schema validates request body
     │
     ▼
Route handler function executes
  Calls CRUD function or Service
     │
     ▼
SQLAlchemy executes queries against PostgreSQL
     │
     ▼
Pydantic response_model serializes ORM objects
     │
     ▼
HTTP Response returned
```

**Real example (create employee skill):**

```
POST /employees/5/skills {skill_id: 3, level: "Intermediate"}
     │
     ▼
FastAPI router: employee_skill.py
  add_employee_skill_endpoint(employee_id=5, employee_skill=...)
     │
     ▼
Dependencies: get_db(), get_current_hr()
     │
     ▼
Pydantic: EmployeeSkillCreate validates skill_id, level
     │
     ▼
crud.add_skill_to_employee(db, employee_id=5, employee_skill)
  Check employee exists
  Check skill exists
  Check no duplicate (employee_id, skill_id)
  db.add(EmployeeSkill(...))
  db.commit()
  db.refresh()
     │
     ▼
EmployeeSkillResponse serialized
     │
     ▼
201 JSON response
```

---

## Important Notes

- The `assessment.py` endpoint currently imports from `backend.app.services.old.assessment_service`, which uses an older service path. This may cause import errors.
- The `requirements.txt` is a complete lock file from a conda/venv environment that includes many scientific/ML packages (pandas, scikit-learn, h2o, etc.) that are not directly used by the web application. A slimmer install is possible for pure backend use.
- `echo=True` is set on the SQLAlchemy engine in `database.py`, which logs all SQL queries to stdout. Disable in production.
- CORS is currently configured as `allow_origins=["*"]` which allows any origin. Restrict to the frontend URL in production.
