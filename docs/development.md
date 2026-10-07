# Development Guide

Workflow and conventions for working on the AI-Based HR Assisting App.

---

## Environment Setup

Follow the [Setup Guide](setup.md). Day to day you run two processes:

```bash
# backend/
uvicorn app.main:app --reload --port 8000

# my_frontend/
npm run dev
```

### Tooling
- **Editor:** VS Code with Python, Pylance, ESLint and Tailwind CSS IntelliSense
- **Database client:** pgAdmin, DBeaver or DataGrip
- **API testing:** Swagger UI at `http://localhost:8000/docs`, or Postman

---

## Repository Conventions

- **`my_frontend/` is the only frontend under development.** `frontend/` is legacy and kept for reference; don't add features there.
- `ai/` holds standalone Ollama experiments that the backend does not use.
- Superseded code is moved to `old/` folders (`backend/app/services/old/`, `backend/app/api/endpoints/old_Ollama/`) instead of being deleted.
- Design notes and diagrams live in `docs/` as `.txt` / `.png` / `.pdf`; maintained docs are the `.md` files.

---

## Backend Development

### Code Organization
- **Routers** (`app/api/endpoints/`): HTTP routes, dependencies, request validation. Keep them thin.
- **Services** (`app/services/`): business logic and orchestration (ESCO, Gemini, comparison, gap analysis, resume import).
- **AI modules** (`app/ai/`): Gemini prompts and output schemas.
- **CRUD** (`app/crud/`): SQLAlchemy queries.
- **Models** (`app/models/`): SQLAlchemy models.
- **Schemas** (`app/schemas/`): Pydantic request/response models.
- **Data** (`app/data/`): static data such as the assessment question bank.

Import from `app.…`, not `backend.app.…` (see Known Tech Debt).

### Protecting routes
Add the role dependency at router level:

```python
router = APIRouter(dependencies=[Depends(get_current_hr)])
```

### Database Changes
When you change a model in `app/models/`:
1. Make sure it is imported in `app/models/__init__.py`.
2. `alembic revision --autogenerate -m "describe change"`
3. Review the file in `alembic/versions/`.
4. `alembic upgrade head`

### Working with Gemini
- Calls live in `app/ai/` and use the `google-genai` SDK with model `gemini-3.5-flash-lite`.
- Always pass a Pydantic model as `response_schema` with `response_mime_type="application/json"`, then validate the result with Pydantic.
- Keep `temperature` low (around 0.1) for analytical tasks.

---

## Frontend Development (`my_frontend/`)

### Code Organization
- **Pages** (`src/pages/`): one component per route, registered in `src/App.tsx` inside the `ProtectedRoute` → `AppLayout` block.
- **Services** (`src/services/`): one file per backend resource, using the shared `api` instance from `services/api.ts`. Add new endpoints here, not inline in pages.
- **Types** (`src/types/`): mirror backend Pydantic schemas and keep snake_case field names.
- **Hooks** (`src/hooks/`): reusable stateful logic, grouped by feature (e.g. `hooks/assessment/`).
- **Schemas** (`src/schemas/`): Zod schemas for forms.
- **UI** (`src/components/ui/`): shadcn components. Add more with `npx shadcn@latest add <name>`.

### Adding a page
1. Create `src/pages/MyPage.tsx`.
2. Add a `<Route>` in `src/App.tsx` inside the `AppLayout` route.
3. If it needs a sidebar link, add it to the `navigation` array in `src/layouts/AppLayout.tsx`.

### Data Fetching
Pages fetch in `useEffect` and keep results in local state. There is no global data store or query cache.

### Styling
- Tailwind CSS v4 with theme tokens as CSS variables in `src/index.css` (light and dark).
- Use the variables (`var(--primary)`, `bg-background`, `text-muted-foreground`, …) instead of raw colors so dark mode works.
- Merge classes with `cn()` from `src/lib/utils.ts`.

### Forms
React Hook Form + `zodResolver`. See `AddEmployeePage.tsx` / `EditEmployeePage.tsx` and `src/schemas/employeeSchema.ts`.

### Before committing
```bash
npm run lint
npm run build   # also type-checks
```

---

## Known Tech Debt

1. **Unprotected routes:** `get_current_hr` is commented out on the `/employees` and `/skills` routers.
2. **CORS:** `allow_origins=["*"]`; restrict it to the frontend URL.
3. **`backend.`-prefixed imports:** `assessment.py` and `resume.py` import via `backend.app…`, which only works because `app/core/paths.py` edits `sys.path` (and prints on startup).
4. **Legacy assessment endpoint:** `/assessment/employee/{id}/assess` uses `services/old/assessment_service`; replace it with the new assessment service ([assessment.md](assessment.md)).
5. **Frontend auth:** `ProtectedRoute` only checks that a token exists; no expiry check, no role check, no 401 handling.
6. **Hard-coded API URL** in `my_frontend/src/services/api.ts`; move it to a Vite env variable (`VITE_API_URL`).
7. **Skill aliases are unused in comparison:** `SkillComparisonService` does exact name matching and ignores `skill_aliases`.
8. **Inconsistent URL naming:** `/positionSkills` (camelCase) vs `/skill-aliases` (kebab-case).
9. **SQL echo:** `echo=True` on the engine logs every query.
10. **Bloated `requirements.txt`:** includes many ML packages the web app doesn't use.
