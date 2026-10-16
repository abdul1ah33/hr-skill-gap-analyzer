# Industry Templates & Per-Client Deployments — Plan

Status: **proposed** (2026-10-16). Nothing here is implemented yet.

## 1. Goal

Make the application specialized for each client (a port, a hospital, a factory) **without changing source code per client**. Each client gets:

- a predefined, industry-specific set of departments, positions, required skills and levels, aliases, assessment questions and training courses, loaded from an **industry template**;
- the freedom to customize that data afterwards through the existing Positions / Position Skills screens;
- the existing features (skill comparison, gap analysis, assessments) working against that data with no special handling.

## 2. Decision: one database per client (Option A)

Each client runs the **same code** against **its own PostgreSQL database**. There is no `company_id` anywhere in the schema.

Why:

- The app is fully single-tenant today. `Department.name`, `Skill.name`, `SkillAlias.alias`, `Employee.email` and `employee_number` are globally unique, and no query is scoped by company. Adding multi-tenancy would mean touching every model, every router and the auth layer. That is the riskiest possible change, and it adds nothing to specialization.
- HR data for ports and hospitals is sensitive. A separate database per client gives real isolation, and clients will often ask for it anyway.
- We expect a few large B2B clients, not thousands of small ones.
- Everything is already configured through environment variables (`DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY` in `backend/.env`, `VITE_API_URL` in the frontend), so one codebase can serve many clients purely through configuration.

Trade-off we accept: N databases to migrate and N processes to run. Section 4 covers this with scripts.

## 3. How Option A works in practice

### 3.1 What is shared and what is per client

| Shared (in the git repo, one copy) | Per client (one copy each) |
|---|---|
| Backend and frontend code (one Docker image per release) | PostgreSQL database **and its own database user** |
| Alembic migrations | `.env` file: `DATABASE_URL`, **unique** `SECRET_KEY`, `GEMINI_API_KEY`, `CORS_ORIGINS`, DB pool size, assessment settings |
| Industry templates (`backend/app/data/templates/<industry>/`) | Frontend build with that client's `VITE_API_URL` |
| Question bank files | Backend container |
| | Subdomain, e.g. `client-a.ourapp.com` |

(Example clients in this document: `client-a` is a port operator, `client-b` is a hospital.)

`SECRET_KEY` **must** be different for every client. Otherwise a JWT issued by one client's backend would be accepted by another's.

Each client's database user can only connect to that client's database, so even a misconfigured backend can't read another client's data.

### 3.2 Hosting layout

```
docker-compose (one server)
 ├── proxy        Caddy / nginx: client-a.ourapp.com → frontend build + api-client-a
 │                               client-b.ourapp.com → frontend build + api-client-b
 ├── api-client-a our backend image, env: clients/client-a.env → DATABASE_URL=…/client_a
 ├── api-client-b our backend image, env: clients/client-b.env → DATABASE_URL=…/client_b
 └── postgres     ONE container
       ├── database client_a   (user client_a)
       └── database client_b   (user client_b)
```

- **One backend container per client**, all built from the same image; only the env file differs. Every container listens on `8000` inside the Docker network and the proxy routes by container name, so no host ports (`:8001`, `:8002`, …) need to be handed out.
- **One PostgreSQL container for all clients.** Each extra PostgreSQL instance costs ~100 MB+ RAM and another thing to back up and upgrade, while separate databases in one server are already isolated. Exception: a very large client, or one whose contract requires physical separation, gets its own PostgreSQL container or server. Only their `DATABASE_URL` changes.
- Why not a single backend for all clients: `app/db/database.py` creates one engine from `DATABASE_URL` at startup, and `SECRET_KEY` is global. Serving several databases from one process would mean per-request tenant routing. See §3.4 for when that becomes worth it.
- Client env files live **outside git** (`clients/*.env`, gitignored, or a secrets store).

### 3.3 Client lifecycle

**Provisioning a new client** (one script, `python -m app.scripts.provision_client`, run with that client's env file):

1. Create the database and its database user (`CREATE DATABASE client_a`, `CREATE USER client_a …`, grant only on that database), and add the client's service to the compose file.
2. `alembic upgrade head`
3. `seed_roles`
4. Write organization settings (name, industry).
5. Apply the industry template (§5.4), which also imports its question bank.
6. Create the first HR admin user.
7. Print a summary: positions created, skills created, skills **not assessable** (missing questions).

**Upgrading all clients** after a release (`scripts/upgrade_clients`): build the new image, then for each `clients/*.env` run `alembic upgrade head` and `import_question_bank` (idempotent), then restart that client's container. If one client fails, stop and report it instead of continuing silently.

**Customizing**: HR edits positions and position skills in the existing UI. Nothing new is needed for this.

### 3.4 Scaling limits and cost

Network ports are not a limit. The real limits are:

| Resource | Per client | Notes |
|---|---|---|
| **DB connections** | Up to 15 with SQLAlchemy defaults (5 pooled + 10 overflow) | **The first limit we'd hit.** PostgreSQL allows 100 by default, so only about 6 clients at peak. Fix: configurable pool size (§5.9), e.g. 2 + 3 per client; raise `max_connections`; add PgBouncer later if needed |
| **RAM** | ~100–200 MB per backend container | No heavy ML libraries are imported at runtime. 10 clients ≈ 1.5 GB + ~1 GB for PostgreSQL |
| **CPU** | Close to zero when idle | Low traffic; Gemini calls run on Google's servers |

Rough cost (check provider prices): 1–10 clients fit on one 4–8 GB VPS; 10–30 clients on a 16 GB VPS, or with PostgreSQL on its own server. **Gemini is likely the biggest running cost** under any design. A `GEMINI_API_KEY` per client lets us track each client's usage and bill it.

When this stops being efficient (roughly 30–50+ clients, or many very small ones), switch to **one backend serving all clients, with each client keeping its own database**: the backend picks the engine from the request's subdomain. Data stays exactly as isolated as now, and the per-client databases carry over unchanged. Multi-tenancy (Option B) is still not needed.

## 4. Where the current code already fits

| Existing piece | Role in this design | Change |
|---|---|---|
| `PositionSkill` (required level, `is_essential`, description) | Already the "client requirements" layer | Add `source` (§5.3) |
| `Skill` + `SkillAlias` (normalized lowercase names) | Shared skill catalog inside each DB | Add `esco_uri`, `description` (§5.2) |
| `QuestionBankImportService` | Already idempotent, creates missing skills and reports coverage (`not_assessable`, `small_pools`) | Reused by the template applier as is |
| `PositionSkillService` (ESCO + Gemini) | Becomes the tool for **authoring templates**, and a runtime fallback for positions the template doesn't cover | No change now |
| `SkillComparisonService` → gap analysis / `AssessmentTargetService` | Read `PositionSkill`, so they use the template's configuration automatically | Wire in aliases (§5.6) |
| `gap_analysis_ai.generate_gap_report` | Only receives `job_title` | Add industry context (§5.7) |
| `Course` / `CourseSkill` / `Recommendation` | Models exist but are unused; templates can fill them in now | No change now |

Nothing is replaced. The new work is one settings table, three small columns, a template format with its applier, and deployment scripts.

## 5. Work required now

Ordered by dependency. Each item says **what** and **why**.

### 5.1 Organization settings (singleton table)

**What:** a new `organization_settings` table with exactly one row (enforced with `CHECK (id = 1)`): `name`, `industry`, `template_key`, `template_version`, `template_applied_at`. Add a read endpoint for the frontend (company name in the header) and an HR-only update endpoint.

**Why:** since each DB is one client, the app needs a single place that says who it is and what it was configured from. Gap analysis needs `industry` (§5.7), and the applier records which template version was applied so later upgrades are possible.

### 5.2 Skill catalog enrichment

**What:** migration adding two nullable columns to `skills`:
- `esco_uri` (`String`, unique when not null): a link to the ESCO concept.
- `description` (`Text`): what the skill means in practice.

**Why:** industry skills are ambiguous by name ("lashing", "triage"). The description helps HR, gives Gemini better context during reconciliation and question generation, and the ESCO URI lets us de-duplicate skills across templates and authoring runs. Both columns are nullable, so existing rows and code are unaffected.

(Not now: `kind`/`category`. `kind` only becomes useful together with certification requirements, see §6.)

### 5.3 Provenance on positions and position skills

**What:** a `source` column (`String(100)`, default `'manual'`) on `positions` and `position_skills`. Values: `manual`, `ai` (set by `PositionSkillService`), `template:<key>@<version>` (set by the applier). HR edits through the API set it back to `manual`.

**Why:** this lets us tell template data apart from client customizations. Without it, re-applying a template or upgrading to a newer version could overwrite what HR changed. It's cheap to add now and painful to reconstruct later.

### 5.4 Template format and applier

**What:** templates are versioned JSON files in the repo:

```
backend/app/data/templates/port/
    template.json        {"key": "port", "name": "Port & Terminal Operations", "version": 1}
    skills.json          [{"name", "description", "esco_uri", "aliases": [...]}]
    departments.json     [{"name", "description"}]
    positions.json       [{"title", "department", "level", "description",
                           "skills": [{"skill", "required_level", "is_essential", "short_description"}]}]
    courses.json         [{"title", "provider", "url", "difficulty", "estimated_hours", "skills": [...]}]
    question_bank/*.jsonl  (same format as the existing question bank)
```

A `TemplateService.apply(db, template_key, dry_run)` plus a CLI `python -m app.scripts.apply_template port [--dry-run]`:

1. Validate all files with Pydantic, the same pattern as `schemas/question_bank.py`. Every skill a position references must exist in `skills.json`, and levels must be valid `SkillLevel` values.
2. Upsert in dependency order: skills (matched by normalized name) and aliases → departments (by name) → positions (by title + department) → position skills → courses → question bank (through `QuestionBankImportService`).
3. **v1 rule: create what's missing, never overwrite existing rows.** Re-running is safe and changes nothing.
4. Run in a single transaction. `--dry-run` rolls back and prints the report.
5. Report: created / already present / skipped counts, plus the question-coverage result. **Fail** if any templated skill is not assessable (below 1 Beginner / 2 Intermediate / 2 Advanced active questions).
6. Update `organization_settings.template_*`.

**Why:** this is the core of "configure through data, not code". JSON matches the existing JSONL bank and needs no new dependency. Copying the data (instead of linking to the template at runtime) keeps every existing service unchanged. The coverage gate exists because a template whose skills have no questions makes the assessment feature look broken for that client.

### 5.5 Containers, provisioning and upgrade scripts

**What:**
- A `backend/Dockerfile` (one image for all clients), a frontend build that takes `VITE_API_URL` as a build argument, and a `docker-compose.yml` with the proxy, one PostgreSQL service and one backend service per client (§3.2).
- `provision_client` and `upgrade_clients` as described in §3.3, plus a `clients/README.md` describing the env-file layout. `clients/*.env` goes in `.gitignore`.

**Why:** with one database per client, the operational cost is repetition. Containers are the simplest way to run the same image N times with different env files, and scripting the rest makes onboarding a 10-minute task and makes sure no client misses a migration. There is no Dockerfile in the repo yet.

### 5.6 Use skill aliases in the comparison

**What:** `SkillComparisonService` currently matches employee and position skills by exact name (listed under Known Tech Debt in `docs/development.md`). Resolve both sides through `skill_aliases` to a canonical skill before comparing.

**Why:** industry vocabulary varies much more than tech vocabulary ("RTG" / "rubber-tyred gantry crane", "ER triage" / "emergency triage"). Resumes will use client wording and templates will use canonical wording. Today the only safety net is Gemini's `reconciled_skills`, which isn't deterministic and doesn't affect assessment target selection at all.

### 5.7 Industry context in gap analysis

**What:** pass `organization_settings.industry` (and the company name) into `generate_gap_report` and its prompt.

**Why:** the report and the reconciliation should reason as a port-operations or clinical HR advisor, not as a generic one. It's a small change with a clear effect on quality.

### 5.8 First real template: ports

**What:** build `templates/port` v1:
1. List the port's departments and positions (from the first client's org chart if possible).
2. Draft skills per position with `PositionSkillService`-style ESCO + Gemini runs, then trim and normalize by hand.
3. Generate questions with the existing `generate_question_bank` pipeline.
4. `apply_template --dry-run` must pass the coverage gate.
5. Domain-expert review of skills, levels and questions is **deferred** (decided 2026-10-16). Until it's done, the template is marked unreviewed.

**Why:** the value is in the content, not the code. Rough size: ~30 positions × ~10 skills ≈ 300 skills, so at least ~1,500 questions. Build one industry fully before generalizing. The second industry will show what actually needs to be generic.

### 5.9 Production blockers from known tech debt

**What:** before any client goes live:
- re-enable `get_current_hr` on `/employees` and `/skills`;
- restrict CORS to the client's own frontend origin (`CORS_ORIGINS` in env);
- `echo=False` on the engine (make it configurable via env);
- make the connection pool configurable via env (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`) with small defaults (e.g. 2 + 3), so many clients fit within PostgreSQL's connection limit (§3.4);
- update `docs/development.md`: the "hard-coded API URL" item is already resolved, since `api.ts` reads `VITE_API_URL`.

**Why:** with Option A, every client deployment is real production holding real HR data.

### Suggested order

| Step | Items | Done when |
|---|---|---|
| 1 | 5.9, 5.1, 5.2, 5.3 | Migrations applied, tests pass, HR routes protected |
| 2 | 5.4 | A small test template applies; re-applying changes nothing; dry-run works; coverage gate fails on a skill without questions |
| 3 | 5.6, 5.7 | An employee skill entered under an alias counts as matched in comparison and assessment targets |
| 4 | 5.5 | Two demo clients run side by side in docker-compose, each with its own DB and DB user; a new one can be provisioned with one command |
| 5 | 5.8 | Port template v1 reviewed, applied to a demo DB, gap analysis and assessments work end to end |

## 6. Postponed (and why)

| Item | Why it can wait |
|---|---|
| Hospital / manufacturing templates | Build each when that client is signed; the format from §5.4 already supports them |
| Template upgrades (v1 → v2 into an existing client) | Needs real customizations to design against; `source` (§5.3) makes it possible later |
| Certification requirements (`PositionCertification`, expiry tracking, `Skill.kind`) | Important for ports and hospitals, but skills have to work first. Today `Certification` is just free text on the employee |
| Non-MCQ assessment methods (supervisor sign-off, evidence upload) | Big feature; for now, don't promise practical-skill assessment in contracts |
| Training recommendations feature | Models exist and templates will fill in courses; the UI and logic can follow |
| Template variants / inheritance | Copy-then-customize covers differences between clients; inheritance would push complexity into every service |
| Configurable proficiency levels | `SkillLevel` (3 levels) is tied into scoring, the question bank and the UI; map client frameworks onto it |
| UI for applying templates / onboarding | We onboard clients ourselves at first; the CLI is enough |
| Domain-expert review of template content | Decided 2026-10-16; the template can be built and demoed without it, but it should be done before a real client relies on the assessments |
| One backend serving all clients (per-request DB routing) | Only past ~30–50 clients (§3.4) |
| PgBouncer | Only if small pools + `max_connections` aren't enough |
| O*NET | US-centric, and a second taxonomy brings mapping work; ESCO is already integrated |
| Multi-tenancy (Option B) | Only if the business model changes to many small clients |

## 7. Open questions

| # | Question | Recommendation |
|---|---|---|
| Q1 | Do we host clients, or do some want on-prem? | We host by default; Option A also supports on-prem with the same scripts |
| Q2 | Who reviews template content (domain expert)? | **Deferred (2026-10-16).** Not needed to build or demo the template; should be done before a real client relies on its assessments |
| Q3 | Should the template create departments, or only positions? | Create them; HR can rename or delete. `Position.department_id` is optional anyway |
| Q4 | Templates in the main repo or a separate content repo? | Main repo for now; split only if non-developers start editing them |
