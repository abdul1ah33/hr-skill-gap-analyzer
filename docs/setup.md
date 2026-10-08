# Setup Guide

This guide walks a new developer through cloning the repository, installing all dependencies, configuring the environment, setting up the database, and running the application.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.10+ | Confirm with `python --version` |
| Node.js | 20+ | Confirm with `node --version` |
| npm | 10+ | Confirm with `npm --version` |
| PostgreSQL | 14+ | Must be running locally |
| Git | Any | For cloning |

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd hr-skill-gap-analyzer
```

---

## 2. Backend Setup

### Create and activate a virtual environment

```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Windows (cmd)
.venv\Scripts\activate.bat

# Linux / macOS
source .venv/bin/activate
```

### Install Python dependencies

The `requirements.txt` is a comprehensive lock file. Install with:

```bash
pip install -r requirements.txt
```

If you want a minimal install instead (the lock file includes many ML/notebook packages that may not all be required for the web app):

```bash
pip install fastapi uvicorn sqlalchemy psycopg alembic \
    python-jose[cryptography] passlib[bcrypt] python-dotenv \
    pydantic[email] requests google-genai \
    python-multipart pymupdf
```

---

## 3. Environment Variables

Create the file `backend/.env` with the following content.

> **Security warning:** This file contains secrets. Do **not** commit it to version control.

```env
DATABASE_URL=postgresql+psycopg://postgres:<your-db-password>@localhost:5432/ai_hr_assistant
SECRET_KEY=<generate-a-long-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GEMINI_API_KEY=<your-google-gemini-api-key>
```

### Environment variable reference

| Variable | Required | Purpose | Example |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (SQLAlchemy format) | `postgresql+psycopg://user:pass@localhost:5432/ai_hr_assistant` |
| `SECRET_KEY` | Yes | HMAC secret for JWT signing. Use a long random string. | `openssl rand -hex 32` |
| `ALGORITHM` | Yes | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | JWT expiry in minutes. Defaults to 60. | `60` |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI features | Get from [Google AI Studio](https://aistudio.google.com) |
| `ASSESSMENT_MAX_SKILLS` | No | Maximum skills tested in one skill assessment (5 questions each). Defaults to 8. | `8` |
| `ASSESSMENT_SECONDS_PER_QUESTION` | No | Time per assessment question. The server deadline is questions × seconds + grace. Defaults to 60. | `60` |
| `ASSESSMENT_GRACE_SECONDS` | No | Extra seconds added to the assessment deadline. Defaults to 120. | `120` |
| `ASSESSMENT_MAX_VIOLATIONS` | No | Tab switches / fullscreen exits allowed before an assessment is terminated. Defaults to 3. | `3` |
| `ASSESSMENT_SESSION_TIMEOUT_SECONDS` | No | An assessment session idle this long can be taken over by another device or user. Defaults to 60. | `60` |

### Generate a SECRET_KEY

```bash
# Linux/macOS
openssl rand -hex 32

# Python (cross-platform)
python -c "import secrets; print(secrets.token_hex(32))"
```

### Get a GEMINI_API_KEY

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create an API key.
3. Paste it as the value of `GEMINI_API_KEY`.

> **Note:** Without `GEMINI_API_KEY`, the following features will fail with HTTP 500:
> - Automatic position skill generation
> - Skill gap analysis AI report
> - Resume import

---

## 4. Database Setup

### Create the PostgreSQL database

```sql
-- Using psql:
CREATE DATABASE ai_hr_assistant;
```

Or using the CLI:

```bash
createdb ai_hr_assistant
```

### Run Alembic migrations

From inside the `backend/` directory (with `.venv` activated):

```bash
alembic upgrade head
```

This applies all migration files located in `backend/alembic/versions/`:

| Migration | Description |
|---|---|
| `b6b4472c0459_initial_clean_schema.py` | Creates all base tables |
| `1e2cc2ec63e7_make_department_optional.py` | Makes department optional on Employee |
| `f2908fc365d4_update_position_skills.py` | Updates position_skills table |
| `a7c3e91d4b20_skill_assessment_system.py` | Skill assessment tables and question bank; removes `Expert` level; stores skill names in lowercase |

### Seed skill aliases (optional but recommended)

The application ships with a seed script that creates canonical skills and hundreds of aliases across multiple domains (tech, HR, finance, healthcare, engineering, etc.):

```bash
# From inside backend/
python app/scripts/seed_skill_aliases.py
```

This is idempotent — running it multiple times is safe.

### Seed roles (required)

The authentication system requires `HR` and `Employee` role records to exist in the `roles` table. Create them with the seed script (safe to run repeatedly):

```bash
# From inside backend/
python -m app.scripts.seed_roles
```

> **Note:** Without role records, all signup attempts will raise a `ValueError: Employee role not found.`

### Import the question bank (required for skill assessments)

Loads the assessment questions from `app/data/question_bank/` (the curated bank and everything under `generated/`) into the database. Missing skills are created. Safe to run repeatedly: unchanged questions are skipped, and questions removed from a file are deactivated, not deleted.

```bash
# From inside backend/
python -m app.scripts.import_question_bank --dry-run   # validate and report only
python -m app.scripts.import_question_bank
```

Options: `--strict` aborts on the first invalid question; `--report file.json` writes the full report (rejected questions with file, line and reason).

### Create the first HR user

The signup endpoint (`POST /auth/signup`) is for employees (people who already exist as `Employee` records) to create their own account. To bootstrap the first HR user, insert directly:

```bash
# Generate a bcrypt password hash:
python backend/generate_hash_pass.py
```

Then insert the user in PostgreSQL:

```sql
INSERT INTO users (username, email, password_hash, role_id, created_at, updated_at)
SELECT 'admin', 'admin@company.com', '<bcrypt-hash-here>', id, NOW(), NOW()
FROM roles WHERE name = 'HR';
```

---

## 5. Run the Backend

From inside `backend/` with `.venv` activated:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- `--reload` — auto-restarts on file changes (development only).
- The API will be available at `http://localhost:8000`.
- Swagger interactive docs at `http://localhost:8000/docs`.

---

## 6. Frontend Setup

The main frontend is `my_frontend/`. (The `frontend/` folder is a legacy app kept for reference; don't use it.)

```bash
cd my_frontend
npm install
```

The frontend has no `.env` file requirement. The backend URL is hard-coded in `src/services/api.ts` as `http://localhost:8000`. If you need to change it, edit that file.

```bash
npm run dev
```

The frontend will start at `http://localhost:5173`. Log in with the HR user you created in step 4.

---

## 7. Running Both Services

You need two terminal windows:

**Terminal 1 (backend):**
```bash
cd backend
.venv\Scripts\activate   # or source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 (frontend):**
```bash
cd my_frontend
npm run dev
```

---

## 8. Verification

| Check | How |
|---|---|
| Backend is running | `GET http://localhost:8000/` should return `{"message": "Welcome to the AI HR Assistant API"}` |
| Swagger docs | Open `http://localhost:8000/docs` in a browser |
| Frontend is running | Open `http://localhost:5173` in a browser |
| Database connected | `alembic upgrade head` completed without errors |
| GEMINI_API_KEY works | Create a position and check backend logs; position skill generation should not error |

---

## 9. Running Backend Tests

Tests use a separate PostgreSQL database. By default it is your `DATABASE_URL` database name with a `_test` suffix (for example `ai_hr_assistant_test`); set `TEST_DATABASE_URL` in `.env` to use another one. The database user needs permission to create databases.

```bash
# From inside backend/
pip install -r requirements.txt   # includes pytest
python -m pytest
```

Each run drops and recreates the test database, applies all Alembic migrations, and rolls back every test's changes. The development database is never touched (the test setup refuses to run if both URLs point at the same database).

---

## Common Setup Problems

### `ModuleNotFoundError: No module named 'app'`

You are running uvicorn from the wrong directory. Always run from inside `backend/`:

```bash
cd backend
uvicorn app.main:app --reload
```

### `psycopg.OperationalError: could not connect to server`

- Ensure PostgreSQL is running: `pg_ctl status` or check Services on Windows.
- Verify the `DATABASE_URL` in `.env` has the correct host, port, username, and password.

### `jose.exceptions.JWTError: Signature verification failed`

The `SECRET_KEY` in `.env` does not match the key that signed the token. Make sure `SECRET_KEY` is consistent and not changed while users are logged in.

### `ValueError: Employee role not found.`

The `roles` table does not have an `"Employee"` row. Run `python -m app.scripts.seed_roles`.

### `HTTPException: 500 Gemini API key is not configured`

The `GEMINI_API_KEY` is missing from `.env`. Add a valid key.

### ESCO API unreachable (position skill generation fails)

The backend calls `https://ec.europa.eu/esco/api`. If you are behind a firewall or the ESCO API is temporarily unavailable, position skill generation will fail. Manually add position skills via `POST /positionSkills/{id}/skills` as a workaround.

### Frontend pages are empty or show errors

`my_frontend` has no mock-data fallback (except the assessment pages, which use mock data by design). Check that the backend is running on port 8000 and look at the browser console's network tab. A 401 usually means the stored token expired: log out and log in again, since the app does not redirect on 401 automatically.

### Alembic `Target database is not up to date`

```bash
alembic upgrade head
```
