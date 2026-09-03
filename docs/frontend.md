---
# Frontend Documentation

This document covers the React/TypeScript frontend of the AI-Based HR Assisting App.

See also: [Architecture](architecture.md) | [API Reference](api.md)

---

## Directory Structure

```
frontend/src/
├── main.tsx                  # Application entry point
├── App.tsx                   # Root component: providers + router
├── App.css                   # Global styles
├── index.css                 # Base CSS (Tailwind directives)
├── api/
│   └── axios.ts              # Configured axios instance (base URL + interceptors)
├── context/
│   ├── AuthContext.tsx       # Authentication state and JWT management
│   └── ThemeContext.tsx      # Theme (light/dark) state
├── hooks/
│   └── useEmployees.ts       # Central HR data fetching and CRUD hook
├── pages/
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── Dashboard.tsx
│   ├── EmployeesPage.tsx
│   ├── DepartmentsPage.tsx
│   ├── RolesPage.tsx
│   ├── SkillsPage.tsx
│   ├── AIAssessmentPage.tsx
│   ├── RecruitmentPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── SettingsPage.tsx
│   ├── EmployeeProfilePage.tsx
│   └── EmployeeAssessmentsPage.tsx
├── components/
│   ├── EmployeeCard.tsx
│   ├── EmployeeForm.tsx
│   ├── EmployeeNavbar.tsx
│   ├── EmployeeTable.tsx
│   ├── Navbar.tsx
│   ├── ProtectedRoute.tsx
│   ├── layout/
│   │   └── AppLayout.tsx     # Main layout with sidebar/navbar
│   └── ui/               # Generic UI primitive components
├── services/
│   ├── employeeService.ts  # All API calls + field mapping
│   └── skillAliasService.ts
├── types/
│   └── employee.ts         # TypeScript interfaces
└── utils/
    └── cn.ts               # Tailwind class merging utility
```

---

## Application Entry Point

**`src/main.tsx`** renders `<App />` into the `#root` DOM element.

**`src/App.tsx`** wraps everything in:
1. `<AuthProvider>` - Provides authentication context.
2. `<BrowserRouter>` - Enables React Router.
3. `<AppRoutes>` - Defines the full route tree.

---

## Routing

| Route | Page Component | Auth Required | Role |
|---|---|---|---|
| `/login` | `LoginPage` | No | Any |
| `/signup` | `SignupPage` | No | Any |
| `/` | Redirect (role-based) | Yes | Any |
| `/dashboard` | `Dashboard` | Yes | HR |
| `/employees` | `EmployeesPage` | Yes | HR |
| `/departments` | `DepartmentsPage` | Yes | HR |
| `/roles` | `RolesPage` | Yes | HR |
| `/positions` | `RolesPage` (alias) | Yes | HR |
| `/skills` | `SkillsPage` | Yes | HR |
| `/skill-aliases` | `SkillsPage` (alias) | Yes | HR |
| `/assessment` | `AIAssessmentPage` | Yes | HR |
| `/recruitment` | `RecruitmentPage` | Yes | HR |
| `/analytics` | `AnalyticsPage` | Yes | HR |
| `/settings` | `SettingsPage` | Yes | HR |
| `/employee/profile` | `EmployeeProfilePage` | Yes | Employee |
| `/employee/assessments` | `EmployeeAssessmentsPage` | Yes | Employee |

**ProtectedRoute** (`components/ProtectedRoute.tsx`) reads `isAuthenticated` and `role` from `AuthContext`. Redirects to `/login` if not authenticated, or to the correct home if wrong role.

---

## Context

### AuthContext (`context/AuthContext.tsx`)

Global authentication state:

- `token: string | null` - Raw JWT.
- `user: JwtPayload | null` - Decoded JWT payload.
- `role: "HR" | "Employee" | null` - Extracted from JWT.
- `isAuthenticated: boolean` - True when token and user are non-null.
- `isLoading: boolean` - True during initial session restoration.

**Functions:**
- `login(accessToken)` - Stores token in `localStorage` (both `"token"` and `"access_token"` keys), decodes it, updates state.
- `logout()` - Clears `localStorage` and resets state.

**Session restoration:** On mount, reads from `localStorage`, checks `exp` claim. If expired, clears storage.

**JWT decoding:** The `decodeJwt()` function manually base64url-decodes the JWT payload. No signature verification on the frontend.

### ThemeContext (`context/ThemeContext.tsx`)

Light/dark theme toggle. Not connected to backend.

---

## Hooks

### useEmployees (`hooks/useEmployees.ts`)

Central data management hook used in `HRLayout`. Fetches all entity data on mount and provides CRUD actions.

**State:** `employees`, `departments`, `positions`, `skills`, `loading`, `error`, `searchQuery`, `filterDepartment`, `filterStatus`.

**Computed:** `filteredEmployees` via `useMemo`.

**On mount:** Fetches all four entity types in parallel with `Promise.allSettled`. Falls back to `localStorage` mock data if APIs fail, then falls back to hard-coded sample data.

**CRUD actions:** `addEmployee`, `editEmployee`, `removeEmployee`, `addDepartment`, `deleteDepartment`, `addPosition`, `deletePosition`, `addSkill`, `editSkill`, `deleteSkill`. All call the API first; most fall back to local state manipulation on failure.

---

## Pages

| Page | Purpose |
|---|---|
| `LoginPage` | Email + password login form. Calls `POST /auth/login`. |
| `SignupPage` | Employee self-registration. Calls `POST /auth/signup`. |
| `Dashboard` | HR summary statistics using counts from `useEmployees`. |
| `EmployeesPage` | Full employee list CRUD with search and filters. |
| `DepartmentsPage` | Department CRUD. |
| `RolesPage` | Position CRUD with skill generation. |
| `SkillsPage` | Skill CRUD and skill alias management. |
| `AIAssessmentPage` | Triggers skill gap analysis; displays AI report. |
| `EmployeeProfilePage` | Employee self-service view (role=Employee). |
| `EmployeeAssessmentsPage` | Employee assessment history. |
| `RecruitmentPage` | Placeholder (no live data). |
| `AnalyticsPage` | Placeholder (no live data). |
| `SettingsPage` | Placeholder (no live data). |

---

## Services

### employeeService.ts

All API calls use the configured axios instance from `src/api/axios.ts` (baseURL: `http://localhost:8000`).

**Field mapping functions:**
- `mapEmployeeToBackend(emp)` - camelCase to snake_case conversion.
- `mapEmployeeToFrontend(data)` - snake_case to camelCase.
- `mapPositionToBackend(pos)` / `mapPositionToFrontend(data)` - same for positions.

**Exported API functions:**

| Function | Method | Endpoint |
|---|---|---|
| `getEmployees()` | GET | `/employees` |
| `getEmployeeById(id)` | GET | `/employees/{id}` |
| `createEmployee(data)` | POST | `/employees` |
| `updateEmployee(id, data)` | PUT | `/employees/{id}` |
| `deleteEmployee(id)` | DELETE | `/employees/{id}` |
| `getDepartments()` | GET | `/departments` |
| `createDepartment(data)` | POST | `/departments` |
| `updateDepartment(id, data)` | PUT | `/departments/{id}` |
| `deleteDepartment(id)` | DELETE | `/departments/{id}` |
| `getPositions()` | GET | `/positions` |
| `createPosition(data)` | POST | `/positions` |
| `updatePosition(id, data)` | PUT | `/positions/{id}` |
| `deletePosition(id)` | DELETE | `/positions/{id}` |
| `getSkills()` | GET | `/skills` |
| `createSkill(data)` | POST | `/skills` |
| `updateSkill(id, data)` | PUT | `/skills/{id}` |
| `deleteSkill(id)` | DELETE | `/skills/{id}` |
| `getEmployeeSkills(empId)` | GET | `/employees/{id}/skills` |
| `addEmployeeSkill(empId, data)` | POST | `/employees/{id}/skills` |
| `updateEmployeeSkill(empId, skillId, data)` | PUT | `/employees/{id}/skills/{skillId}` |
| `removeEmployeeSkill(empId, skillId)` | DELETE | `/employees/{id}/skills/{skillId}` |
| `getPositionSkills(posId)` | GET | `/positions/{id}/skills` |
| `addPositionSkill(posId, ...)` | POST | `/positions/{id}/skills` |
| `removePositionSkill(posId, skillId)` | DELETE | `/positions/{id}/skills/{skillId}` |
| `generatePositionSkills(posId)` | POST | `/positions/{id}/generate-skills` |

---

## TypeScript Types

Defined in `src/types/employee.ts`:

```typescript
interface Employee {
  id?: number;
  employeeNumber: string;
  firstName: string; lastName: string;
  email: string; phone?: string; gender?: string;
  departmentId: number;
  roleId: number;      // maps to position_id on backend
  hireDate: string;
  status: string;
  yearsExperience?: number;
  skills?: string[];   // array of skill names
  // Note: birthDate, address, managerId, employmentType,
  // salary, educationLevel are frontend-only fields not
  // fully reflected in the backend Employee model.
}

interface Department { id?: number; name: string; description?: string; }
interface Position { id?: number; title: string; departmentId: number; level?: string; salaryGrade?: string; }
interface Skill { id?: number; name: string; category?: string; description?: string; }
interface EmployeeSkill { id?: number; employeeId: number; skillId: number; level?: number; }
```

---

## Axios Configuration

`src/api/axios.ts` creates a shared axios instance:

- `baseURL: "http://localhost:8000"` (hardcoded; change here if backend is on a different host/port).
- **Request interceptor:** Reads JWT from `localStorage.getItem("token") || localStorage.getItem("access_token")` and adds `Authorization: Bearer <token>` to every request.
- **Response interceptor:** On 401, clears `localStorage` and redirects to `/login` (unless already on an auth page).

---

## Component List

| Component | Purpose |
|---|---|
| `ProtectedRoute` | Route guard for auth + role checking |
| `AppLayout` | Shell layout (sidebar + content area) |
| `Navbar` | Top navigation for HR portal |
| `EmployeeNavbar` | Navigation for employee portal |
| `EmployeeTable` | Tabular employee list with actions |
| `EmployeeCard` | Card view of single employee |
| `EmployeeForm` | Create/edit employee modal form |
| `ui/*` | Generic UI primitives (buttons, inputs, etc.) |

---

## Forms and Validation

- **React Hook Form** manages form state, field registration, and submission.
- **Zod** provides schema validation. Forms declare a Zod schema and use `@hookform/resolvers/zod`.
- Validation errors appear inline below form fields.
