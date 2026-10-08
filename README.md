# AI-Based HR Assisting App — HR Skill Gap Analyzer

An AI-powered HR system that works out what skills a position needs, compares them against what each employee actually has, and tells HR how to close the gap. It combines the **ESCO** European skills taxonomy with **Google Gemini** to generate position skill profiles, runs a deterministic skill comparison, produces AI gap-analysis reports, and (in progress) verifies employee skill levels through timed, proctored skill assessments.

---

## Project Overview

HR teams spend a lot of manual effort deciding what a role requires and whether employees meet it. This app automates that:

1. **Generate position requirements** — When HR creates a position, ESCO supplies the occupation's raw skills and Gemini filters them into a "perfect employee profile" (skill + required level + essential/optional).
2. **Capture employee skills** — HR enters skills manually, or uploads a PDF/DOCX resume that Gemini parses into a full employee record (skills, education, certifications).
3. **Compare** — A deterministic service compares employee skills to position requirements and sorts them into *matched*, *needs improvement*, *unmatched* and *additional*.
4. **Report** — Gemini turns the comparison into a readiness score, upskill pathways, timelines, resources, a managerial summary, and reconciles skills that match semantically under different names.
5. **Verify (in progress)** — Employees take a timed multiple-choice assessment on their weak skills; the backend grades it and derives their real proficiency level.

**Primary users:** HR managers and analysts. An Employee role exists in the backend for self-service, but the current frontend is HR-only.

---

## Repository Layout

| Folder | Status | What it is |
|---|---|---|
| `backend/` | **Active** | FastAPI + SQLAlchemy + PostgreSQL REST API, ESCO and Gemini integrations |
| `my_frontend/` | **Active — main frontend** | React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui |
| `frontend/` | Legacy — kept for reference, not maintained | The original React frontend. See [docs/legacy-frontend.md](docs/legacy-frontend.md) |
| `ai/` | Active (CV skill test) | Ollama agents used by `POST /assessment/employee/{id}/assess` |
| `docs/` | — | Project documentation and design notes |

```
hr-skill-gap-analyzer/
├── README.md
├── backend/
│   ├── requirements.txt
│   ├── alembic/                     # Database migrations
│   └── app/
│       ├── main.py                  # FastAPI entry point, router registration
│       ├── auth/                    # Signup/login, JWT, role dependencies
│       ├── core/                    # Config, security, exceptions, paths
│       ├── db/                      # Engine and session
│       ├── models/                  # SQLAlchemy models
│       ├── schemas/                 # Pydantic schemas (incl. assessment + question bank)
│       ├── crud/                    # Database access helpers
│       ├── api/endpoints/           # Route handlers
│       ├── services/                # Business logic (ESCO, comparison, gap analysis, resume)
│       ├── ai/                      # Gemini modules (perfect profile, gap report, resume parser)
│       ├── data/question_bank/      # Assessment question bank (JSONL)
│       └── scripts/                 # Seed scripts
├── my_frontend/                     # Main frontend (see my_frontend/README.md)
│   └── src/
│       ├── pages/                   # Route pages
│       ├── layouts/                 # AppLayout (sidebar + header)
│       ├── components/              # ProtectedRoute, FormField, shadcn ui/*
│       ├── services/                # Axios API wrappers, one per resource
│       ├── hooks/assessment/        # Attempt, timer and security hooks
│       ├── types/                   # TypeScript types matching backend schemas
│       ├── schemas/                 # Zod form schemas
│       ├── contexts/                # ThemeContext (light/dark/system)
│       └── data/                    # Mock assessment data
├── frontend/                        # Legacy frontend (unused)
├── ai/                              # Ollama agents used by the CV skill test endpoint
└── docs/
```

---

## Technology Stack

### Frontend (`my_frontend/`)

| Technology | Purpose |
|---|---|
| React 19 + TypeScript 6 | UI |
| Vite 8 | Dev server and build |
| React Router 7 | Routing |
| Tailwind CSS 4 + shadcn/ui (Base UI) | Styling and UI primitives |
| Axios | HTTP client |
| React Hook Form + Zod 4 | Forms and validation |
| Lucide React | Icons |
| ESLint | Linting |

### Backend

| Technology | Purpose |
|---|---|
| Python 3.10+ / FastAPI / Uvicorn | API server |
| SQLAlchemy 2.0 + Alembic | ORM and migrations |
| PostgreSQL | Database |
| Pydantic 2 | Validation |
| python-jose + passlib (bcrypt) | JWT auth and password hashing |
| google-genai | Gemini client |
| PyMuPDF / PyPDF2 | Resume text extraction |

### AI / External Services

| Service | Purpose |
|---|---|
| Google Gemini (`gemini-3.5-flash-lite`) | Perfect profile generation, gap reports, resume parsing |
| ESCO API (`https://ec.europa.eu/esco/api`) | Occupation search and skill taxonomy |

---

## High-Level Architecture

```
HR user
   │
   ▼
my_frontend (React, Vite)  ── JWT in localStorage ("access_token")
   │  services/*.ts → axios (Bearer token)
   ▼
FastAPI backend
   ├── /auth              signup, login
   ├── /me                employee self-service
   ├── /employees         CRUD, counts, /{id}/skill-gap
   ├── /employees/{id}/skills
   ├── /departments       CRUD, counts
   ├── /positions         CRUD, counts, background skill generation
   ├── /positionSkills    position skill CRUD + AI generation
   ├── /skills            CRUD
   ├── /skill-aliases     CRUD
   ├── /resume            resume upload → employee
   └── /assessment        legacy endpoint (being replaced)
   │
   ├── PostgreSQL (SQLAlchemy)
   ├── ESCO API
   └── Google Gemini
```

Details: [docs/architecture.md](docs/architecture.md).

---

## Quick Start

Prerequisites: Python 3.10+, Node.js 20+, npm 10+, PostgreSQL 14+.

```bash
# 1. Backend
cd backend
python -m venv .venv
.venv\Scripts\activate            # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (it is git-ignored):

```env
DATABASE_URL=postgresql+psycopg://postgres:<password>@localhost:5432/ai_hr_assistant
SECRET_KEY=<long-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GEMINI_API_KEY=<your-gemini-api-key>
```

```bash
createdb ai_hr_assistant
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 2. Frontend (new terminal)
cd my_frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000` — Swagger UI at `/docs`

You also need to seed the `HR` and `Employee` roles and create a first HR user before you can log in. See [docs/setup.md](docs/setup.md).

---

## Documentation Index

| Document | Description |
|---|---|
| [setup.md](docs/setup.md) | Full installation, seeding the first HR user, troubleshooting |
| [architecture.md](docs/architecture.md) | System architecture and request flows |
| [backend.md](docs/backend.md) | Backend structure, routers, services, models |
| [frontend.md](docs/frontend.md) | `my_frontend` pages, routing, services, hooks |
| [assessment.md](docs/assessment.md) | Skill assessment feature: design, question bank, status |
| [api.md](docs/api.md) | API endpoint reference |
| [database.md](docs/database.md) | Database schema |
| [ai-analysis.md](docs/ai-analysis.md) | ESCO + Gemini pipelines |
| [skill_alias_system.md](docs/skill_alias_system.md) | Skill alias system |
| [development.md](docs/development.md) | Conventions, workflow, known tech debt |
| [legacy-frontend.md](docs/legacy-frontend.md) | The old `frontend/` app (reference only) |

Design notes (plain text / images) in `docs/`: `assessment_pipeline.txt`, `phase B.txt`, `frontend flow.txt`, `Creating Employee Flow.txt`, `employee Login flow.txt`, `Routes hierarchy.txt`, `Datatbase design.png/.pdf`.

---

## Project Status

| Feature | Status |
|---|---|
| Employee, department, position CRUD | ✅ Complete |
| Employee skill management | ✅ Complete |
| Position skill management + AI generation (ESCO + Gemini) | ✅ Complete |
| Resume import (PDF/DOCX → employee) | ✅ Complete |
| Deterministic skill comparison | ✅ Complete |
| Gemini gap-analysis report (incl. reconciled skills) | ✅ Complete |
| JWT authentication | ✅ Complete |
| Dashboard (live counts) and theme settings | ✅ Complete |
| Assessment UI (instructions, timed questions, tab-switch detection, result) | 🟡 Built on mock data |
| Assessment backend (question bank, sessions, grading, level calculation) | 🟡 In progress — question bank and response schemas exist |
| Skills management page | ⚠️ Placeholder |
| Employee self-service portal in `my_frontend` | ❌ Not started (backend `/me` exists) |
| Skill aliases used during comparison | ❌ Not wired in — aliases are stored but the comparison uses exact names; Gemini's `reconciled_skills` covers semantic matches |

---

## Important Notes

- **`GEMINI_API_KEY` is required** for position skill generation, gap analysis and resume import; those endpoints return 500 without it.
- **ESCO is a live external dependency.** If it is unreachable, automatic position skill generation fails (you can still add position skills manually).
- **Some routes are not protected:** `/employees` and `/skills` have their HR dependency commented out. Re-enable before deploying.
- **`/assessment` imports `backend.app.services.old.assessment_service`.** It only works because `app/core/paths.py` adds the project root to `sys.path`; it will be replaced by the new assessment service.
- **CORS allows all origins** (`["*"]`). Restrict it before deploying.
