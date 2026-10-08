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
│   ├── AppLayout.tsx            # HR sidebar + header shell
│   ├── EmployeeLayout.tsx       # Employee portal header
│   └── DashboardLayout.tsx      # Older unstyled layout, not used
├── pages/                       # One file per route (see below)
├── services/                    # Axios wrappers, one file per resource
├── components/EmployeePicker.tsx  # Searchable employee grid (Gap Analysis and Assessments pages)
├── components/assessment/       # AssessmentHistoryTable, EmployeeAssessmentsCard (HR)
├── hooks/assessment/            # useAssessmentTimer, useAssessmentSecurity
├── types/                       # TS interfaces mirroring backend schemas (snake_case)
├── schemas/
│   └── employeeSchema.ts        # Zod schemas for create/update employee forms
└── lib/
    ├── utils.ts                 # cn() helper (clsx + tailwind-merge)
    ├── auth.ts                  # token, role from JWT, assessment session tokens, logout
    └── assessmentLabels.ts      # labels / colours for statuses, levels, profile actions
```

---

## Routing

Defined in `src/App.tsx`. Routes are grouped by role with `ProtectedRoute roles={[...]}` (the role is read from the JWT): HR pages render inside `AppLayout`, the employee portal inside `EmployeeLayout`, and the test pages without a layout (full screen). A user who opens a page of the other role is sent to their own home page (`/dashboard` for HR, `/my/assessments` for employees).

| Route | Page | Purpose |
|---|---|---|
| `/login` | `LoginPage` | Email/username + password login. Redirects to the role's home page (`/dashboard` or `/my/assessments`). |
| `/dashboard` | `DashboardPage` | Employee, department and position counts plus quick links |
| `/employees` | `EmployeesPage` | Employee list with search |
| `/employees/add` | `AddEmployeePage` | Create an employee manually, or upload a PDF/DOCX resume to create one with AI |
| `/employees/:id` | `EmployeeDetailsPage` | Profile, education, certifications; add/edit/remove employee skills ("Verified" badge for tested levels); delete employee; **Skill Assessments** card (Start Test / Assign Test / Cancel, history) |
| `/employees/:id/edit` | `EditEmployeePage` | Edit employee details |
| `/departments` | `DepartmentsPage` | List, create, delete departments |
| `/positions` | `PositionsPage` | List, create, edit, delete positions |
| `/positions/:id` | `PositionDetailsPage` | Required skills for a position: view, add, edit level/essential, delete, regenerate with AI |
| `/gap-analysis` | `GapAnalysisPage` | Pick an employee (those with a position) to analyse |
| `/gap-analysis/:id` | `GapAnalysisResultPage` | Skill diff + Gemini report (readiness score, pathways, reconciled skills, strengths) |
| `/skill-assessments` | `SkillAssessmentsPage` | Pick an employee (those with a position) to test (sidebar "Assessments") |
| `/skill-assessments/:id` | `EmployeeSkillAssessmentsPage` | Employee header + `EmployeeAssessmentsCard`: Start Test, Assign Test, Cancel, history |
| `/skills` | `SkillsPage` | Placeholder ("coming soon") |
| `/settings` | `SettingsPage` | Theme selection and logout |
| `/my/assessments` | `MyAssessmentsPage` | **Employee portal:** assigned / in-progress test, skills the next test covers, history |
| `/assessments/start` | `AssessmentInstructionsPage` | Skills in the test and the rules; starts the employee's own test. With `?employee=<id>` (HR) it starts the test on that employee's behalf |
| `/assessments/:id` | `AssessmentPage` | Takes the test (employee or HR): one question at a time, per-question and overall timers, answers saved immediately, heartbeat, "open on another device" screen |
| `/assessments/:id/result` | `AssessmentResultPage` | Per-skill result: level before → assessed, required level, correct / 5, profile change |

The test pages are open to both roles; the backend decides access (owner or HR).

---

## Authentication

- `LoginPage` calls `authService.login({ login, password })` → `POST /auth/login` and stores the token in `localStorage` under **`access_token`**.
- `services/api.ts` attaches `Authorization: Bearer <token>` to every request.
- `lib/auth.ts` decodes the role and expiry from the JWT payload (`getRole`); `ProtectedRoute` sends users without a valid token to `/login` and users of the wrong role to their home page. There is still no 401 response interceptor.
- Logout (`lib/auth.logout`) removes `access_token` and any assessment session tokens, so the next account on the same tab can't reuse an open test session.
- Employee accounts are created with `POST /auth/signup` (the employee's email) or the demo seed (`python -m app.scripts.seed_assessment_demo`).

---

## Services

All services use the shared axios instance in `services/api.ts` (`baseURL` from `VITE_API_URL`, default `http://localhost:8000`). Request and response bodies use the backend's snake_case field names directly; there is no camelCase mapping layer.

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

| `assessmentService.ts` | employee: `getMyPreview`, `startMyAssessment`, `listMyAssessments`; any: `openSession`, `getAssessment`, `sendHeartbeat`, `saveAnswer`, `reportViolation`, `submitAssessment`, `getResult`; HR: `getEmployeePreview`, `listEmployeeAssessments`, `assignAssessment`, `cancelAssessment`, `startOnBehalf` (assigns first if needed, then starts); `toAssessmentError` | `/assessments…`, `/employees/{id}/assessments…` |

The assessment session token is kept per tab in `sessionStorage` (`assessment-session:<id>`) and sent as `X-Assessment-Session`.

---

## Types

`src/types/` mirrors the backend Pydantic schemas:

| File | Main types |
|---|---|
| `employee.ts` | `Employee`, `CreateEmployeeRequest`, `EmployeeUpdate` |
| `employeeSkills.ts` | `SkillLevel` (`Beginner` / `Intermediate` / `Advanced`), `EmployeeSkill` (with `verified`, `last_assessed_at`), `AddEmployeeSkillData` |
| `department.ts` | `Department`, `CreateDepartmentData` |
| `position.ts` | `Position` |
| `positionSkill.ts` | `PositionSkill` (`required_skill_level`, `is_essential`, `short_description`), add/update payloads |
| `skill.ts` | `Skill` |
| `gapAnalysis.ts` | `SkillDiff`, `GapAnalysisReport`, `ReconciledSkill`, `UpskillRecommendation`, `SkillGapResult` |
| `assessment.ts` | Mirrors `backend/app/schemas/assessment.py`: `AssessmentDetail`, `AssessmentSession`, `AssessmentQuestion`, `AssessmentPreview`, `AssessmentResult`, `AssessmentSummary`, statuses and profile actions |

---

## Assessment Hooks

Used by `AssessmentPage`. Full feature description in [assessment.md](assessment.md).

| Hook | Responsibility |
|---|---|
| `useAssessmentTimer` | Seconds left until a deadline (ms timestamp), calling `onExpire` once per deadline. Used for the per-question timer (capped by the overall deadline) and the overall timer from the server's `remaining_seconds`. |
| `useAssessmentSecurity` | Reports `tab_hidden`, `window_blur` and `fullscreen_exit` violations (at most one per second) and blocks copy / cut / paste / context menu (copy and cut count as `copy_attempt`). The server counts violations and ends the test at the limit. |

`AssessmentPage` keeps the attempt state itself: answers come from the server on load (resume at the first unanswered question after a refresh) and every selection is saved with `PUT …/answer`.

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

- `SkillsPage` is a placeholder; skill aliases have no UI.
- Proctoring is a deterrent only: a modified client can skip reporting violations.
- `layouts/DashboardLayout.tsx` is unused.
