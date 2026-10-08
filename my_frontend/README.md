# my_frontend — HR Skill Gap Analyzer UI

The main frontend of the HR Skill Gap Analyzer: a React 19 + TypeScript + Vite single-page app for HR managers. It talks to the FastAPI backend in `../backend`.

Full documentation: [../docs/frontend.md](../docs/frontend.md). Project overview: [../README.md](../README.md).

## Getting started

Requires Node.js 20+ and the backend running at `http://localhost:8000`.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |

The backend URL is hard-coded in `src/services/api.ts`. Log in with an HR account (see [../docs/setup.md](../docs/setup.md) for creating the first one).

## Stack

React 19, TypeScript 6, Vite 8, React Router 7, Tailwind CSS 4, shadcn/ui (Base UI), Axios, React Hook Form + Zod, Lucide icons.

## Structure

```
src/
├── pages/            # One component per route (App.tsx defines the routes)
├── layouts/          # AppLayout: sidebar + header
├── components/       # ProtectedRoute, FormField, ui/ (shadcn)
├── services/         # Axios API wrappers per backend resource
├── hooks/assessment/ # Assessment timer and proctoring hooks
├── types/            # Types mirroring backend schemas (snake_case)
├── schemas/          # Zod form schemas
├── contexts/         # ThemeContext (light / dark / system)
└── lib/              # cn() helper, auth (role from JWT), assessment labels
```

## Features

- Dashboard with live employee, department and position counts
- Employees: list, create manually or from a PDF/DOCX resume (AI), view, edit, delete, manage skills
- Departments and positions management
- Position required skills: view, edit, add, delete, regenerate with AI (ESCO + Gemini)
- Skill gap analysis: skill diff and AI report per employee
- Skill assessment flow (instructions → timed questions → result), currently on mock data. See [../docs/assessment.md](../docs/assessment.md)
- Light/dark/system theme

## Adding shadcn components

`components.json` is configured (style `base-nova`, aliases under `src/`):

```bash
npx shadcn@latest add <component>
```
