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
| name | String(100) | Unique | Canonical skill name |
| created_at | DateTime | | |
| updated_at | DateTime | | |

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
| level | Enum(SkillLevel) | | Beginner / Intermediate / Advanced / Expert |
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

## SkillLevel Enum

Defined in `backend/app/models/employee_skill.py`. Used in both `employee_skills` and `position_skills`:

```python
class SkillLevel(str, enum.Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"
    EXPERT = "Expert"
```

The skill comparison service ranks them numerically:
```
Beginner = 1
Intermediate = 2
Advanced = 3
Expert = 4
```

Gemini's perfect profile generator only assigns `Beginner`, `Intermediate`, or `Advanced` to `required_skill_level`. `Expert` can only appear in `employee_skills.level`.

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

---

## Key Constraints

- `employees.email` — Unique. No two employees can share an email.
- `users.employee_id` — Unique. One user account per employee.
- `employee_skills (employee_id, skill_id)` — Unique. An employee cannot have duplicate skill entries.
- `position_skills (position_id, skill_id)` — Unique. A position cannot have duplicate skill requirements.
- `skill_aliases.alias` — Unique. No two aliases can have the same string.

---

## Migrations

Managed with **Alembic**. Configuration in `backend/alembic.ini`.

| Revision | Description |
|---|---|
| `b6b4472c0459` | Initial schema with all base tables |
| `1e2cc2ec63e7` | Makes `department_id` optional on `employees` |
| `f2908fc365d4` | Updates `position_skills` table |

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

## Orphan Skill Cleanup

When a position is deleted or its title changes, the `positions.py` router runs `_delete_position_skills_and_orphan_skills()`. This:

1. Deletes all `PositionSkill` records for the position.
2. For each `Skill` that was referenced only by those deleted rows (and not by any other `PositionSkill`), deletes the `Skill` record itself.

This prevents accumulation of orphaned skills that are no longer required by any position.

---

## Seed Data

The `roles` table requires at least two rows to exist before any user can be created:

```sql
INSERT INTO roles (name, description, created_at, updated_at)
VALUES
  ('HR', 'Human Resources manager', NOW(), NOW()),
  ('Employee', 'Regular employee', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
```

Skill aliases are seeded using the idempotent script:
```bash
cd backend
python app/scripts/seed_skill_aliases.py
```
