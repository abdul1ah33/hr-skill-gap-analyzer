# Frontend Documentation (`my_frontend/`)

This document covers `my_frontend/`, the main React frontend. The original `frontend/` app is no longer used; see [legacy-frontend.md](legacy-frontend.md).

See also: [Architecture](architecture.md) | [API Reference](api.md) | [Assessment](assessment.md)

---

## Stack

- **React 19** + **TypeScript 6**, built with **Vite 8**
- **React Router 7** for routing
- **Tailwind CSS 4** (via `@tailwindcss/vite`) and **shadcn/ui** components built on **Base UI** (`components.json`, style `base-nova`)
- **Axios** for HTTP
- **React Hook Form** + **Zod 4** (`@hookform/resolvers`) for forms
- **Lucide** icons, **Geist** variable font
- **ESLint** for linting

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server at `http://localhost:5173` |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | Run ESLint |

### Path aliases

`vite.config.ts` maps both `@/` and `src/` to `my_frontend/src/` (used by shadcn components).

---

## Directory Structure

```
my_frontend/src/
├── main.tsx                     # Renders <App/> inside <ThemeProvider>
├── App.tsx                      # Route tree
├── index.css                    # Tailwind + theme CSS variables (light/dark)
├── components/
│   ├── ProtectedRoute.tsx       # Redirects to /login when there is no token
│   ├── FormField.tsx            # Labelled input used by employee forms
│   └── ui/                      # shadcn primitives: button, card, input, table
├── contexts/
│   └── ThemeContext.tsx         # light / dark / system theme
├── layouts/
│   ├── AppLayout.tsx            # Sidebar + header shell used by every page
│   └── DashboardLayout.tsx      # Older unstyled layout, not used
├── pages/                       # One file per route (see below)
├── services/                    # Axios wrappers, one file per resource
├── hooks/assessment/            # useAssessmentAttempt, useAssessmentTimer, useAssessmentSecurity
├── types/                       # TS interfaces mirroring backend schemas (snake_case)
├── schemas/
│   └── employeeSchema.ts        # Zod schemas for create/update employee forms
├── data/
│   └── mockAssessment.ts        # Mock assessment used until the backend is ready
└── lib/
    └── utils.ts                 # cn() helper (clsx + tailwind-merge)
```

---

## Routing

Defined in `src/App.tsx`. Everything except `/login` is wrapped in `ProtectedRoute` and rendered inside `AppLayout`.

| Route | Page | Purpose |
|---|---|---|
| `/login` | `LoginPage` | Email/username + password login. Redirects to `/dashboard` if a token already exists. |
| `/dashboard` | `DashboardPage` | Employee, department and position counts plus quick links |
| `/employees` | `EmployeesPage` | Employee list with search |
| `/employees/add` | `AddEmployeePage` | Create an employee manually, or upload a PDF/DOCX resume to create one with AI |
| `/employees/:id` | `EmployeeDetailsPage` | Profile, education, certifications; add/edit/remove employee skills; delete employee |
| `/employees/:id/edit` | `EditEmployeePage` | Edit employee details |
| `/departments` | `DepartmentsPage` | List, create, delete departments |
| `/positions` | `PositionsPage` | List, create, edit, delete positions |
| `/positions/:id` | `PositionDetailsPage` | Required skills for a position: view, add, edit level/essential, delete, regenerate with AI |
| `/gap-analysis` | `GapAnalysisPage` | Pick an employee (those with a position) to analyse |
| `/gap-analysis/:id` | `GapAnalysisResultPage` | Skill diff + Gemini report (readiness score, pathways, reconciled skills, strengths) |
| `/skills` | `SkillsPage` | Placeholder ("coming soon") |
| `/settings` | `SettingsPage` | Theme selection and logout |
| `/assessments/:id/instructions` | `AssessmentInstructionsPage` | Rules, timing and proctoring info before starting |
| `/assessments/:id` | `AssessmentPage` | One question at a time with a per-question timer |
| `/assessments/:id/result` | `AssessmentResultPage` | Submission confirmation |

There is no role-based routing yet: any logged-in user gets the HR interface. The backend enforces HR-only access on most routers (see [api.md](api.md)).

---

## Authentication

- `LoginPage` calls `authService.login({ login, password })` → `POST /auth/login` and stores the token in `localStorage` under **`access_token`**.
- `services/api.ts` attaches `Authorization: Bearer <token>` to every request.
- `ProtectedRoute` only checks that the token exists. It does not decode it or check expiry, and there is no 401 response interceptor, so an expired token shows up as failed API calls until the user logs out.
- Logout (sidebar button or Settings page) removes `access_token` and navigates to `/login`.

---

## Services

All services use the shared axios instance in `services/api.ts` (`baseURL: "http://localhost:8000"`, hard-coded). Request and response bodies use the backend's snake_case field names directly; there is no camelCase mapping layer.

| File | Functions | Endpoints |
|---|---|---|
| `authService.ts` | `login` | `POST /auth/login` |
| `employeeService.ts` | `getEmployees`, `getEmployeeById`, `createEmployee`, `updateEmployee`, `deleteEmployee`, `getEmployeeCount` | `/employees`, `/employees/{id}`, `/employees/count` |
| `employeeSkillService.ts` | `getEmployeeSkills`, `addEmployeeSkill`, `updateEmployeeSkill`, `deleteEmployeeSkill` | `/employees/{id}/skills[/{skillId}]` |
| `departmentService.ts` | `getDepartments`, `createDepartment`, `deleteDepartment`, `getDepartmentCount` | `/departments/`, `/departments/{id}`, `/departments/count` |
| `positionService.ts` | `getPositions`, `getPositionById`, `createPosition`, `updatePosition`, `deletePosition`, `getPositionCount` | `/positions/`, `/positions/{id}`, `/positions/count` |
| `positionSkillService.ts` | `getPositionSkills`, `generatePositionSkills`, `addPositionSkill`, `updatePositionSkill`, `deletePositionSkill` | `/positionSkills/{positionId}/skills[/{psId}]`, `/positionSkills/{positionId}/generate-skills` |
| `skillService.ts` | `getSkills` | `GET /skills/` |
| `resumeService.ts` | `extractResume` | `POST /resume/extract` (multipart) |
| `gapAnalysisService.ts` | `getSkillGapAnalysis` | `GET /employees/{id}/skill-gap` |

There is no assessment service yet; the assessment pages read `data/mockAssessment.ts`.

---

## Types

`src/types/` mirrors the backend Pydantic schemas:

| File | Main types |
|---|---|
| `employee.ts` | `Employee`, `CreateEmployeeRequest`, `EmployeeUpdate` |
| `employeeSkills.ts` | `SkillLevel` (`Beginner` / `Intermediate` / `Advanced` / `Expert`), `EmployeeSkill`, `AddEmployeeSkillData` |
| `department.ts` | `Department`, `CreateDepartmentData` |
| `position.ts` | `Position` |
| `positionSkill.ts` | `PositionSkill` (`required_skill_level`, `is_essential`, `short_description`), add/update payloads |
| `skill.ts` | `Skill` |
| `gapAnalysis.ts` | `SkillDiff`, `GapAnalysisReport`, `ReconciledSkill`, `UpskillRecommendation`, `SkillGapResult` |
| `assessment.ts` | `Assessment`, `AssessmentConfig`, `AssessmentQuestion`, `AssessmentAttempt`, `AssessmentStatus` |

---

## Assessment Hooks

Used by `AssessmentPage`. Full feature description in [assessment.md](assessment.md).

| Hook | Responsibility |
|---|---|
| `useAssessmentAttempt` | Holds the attempt in local state: current question index, selected answers, violation count, status (`in_progress` / `completed` / `terminated`). Reaching `config.maxViolations` sets status to `terminated`. |
| `useAssessmentTimer` | Counts down `config.timePerQuestion` seconds, resets when the question changes, calls `onExpire` at zero (the page then moves to the next question or submits). |
| `useAssessmentSecurity` | Listens for `visibilitychange` (tab hidden) and window `blur`, reporting a violation at most once per second. |

---

## Theming

- `ThemeContext` stores `light` / `dark` / `system` in `localStorage` under `hr-app-theme` and toggles the `dark` class on `<html>`.
- Colors come from CSS variables in `index.css` (`--background`, `--primary`, `--sidebar`, …). Many pages use inline `style={{ color: "var(--…)" }}` rather than Tailwind color classes.

---

## Forms

- `AddEmployeePage` and `EditEmployeePage` use React Hook Form with `zodResolver` and the schemas in `schemas/employeeSchema.ts`.
- Other pages (departments, positions, skills) use simple controlled inputs.

---

## Known Gaps

- The sidebar's "Assessment Instructions" link points to the literal path `/assessments/:id/instructions`; it needs a real assessment ID.
- Assessment pages use mock data and a hard-coded `employeeId: 1`; answers are only logged to the console on submit.
- Fullscreen and copy protection are described on the instructions page but not enforced yet; only tab-switch/blur detection runs.
- `SkillsPage` is a placeholder; skill aliases have no UI.
- The API base URL is hard-coded in `services/api.ts`.
- `layouts/DashboardLayout.tsx` is unused.
- `my_frontend/dist/` is a build output and is ignored by `.gitignore`.
