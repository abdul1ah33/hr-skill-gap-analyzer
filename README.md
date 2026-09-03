# AI-Based HR Assisting App — HR Skill Gap Analyzer

An AI-powered Human Resources management system that automates skill gap analysis between employees and their positions. The application combines the ESCO European Skills taxonomy with Google Gemini AI to automatically generate required skill profiles for any job title, then compares those requirements against each employee's actual skills to produce actionable gap analysis reports.

---

## Project Overview

HR teams traditionally spend significant manual effort determining what skills a position requires and assessing whether employees are qualified. This application solves that problem by:

1. **Automatically generating position skill requirements** from ESCO (European Skills, Competences, Qualifications and Occupations) combined with Gemini AI filtering.
2. **Managing employee skill profiles** — HR can record what skills an employee has and at what proficiency level.
3. **Running deterministic skill-gap comparisons** — comparing employee skills against position requirements to produce matched, unmatched, needs-improvement, and additional-skills categories.
4. **Generating AI-powered gap analysis reports** — Gemini AI produces readiness scores, upskill pathways, tactical steps, resource recommendations, and managerial summaries.
5. **Importing employees from resumes** — PDF/DOCX resumes are parsed by Gemini AI to extract candidate profiles and create employee records automatically.

**Primary users:** HR managers and HR analysts who manage employee data and want data-driven insights into workforce skill coverage.

---

## Main Features

- **Employee management** — Create, read, update, delete employee records with full profile information.
- **Department management** — Organize positions and employees into departments.
- **Position management** — Define job titles with department, level, and salary grade.
- **Automatic position skill generation** — On position creation, ESCO + Gemini AI automatically generate required skills (runs as a background task).
- **Employee skill management** — Assign skills and proficiency levels (Beginner / Intermediate / Advanced / Expert) to employees.
- **Skill alias system** — Map alternate skill names to canonical skills for improved matching accuracy.
- **Skill gap analysis (deterministic)** — Compare employee skills vs. position requirements across four categories.
- **AI gap analysis report** — Gemini AI generates a structured report with readiness score, upskill pathways, timelines, resources, and manager summary.
- **Resume import** — Upload PDF or DOCX resumes; Gemini AI extracts and creates the employee record with skills, education, and certifications.
- **Assessment system** — Skill assessment infrastructure with questions, answers, and results.
- **Role-based access** — HR role has full management access; Employee role has a self-service profile and assessments portal.
- **JWT authentication** — Signup (for existing employees) and login with Bearer token.

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 6 | Type safety |
| Vite | 8 | Build tool and dev server |
| React Router DOM | 7 | Client-side routing |
| Axios | 1.x | HTTP client |
| Tailwind CSS | 4 | Utility-first styling |
| React Hook Form | 7 | Form handling |
| Zod | 3 | Schema validation |
| Framer Motion | 12 | Animations |
| Recharts | 3 | Data visualization |
| Lucide React | 1.x | Icons |
| TanStack React Query | 5 | Data fetching |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.x | Runtime |
| FastAPI | — | Web framework |
| SQLAlchemy | 2.0 | ORM |
| Pydantic | 2.x | Schema validation |
| python-jose | — | JWT handling |
| passlib (bcrypt) | — | Password hashing |
| python-dotenv | — | Environment variables |
| Alembic | — | Database migrations |
| requests | 2.x | HTTP client for ESCO API |
| uvicorn | — | ASGI server |

### Database

| Technology | Purpose |
|---|---|
| PostgreSQL | Primary relational database |
| SQLAlchemy | ORM layer |
| Alembic | Migration management |

### AI / Skill Analysis

| Technology | Purpose |
|---|---|
| Google Gemini AI (`gemini-3.5-flash-lite`) | Perfect profile generation, gap report generation, resume parsing |
| ESCO API (`https://ec.europa.eu/esco/api`) | European occupational skill taxonomy |

### Development Tools

- **Vite** — Frontend dev server and bundler
- **npm** — Frontend package manager
- **pip / venv** — Python dependency management
- **Alembic** — Database migration tool
- **Git** — Version control
- **oxlint** — Frontend linter

---

## High-Level Architecture

```
User (HR Manager / Employee)
         │
         ▼
  React Frontend (Vite, TypeScript)
  ├── AuthContext (JWT stored in localStorage)
  ├── useEmployees hook (global state)
  ├── employeeService.ts (HTTP calls via axios)
  └── Pages / Components
         │
         │ HTTP/JSON (Bearer token)
         ▼
  FastAPI Backend (Python)
  ├── /auth        Authentication (signup, login)
  ├── /me          Authenticated employee self-service
  ├── /employees   Employee CRUD + skill-gap analysis
  ├── /departments Department CRUD
  ├── /positions   Position CRUD + background skill generation
  ├── /skills      Skill CRUD
  ├── /skill-aliases Skill alias CRUD
  ├── /employees/{id}/skills Employee skill CRUD
  ├── /positionSkills Position skill CRUD + AI generation
  ├── /resume      Resume upload + AI extraction
  └── /assessment  Assessment management
         │
         ├── SQLAlchemy ORM ──► PostgreSQL Database
         │
         ├── ESCO API (https://ec.europa.eu/esco/api)
         │      (occupation search + skill extraction)
         │
         └── Google Gemini AI
                (perfect_profile, gap_analysis_ai, resume_parser)
```

---

## Project Structure

```
hr-skill-gap-analyzer/
├── README.md
├── docs/                        # Project documentation
│   ├── architecture.md
│   ├── setup.md
│   ├── backend.md
│   ├── frontend.md
│   ├── database.md
│   ├── api.md
│   ├── ai-analysis.md
│   └── development.md
├── backend/                     # FastAPI Python backend
│   ├── .env                     # Environment variables (not in version control)
│   ├── requirements.txt         # Python dependencies
│   ├── alembic.ini              # Alembic migration config
│   ├── alembic/                 # Database migrations
│   │   └── versions/            # Migration files
│   └── app/
│       ├── main.py              # FastAPI application entry point
│       ├── dependencies.py      # DB session injection
│       ├── auth/                # Authentication (router, service, crud, schemas)
│       ├── core/                # Config, security, exceptions
│       ├── db/                  # Database engine and session
│       ├── models/              # SQLAlchemy ORM models
│       ├── schemas/             # Pydantic request/response schemas
│       ├── crud/                # Database CRUD helpers
│       ├── api/endpoints/       # FastAPI route handlers
│       ├── services/            # Business logic services
│       ├── ai/                  # Gemini AI modules
│       └── scripts/             # Utility scripts (seed data)
├── frontend/                    # React TypeScript frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx             # Application entry point
│       ├── App.tsx              # Router and layout wrapper
│       ├── api/axios.ts         # Configured axios instance
│       ├── context/             # React contexts (Auth, Theme)
│       ├── hooks/               # Custom hooks (useEmployees)
│       ├── pages/               # Page components
│       ├── components/          # Reusable UI components
│       ├── services/            # API service functions
│       ├── types/               # TypeScript type definitions
│       └── utils/               # Utility functions
├── ai/                          # Experimental AI agents (standalone)
│   ├── main.py
│   ├── agents/                  # Ollama-based experimental agents
│   └── services/                # ESCO service (standalone copy)
└── docs/                        # Design documents and diagrams
    ├── skill_alias_system.md
    ├── Datatbase design.png
    └── *.txt                    # Design flow documents
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 20+
- npm 10+
- PostgreSQL 14+
- Git

### 1. Clone the repository

```bash
git clone <repository-url>
cd hr-skill-gap-analyzer
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install fastapi uvicorn sqlalchemy psycopg alembic python-jose passlib python-dotenv pydantic[email] requests google-genai python-multipart pypdf2 pymupdf
```

### 3. Configure environment variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:<password>@localhost:5432/ai_hr_assistant
SECRET_KEY=<your-secret-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GEMINI_API_KEY=<your-gemini-api-key>
```

### 4. Database Setup

```bash
# Create the PostgreSQL database
createdb ai_hr_assistant

# Run migrations from inside backend/
alembic upgrade head
```

### 5. Run the backend

```bash
# From inside backend/
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend at `http://localhost:8000`.

### 7. Verify

- Backend health check: `GET http://localhost:8000/` → `{"message": "Welcome to the AI HR Assistant API"}`
- Swagger UI: `http://localhost:8000/docs`
- Frontend: `http://localhost:5173`

---

## Documentation Index

| Document | Description |
|---|---|
| [architecture.md](docs/architecture.md) | Full system architecture, diagrams, and request flows |
| [setup.md](docs/setup.md) | Complete installation and configuration guide |
| [backend.md](docs/backend.md) | Backend code structure, routers, services, and models |
| [frontend.md](docs/frontend.md) | Frontend pages, components, services, and routing |
| [database.md](docs/database.md) | Database schema, ER diagram, and table documentation |
| [api.md](docs/api.md) | Complete API endpoint reference |
| [ai-analysis.md](docs/ai-analysis.md) | ESCO/Gemini AI integration and skill gap analysis pipeline |
| [development.md](docs/development.md) | Developer workflow, conventions, and extension guide |

---

## Project Status

| Feature | Status |
|---|---|
| Employee CRUD | ✅ Complete |
| Department CRUD | ✅ Complete |
| Position CRUD | ✅ Complete |
| Skill CRUD | ✅ Complete |
| Skill alias system | ✅ Complete |
| Employee skill management | ✅ Complete |
| JWT authentication (HR/Employee roles) | ✅ Complete |
| ESCO occupation search + skill extraction | ✅ Complete |
| Gemini perfect profile generation | ✅ Complete |
| Automatic position skill generation (background task) | ✅ Complete |
| Deterministic skill gap comparison | ✅ Complete |
| Gemini AI gap analysis report | ✅ Complete |
| Resume import (PDF/DOCX) | ✅ Complete |
| Assessment system (models + endpoints) | ✅ Partial — infrastructure exists, old service referenced |
| Frontend AI Assessment Page | ✅ UI exists, calls assessment endpoint |
| Analytics Page | ⚠️ Placeholder page (no live data) |
| Recruitment Page | ⚠️ Placeholder page (no live data) |
| Settings Page | ⚠️ Placeholder page |

---

## Important Notes

- **GEMINI_API_KEY is required** for position skill generation, gap analysis, and resume import. These features will return 500 errors without a valid key.
- **ESCO API is a live external dependency.** If the European Commission's API is unavailable, position skill generation will fail.
- **The `.env` file contains secrets.** Never commit it to version control. The `backend/.env` is currently tracked in the repository — this should be corrected by adding it to `.gitignore`.
- **Skill matching is case-insensitive exact-name matching** (after alias resolution). Skills must be spelled identically (after normalization) to match.
- The `assessment.py` endpoint references an older service (`backend.app.services.old.assessment_service`) which may cause import issues.
- The `my_frontend/` directory exists in the repository root but is not documented here as it appears to be an older or experimental frontend.

---

## Contributors

Contributor information is not documented in the repository.