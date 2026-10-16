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
- ✅ `services/skill_comparison_service.py`: an employee skill also matches a required skill when one name is a **direct** alias of the other (both directions); the entry gets `matched_via`. Skills that are only aliases of the same third skill are not matched, because the seeded aliases are categories (`python` and `java` → `computer programming`), not synonyms
- ✅ Checked that `AssessmentTargetService` and gap analysis automatically benefit (they both use the comparison); an alias-held skill is no longer listed as an additional skill
- ✅ `ai/gap_analysis_ai.py`: `generate_gap_report` takes optional `industry` / `company_name` and adds them to the prompt (`build_context_lines`)
- ✅ `services/gap_analysis_service.py`: reads `OrganizationSettings` and passes them in
- ✅ Tests (`tests/test_aliases_and_industry_context.py`): a skill stored under an alias counts as matched (both directions); own skill wins over an alias; siblings don't match; unrelated aliases change nothing; assessment targets use the alias match; gap analysis passes the industry, or `None` without settings (Gemini mocked)
- ✅ Docs: removed the "aliases unused in comparison" tech debt item; rewrote `docs/skill_alias_system.md`; updated `docs/ai-analysis.md` and the README status row

**Done when:** existing gap-analysis and assessment tests still pass, plus the new alias tests.

## Phase 5 — Containers, provisioning and upgrade (§5.5, §3)
- ✅ `backend/Dockerfile` (one image, runs `uvicorn --root-path /api`, non-root user; build context is the repo root because of the `ai/` imports); `.dockerignore`. `requirements.txt` replaced with the packages the app actually uses (the old one had no FastAPI/uvicorn/alembic/psycopg)
- ✅ `my_frontend/Dockerfile`: builds the frontend with `VITE_API_URL=/api` into a Caddy image. **One build for all clients** instead of one per client: the proxy sends `/api` on each client's domain to that client's backend
- ✅ `docker-compose.yml`: proxy (Caddy, `deploy/Caddyfile`), one `postgres` service, `api-client-a` / `api-client-b` demo services with `env_file: clients/<name>.env`, and a `tools` service for the scripts
- ✅ `clients/README.md` + `clients/example.env`; `clients/*.env` added to `.gitignore`; `deploy/compose.env.example` for the root `.env`
- ✅ `app/scripts/provision_client.py`: env file (new password + `SECRET_KEY`) → database user + database (only that user may connect) → `alembic upgrade head` → `init_client` (roles, organization settings, first HR user) → main question bank → `apply_template` → summary with the compose/Caddy snippets. Every step can be re-run
- ✅ `app/scripts/upgrade_clients.py`: for each `clients/*.env`, migrations + `import_question_bank`; stops and reports on the first failure
- ✅ Tests (`tests/test_provisioning.py`): provisions two real client databases, checks the data, cross-database login refused, tokens rejected across clients, re-running changes nothing, upgrade of every client, upgrade stops at the first failure
- ✅ Manual check in Docker: two demo clients running side by side through the proxy; client A's token gets 401 on client B; client B's database user gets "permission denied for database client_a"; redirects keep `/api`; `upgrade_clients` ran on both
- ✅ Docs: `docs/deployment.md` (layout, provisioning, real domains, upgrades, backups, scaling limits from plan §3.4); README, `setup.md`, `backend.md`, `development.md`

**Done when:** a new client can be provisioned and running with one command, and an upgrade migrates every client.

## Phase 6 — Port template v1 (§5.8) 🧑 + code support
Built with **mock data** for now (decided 2026-10-17): the real data will come from another institution, and the template is replaced when it does.

- ✅ Departments and positions: 7 mock departments and 15 positions of a typical container terminal (🧑 replace with a real org chart later)
- ✅ Skills per position, written by hand instead of ESCO + Gemini (mock): 19 port-specific skills with 17 aliases, plus 10 general skills from the main bank; 71 position skills → `backend/app/data/templates/port/*.json`
- ✅ Questions: 95 hand-written questions (5 per port skill: 1 Beginner / 2 Intermediate / 2 Advanced) → `backend/app/data/templates/port/question_bank/port.jsonl`
- ✅ All questions pass the importer's validation, with no "correct option much longer" warnings
- ✅ The coverage gate passes: provisioned a scratch client (`provision_client ... --template port`) on the local server; every skill is assessable. Test: `test_port_template_is_valid_and_every_skill_is_assessable`
- ✅ End to end on the scratch client with sample employees:
  - assessment previews with nothing untestable, and an assessment started;
  - "quay crane operation" matched "sts crane operation" through its alias;
  - real Gemini gap analysis with port-specific resources and the company name.

  Afterwards the scratch database was dropped.

**Done when:** the port template applies cleanly and a demo port client works end to end. The template is marked **unreviewed** in `template.json` until the expert review is done (deferred, see below).

---

Not on this list (postponed, see plan §6): domain-expert review of template content (before a real client goes live), other industries, template upgrades, certification requirements, non-MCQ assessments, training recommendations UI, onboarding UI, PgBouncer, a shared backend for all clients, multi-tenancy.
