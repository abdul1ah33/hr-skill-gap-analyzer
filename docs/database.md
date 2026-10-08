---
# Database Documentation

This document covers the database schema, relationships, and migration setup.

See also: [Backend Documentation](backend.md) | [Architecture](architecture.md)

---

## Database Technology

| Component | Technology |
|---|---|
| Database | PostgreSQL 14+ |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Connection driver | `psycopg` |
| Connection string format | `postgresql+psycopg://user:password@host:port/dbname` |

---

## Tables

### `roles`

| Column | Type | Key | Description |
|---|---|---|---|
| id | Integer | PK | Auto-increment |
| name | String(50) | Unique | `"HR"` or `"Employee"` |
| description | Text | | Optional |
| created_at | DateTime | | |
| updated_at | DateTime | | |

### `users`

| Column | Type | Key | Description |
|---|---|---|---|
| id | Integer | PK | |
| username | String(50) | Unique | Login username |
| email | String(100) | Unique | Login email |
| password_hash | String(255) | | bcrypt hash |
| role_id | Integer | FK roles.id | |
| employee_id | Integer | FK employees.id, Unique, Nullable | Link to employee record |
| last_login | DateTime | | |
| created_at | DateTime | | |
| updated_at | DateTime | | |

### `departments`

| Column | Type | Key | Description |
|---|---|---|---|
| id | Integer | PK | |
| name | String(100) | Unique | |
| description | Text | | |
| created_at | DateTime | | |
| updated_at | DateTime | | |

### `positions`

| Column | Type | Key | Description |
|---|---|---|---|
| id | Integer | PK | |
| title | String(100) | | Used for ESCO occupation lookup |
| department_id | Integer | FK departments.id, Nullable | Optional |
| description | Text | | Optional |
| level | String(50) | | e.g., Junior, Senior |
| salary_grade | String(50) | | |
| created_at | DateTime | | |
| updated_at | DateTime | | |

### `employees`

| Column | Type | Key | Description |
|---|---|---|---|
| id | Integer | PK | |
| employee_number | String(20) | Unique | Format: `EMP0001` |
| first_name | String(100) | | Required |
| last_name | String(100) | | Required |
| email | String(100) | Unique | Required |
| phone | String(20) | Unique, Nullable | |
| gender | String(20) | | Optional |
| years_experience | Integer | | Optional |
| department_id | Integer | FK departments.id, Nullable | Optional |
| position_id | Integer | FK positions.id | Required |
| notes | Text | | Optional (used for certifications text in resume import) |
| created_at | DateTime | | |
| updated_at | DateTime | | |

### `skills`

| Column | Type | Key | Description |
|---|---|---|---|
| id | Integer | PK | |
| name | String(100) | Unique | Canonical skill name, always lowercase (`CHECK (name = lower(name))`) |
| created_at | DateTime | | |
| updated_at | DateTime | | |

Names are normalised with `app/utils/skill_names.normalize_skill_name` (trim, single spaces, lowercase) everywhere they are written, so lookups use plain equality. Aliases are stored the same way.

### `skill_aliases`

| Column | Type | Key | Description |
|---|---|---|---|
| id | Integer | PK | |
| skill_id | Integer | FK skills.id CASCADE | |
| alias | String(100) | Unique, Indexed | Alternate name |
| created_at | DateTime | | |
| updated_at | DateTime | | |

When a `Skill` is deleted, all its `SkillAlias` records are deleted automatically (CASCADE).

### `employee_skills`

| Column | Type | Key | Description |
|---|---|---|---|
| id | Integer | PK | |
| employee_id | Integer | FK employees.id CASCADE | |
| skill_id | Integer | FK skills.id CASCADE | |
| level | Enum(SkillLevel) | | Beginner / Intermediate / Advanced |
| verified | Boolean | | True when the level was set by a graded skill assessment; reset to false when the level is edited by hand |
| last_assessed_at | DateTime(tz) | | When the last assessment set this level |
| last_assessment_id | Integer | FK assessments.id SET NULL | The assessment that set this level |
| created_at | DateTime | | |
| updated_at | DateTime | | |

Unique constraint: `(employee_id, skill_id)` — one record per skill per employee.

### `position_skills`

| Column | Type | Key | Description |
|---|---|---|---|
| id | Integer | PK | |
| position_id | Integer | FK positions.id CASCADE | |
| skill_id | Integer | FK skills.id CASCADE | |
| required_skill_level | Enum(SkillLevel) | | Minimum required proficiency |
| is_essential | Boolean | | True = essential, False = optional |
| short_description | Text | | Optional |
| created_at | DateTime | | |
| updated_at | DateTime | | |

Unique constraint: `(position_id, skill_id)` — one record per skill per position.

### `education`

| Column | Type | Key | Description |
|---|---|---|---|
| id | Integer | PK | |
| employee_id | Integer | FK employees.id CASCADE | |
| description | String(255) | | Free-text. E.g., "B.S. Computer Science, MIT (2020)" |

Note: Only a single `description` string is stored per record. There are no separate degree type or institution fields.

### `certifications`

| Column | Type | Key | Description |
|---|---|---|---|
| id | Integer | PK | |
| employee_id | Integer | FK employees.id CASCADE | |
| name | String(255) | | Certification name |

---

### Question bank tables

Filled by `python -m app.scripts.import_question_bank` from `backend/app/data/question_bank/`. Rows are never deleted: a changed question gets a new row and the old one is deactivated, so past assessments always point to what the employee saw.

**`skill_questions`**

| Column | Type | Key | Description |
|---|---|---|---|
| id | Integer | PK | |
| skill_id | Integer | FK skills.id RESTRICT | |
| question_text | Text | | |
| proficiency_level | Enum(SkillLevel) | | Beginner / Intermediate / Advanced |
| content_hash | String(64) | Unique | SHA-256 of skill, level, question, options and explanations; makes imports idempotent |
| is_active | Boolean | | Inactive questions are never picked again |
| source | String(100) | | `curated` or `generated:<model>` |
| created_at, updated_at | DateTime(tz) | | |

Index `(skill_id, proficiency_level, is_active)`.

**`skill_question_options`**: `question_id` (FK CASCADE), `text`, `option_type` (`correct`, `near_miss`, `misconception`, `plausible_wrong_1..3`), `explanation`. Unique `(question_id, option_type)`, so every question has exactly one correct option. The importer enforces exactly six options.

### Assessment tables

One row in `assessments` per attempt; see [assessment.md](assessment.md) for the flow.

**`assessments`**

| Column | Type | Description |
|---|---|---|
| employee_id | FK employees.id CASCADE | |
| position_id, position_title | FK positions.id SET NULL, String | Snapshot of the position when the test started |
| status | Enum `assessmentstatus` | `assigned`, `in_progress`, `submitted`, `expired`, `terminated`, `cancelled` |
| administered_by | Enum `assessmentadministration` | `self` or `hr_on_behalf` |
| assigned_by_user_id, assigned_at, due_at | FK users SET NULL, DateTime(tz) | Set when HR assigns the test |
| started_by_user_id, started_at, expires_at, submitted_at | FK users SET NULL, DateTime(tz) | `expires_at` = start + questions × seconds + grace; never moves |
| seconds_per_question, max_violations | Integer | Config snapshot |
| violation_count | Integer | |
| session_token_hash, session_user_id, session_last_seen_at | String(64), FK users SET NULL, DateTime(tz) | The single open session (SHA-256 of the token, holder, last heartbeat) |
| applied_to_profile | Boolean | False for terminated attempts |
| scoring_version | String(30) | Scoring table version used to grade |

Partial unique index `uq_assessments_one_active_per_employee` on `(employee_id) WHERE status IN ('ASSIGNED', 'IN_PROGRESS')`: at most one assigned or running test per employee.

**`assessment_skills`**: one row per tested skill. `assessment_id` (CASCADE), `skill_id` (RESTRICT), `display_order`, snapshot of the gap analysis (`category` matched / needs_improvement / unmatched, `is_essential`, `claimed_level`, `required_level`), and after grading `beginner_correct`, `intermediate_correct`, `advanced_correct`, `total_correct`, `assessed_level` (null = no proficiency), `graded_at`, `profile_action` (`confirmed`, `upgraded`, `downgraded`, `created`, `removed`, `no_change`, `not_applied`). Unique `(assessment_id, skill_id)` and `(assessment_id, display_order)`.

**`assessment_questions`**: one row per served question. `assessment_id` (CASCADE), `assessment_skill_id` (CASCADE), `skill_question_id` (RESTRICT), `display_order`, `proficiency_level`, `option_order` (JSONB list of bank option ids in the shown order), `selected_option_id` (RESTRICT), `selected_option_type`, `is_correct`, `answered_at`. Unique `(assessment_id, display_order)` and `(assessment_id, skill_question_id)`.

### Learning tables (defined, not yet used by the app)

| Table | Main columns |
|---|---|
| `courses` | title, provider, url, difficulty, estimated_hours, description |
| `course_skills` | course_id, skill_id |
| `recommendations` | employee_id, course_id, reason, priority, status, recommended_on, completed_on |

---

## SkillLevel Enum

Defined in `backend/app/models/employee_skill.py`. Used by `employee_skills`, `position_skills`, `skill_questions`, `assessment_skills` and `assessment_questions`:

```python
class SkillLevel(str, enum.Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"
```

`Expert` was removed by migration `a7c3e91d4b20` (the question bank can't test it). The skill comparison service ranks levels Beginner = 1, Intermediate = 2, Advanced = 3.

---

## Relationships

| From | To | Type | Cascade |
|---|---|---|---|
| Role | User | One-to-many | No |
| User | Employee | One-to-one (optional) | No |
| Department | Position | One-to-many | No |
| Department | Employee | One-to-many | No |
| Position | Employee | One-to-many | No |
| Employee | EmployeeSkill | One-to-many | DELETE |
| Skill | EmployeeSkill | One-to-many | DELETE |
| Employee | Education | One-to-many | DELETE |
| Employee | Certification | One-to-many | DELETE |
| Position | PositionSkill | One-to-many | DELETE |
| Skill | PositionSkill | One-to-many | DELETE |
| Skill | SkillAlias | One-to-many | DELETE |
| Skill | SkillQuestion | One-to-many | RESTRICT (a skill with questions can't be deleted) |
| SkillQuestion | SkillQuestionOption | One-to-many | DELETE |
| Employee | Assessment | One-to-many | DELETE |
| Assessment | AssessmentSkill, AssessmentQuestion | One-to-many | DELETE |

---

## Key Constraints

- `employees.email` — Unique. No two employees can share an email.
- `users.employee_id` — Unique. One user account per employee.
- `employee_skills (employee_id, skill_id)` — Unique. An employee cannot have duplicate skill entries.
- `position_skills (position_id, skill_id)` — Unique. A position cannot have duplicate skill requirements.
- `skill_aliases.alias` — Unique. No two aliases can have the same string.
- `skills.name` — Unique and lowercase (`CHECK (name = lower(name))`).
- `skill_questions.content_hash` — Unique; `skill_question_options (question_id, option_type)` — Unique.
- `assessments (employee_id)` where status is assigned or in progress — Unique (one active test per employee).

---

## Migrations

Managed with **Alembic**. Configuration in `backend/alembic.ini`.

| Revision | Description |
|---|---|
| `b6b4472c0459` | Initial schema with all base tables |
| `1e2cc2ec63e7` | Makes `department_id` optional on `employees` |
| `f2908fc365d4` | Updates `position_skills` table |
| `a7c3e91d4b20` | Skill assessment system: drops the unused old assessment tables, removes `Expert`, lowercases skill names and aliases (aborts on collisions), adds the question bank and assessment tables and the `employee_skills` verification columns |

```bash
# Apply all migrations
cd backend
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "describe change"
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# Check current state
alembic current
alembic history
```

---

## Deleting Positions and Skills

Deleting a position, or changing its title (which regenerates its skills), deletes only its `PositionSkill` rows. `Skill` rows are never deleted automatically: they are shared with employees, the question bank and assessment history. `DELETE /skills/{id}` returns 409 when the skill has bank questions or assessment history.

---

## Seed Data

Run from `backend/` after `alembic upgrade head` (all scripts are safe to run repeatedly):

```bash
python -m app.scripts.seed_roles               # HR and Employee roles (required)
python app/scripts/seed_skill_aliases.py       # skill aliases (optional)
python -m app.scripts.import_question_bank     # assessment questions (required for assessments)
python -m app.scripts.seed_assessment_demo     # demo positions, employees and logins (optional)
```
