---
# Development Guide

This document outlines the workflow and conventions for developers contributing to the AI-Based HR Assisting App.

---

## Environment Setup

Follow the instructions in the [Setup Guide](setup.md) to get your local environment running.

### Tooling Recommendations
- **Editor:** VS Code
- **Extensions:** Python, Pylance, ESLint, Prettier, Tailwind CSS IntelliSense.
- **Database Client:** pgAdmin, DBeaver, or DataGrip.
- **API Testing:** Postman or use the built-in Swagger UI at `http://localhost:8000/docs`.

---

## Backend Development

### Code Organization
- **Routers:** (`app/api/endpoints/`) Define HTTP routes, inject dependencies, validate request schemas, and call services or CRUD functions. Keep them thin.
- **Services:** (`app/services/`) Business logic, orchestrating multiple CRUD operations, or external API calls (ESCO, Gemini).
- **CRUD:** (`app/crud/`) Pure database interactions using SQLAlchemy.
- **Models:** (`app/models/`) SQLAlchemy declarative models.
- **Schemas:** (`app/schemas/`) Pydantic models for request/response validation.

### Database Changes
If you modify a model in `app/models/`:
1. Ensure the model is imported in `app/models/__init__.py`.
2. Generate a migration: `alembic revision --autogenerate -m "Add new column"`
3. Review the generated file in `alembic/versions/`.
4. Apply the migration: `alembic upgrade head`.

### Working with AI (Gemini)
- AI calls are located in `app/ai/`.
- We use the `google-genai` SDK.
- Always use `response_schema` (passing a Pydantic model) and `response_mime_type="application/json"` in the `GenerationConfig` to force deterministic JSON output.
- Keep `temperature` low (0.1) for analytical tasks to ensure consistency.

---

## Frontend Development

### Code Organization
- **Pages:** (`src/pages/`) Top-level route components.
- **Components:** (`src/components/`) Reusable UI pieces.
- **Services:** (`src/services/`) API calls using Axios.
- **Hooks:** (`src/hooks/`) Custom React hooks (e.g., `useEmployees`).
- **Types:** (`src/types/`) TypeScript interfaces matching the backend schemas.

### Data Fetching
- The application currently relies on a central `useEmployees` hook for global data fetching.
- For new features, consider implementing TanStack React Query (already in dependencies) for better caching, invalidation, and loading state management per-component.

### Styling
- We use **Tailwind CSS v4**.
- For merging classes safely, use the `cn()` utility located in `src/utils/cn.ts` (which wraps `clsx` and `tailwind-merge`).

### Form Handling
- Use **React Hook Form** for state and **Zod** for validation.
- See `EmployeeForm.tsx` for a reference implementation.

---

## Known Tech Debt & Future Improvements

1. **Role Enforcement:** The backend `get_current_hr` dependency is currently commented out on the `/employees` routes, making them public. This must be re-enabled before production.
2. **CORS:** The backend currently allows all origins (`["*"]`). This should be restricted to the frontend URL.
3. **Environment Variables:** The `backend/.env` file is currently tracked in Git. It must be added to `.gitignore` and removed from history.
4. **Assessment Service:** The `/assessment` route imports from an old service path (`backend.app.services.old.assessment_service`). This needs to be refactored to align with the new directory structure.
5. **Frontend Mock Data:** The `useEmployees` hook falls back to `localStorage` mock data if the API fails. While useful for UI development, this fallback can mask real API connection issues.
6. **Mismatched URL Prefix:** The frontend calls `/positions/{id}/skills` while the backend router is mounted at `/positionSkills/{id}/skills`. The frontend `employeeService.ts` currently handles this discrepancy, but they should be aligned.
