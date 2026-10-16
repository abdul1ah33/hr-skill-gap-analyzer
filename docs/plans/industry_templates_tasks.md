# Industry Templates & Per-Client Deployments — Task Checklist

Phases follow the build order in `industry_templates_plan.md` §5. Section references (§) point to that plan. Every phase ends with `pytest` passing; each phase is its own commit (or a few small ones).

Legend: ✅ done · ⏸️ deferred · 🧑 needs you (a decision or content work, not code)

---

## Phase 0 — Decisions 🧑
- [ ] Q1: we host clients, or some on-prem? (recommended: we host by default)
- ⏸️ Q2: who reviews the port template content? **Deferred (2026-10-16)**, to be handled later
- [ ] Q3: should templates create departments? (recommended: yes)
- [ ] Q4: templates in the main repo? (recommended: yes)

**Done when:** answers are recorded in plan §7.

## Phase 1 — Production fixes (§5.9)
- ✅ `backend/app/api/endpoints/employees.py`: re-enable `dependencies=[Depends(get_current_hr)]`
- ✅ `backend/app/api/endpoints/skills.py`: re-enable `dependencies=[Depends(get_current_hr)]`
- ✅ Check that the employee portal (`/me`, `/my/assessments`) doesn't call the `/employees` or `/skills` routers; leave `me.py` open to any logged-in user
- ✅ `backend/app/core/config.py`: add `CORS_ORIGINS` (comma-separated), `DB_ECHO` (default `false`), `DB_POOL_SIZE` (default 2), `DB_MAX_OVERFLOW` (default 3)
- ✅ `backend/app/main.py`: use `CORS_ORIGINS` instead of `["*"]`
- ✅ `backend/app/db/database.py`: pass `echo`, `pool_size`, `max_overflow` from config
- ✅ Tests: HR-only access on `/employees` and `/skills` (401 without a token, 403 for the Employee role); CORS header only for the allowed origin
- ✅ Docs: new env variables in `docs/setup.md`; tech debt items for routes, CORS, SQL echo and the API URL (already fixed) removed from `docs/development.md`; README "Important Notes" updated

**Done when:** tests pass and the HR app and employee portal both still work locally.

## Phase 2 — Schema changes (§5.1–5.3)
- ✅ `models/organization_settings.py`: `OrganizationSettings` (`id` with `CHECK (id = 1)`, `name`, `industry`, `template_key`, `template_version`, `template_applied_at`, timestamps); register it in `models/__init__.py`
- ✅ `models/skill.py`: add `esco_uri` (nullable, unique) and `description` (nullable `Text`)
- ✅ `models/position.py` and `models/position_skill.py`: add `source` (`String(100)`, not null, server default `'manual'`)
- ✅ One Alembic revision for all of the above, reviewed by hand; check that `upgrade` and `downgrade -1` both work
- ✅ Schemas: expose `description`/`esco_uri` on skills and `source` on positions / position skills (read-only for `source`)
- ✅ `crud/position.py` and `api/endpoints/position_skill.py` (the `/positionSkills` routes don't use `crud/position_skill.py`, which is unused): HR create/update sets `source = 'manual'`
- ✅ `services/position_skill_service.py`: AI-generated position skills set `source = 'ai'`
- ✅ `api/endpoints/organization.py`: `GET /organization` (any logged-in user), `PUT /organization` (HR only); register it in `main.py`
- ✅ Tests: the migration runs; the singleton can't hold a second row; `source` is set correctly by manual edits and by AI generation; organization endpoints
- ✅ Docs: `docs/database.md`, `docs/api.md`

**Done when:** `alembic upgrade head` works on a copy of the dev DB, existing data is unchanged, and tests pass.

## Phase 3 — Template format and applier (§5.4)
- ✅ `schemas/template.py`: Pydantic models for `template.json` (including a `reviewed: bool` flag; the applier prints a warning when it's `false`), `skills.json`, `departments.json`, `positions.json`, `courses.json`
- ✅ Cross-file validation: every skill a position or course references exists in `skills.json`; levels are valid `SkillLevel` values; no duplicate names after `normalize_skill_name`; no alias pointing at two skills
- ✅ `services/template_service.py` `TemplateService(db).apply(directory, organization_name)` (doesn't commit; the script commits or rolls back for `--dry-run`): upserts skills + aliases → departments → positions (by title + department) → position skills → courses + course skills → question bank through `QuestionBankImportService`; creates missing rows only and never overwrites; `source = 'template:<key>@<version>'`; one transaction; updates `organization_settings`; required skills only added to positions created in the run, so HR changes survive
- ✅ `QuestionBankImportService.import_files(..., source=...)`: template questions are stored as `template:<key>` so applying a template never deactivates the main bank; template skills that resolve to an existing alias get their questions mapped to that skill
- ✅ Coverage gate: fail (roll back) if any template skill is not assessable, using the importer's `not_assessable` report
- ✅ `scripts/apply_template.py`: `python -m app.scripts.apply_template <key> [--dry-run] [--report file.json]`
- ✅ Test template `tests/fixtures/templates/mini/` (2 departments, 3 positions, about 6 skills with aliases, 1 course, enough questions)
- ✅ Tests: applies cleanly; re-applying creates nothing; a manual change survives re-applying; dry-run writes nothing; a skill without questions fails the gate; bad references are rejected with a clear message
- ✅ Docs: `docs/templates.md` (format, rules, how to author and apply a template)

**Done when:** the mini template applies to an empty DB, and gap analysis and assessment preview work for an employee in a templated position.

## Phase 4 — Aliases in comparison and industry context (§5.6, §5.7)
- [ ] `services/skill_comparison_service.py`: resolve employee and position skills to canonical skills through `skill_aliases` before comparing
- [ ] Check that `AssessmentTargetService` and gap analysis automatically benefit (they both use the comparison)
- [ ] `ai/gap_analysis_ai.py`: `generate_gap_report` takes optional `industry` / `company_name` and uses them in the prompt
- [ ] `services/gap_analysis_service.py`: read `OrganizationSettings` and pass them in
- [ ] Tests: a skill stored under an alias counts as matched; no change when no aliases exist; gap analysis passes the industry (Gemini mocked)
- [ ] Docs: remove the "aliases unused in comparison" tech debt item; update `docs/skill_alias_system.md`, `docs/ai-analysis.md`, and the README status row

**Done when:** existing gap-analysis and assessment tests still pass, plus the new alias tests.

## Phase 5 — Containers, provisioning and upgrade (§5.5, §3)
- [ ] `backend/Dockerfile` (one image, runs `uvicorn`); `.dockerignore`
- [ ] `my_frontend/Dockerfile` or a build step with `VITE_API_URL` as a build argument
- [ ] `docker-compose.yml`: proxy (Caddy), one `postgres` service, `api-client-a` / `api-client-b` demo services, each with `env_file: clients/<name>.env`
- [ ] `clients/README.md` + `clients/example.env`; add `clients/*.env` to `.gitignore`
- [ ] `scripts/provision_client.py`: create the database and its database user (grants only on that database) → `alembic upgrade head` → `seed_roles` → organization settings → `apply_template` → first HR user → summary
- [ ] `scripts/upgrade_clients.py`: for each `clients/*.env`, run migrations + `import_question_bank`; stop and report on the first failure
- [ ] Manual check: two demo clients running side by side; client A's login token is rejected by client B; client A's database user can't connect to client B's database
- [ ] Docs: `docs/deployment.md` (layout, provisioning, upgrades, backups, scaling limits from plan §3.4)

**Done when:** a new client can be provisioned and running with one command, and an upgrade migrates every client.

## Phase 6 — Port template v1 (§5.8) 🧑 + code support
- [ ] 🧑 Collect the port's departments and positions (ideally from the first client's org chart)
- [ ] Draft skills per position using ESCO + Gemini (`PositionSkillService` logic run offline), then trim and normalize by hand → `backend/app/data/templates/port/*.json`
- [ ] Generate questions for every skill with `scripts/generate_question_bank.py` → `backend/app/data/templates/port/question_bank/*.jsonl`
- [ ] Run the generated questions through the existing importer validation (`import_question_bank --dry-run --strict`) and fix rejected ones
- [ ] `apply_template port --dry-run` passes the coverage gate
- [ ] Apply to a demo client; check gap analysis and assessments end to end with a few sample employees

**Done when:** the port template applies cleanly and a demo port client works end to end. The template is marked **unreviewed** in `template.json` until the expert review is done (deferred, see below).

---

Not on this list (postponed, see plan §6): domain-expert review of template content (before a real client goes live), other industries, template upgrades, certification requirements, non-MCQ assessments, training recommendations UI, onboarding UI, PgBouncer, a shared backend for all clients, multi-tenancy.
