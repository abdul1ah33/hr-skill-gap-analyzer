# Skill Assessment — Task Checklist

Phases follow plan §12. Section references (§) point to `00_skill_assessment_implementation_plan.md`; D-numbers point to `01_decisions_needed.md`.

---

## Phase 0 — Decisions
- [x] Decide D1, D3, D4, D5, D6 (2026-10-08; plan §A)
- [x] Confirm the assumed defaults: D2, D7, D8, D10, D12, D13, D15 ("defaults OK", 2026-10-08)
- [x] Record the answers in `01_decisions_needed.md`

**Done when:** every 🔴 item has an answer.

## Phase 1 — Test infrastructure
- [x] Add `pytest` to `backend/requirements.txt`
- [x] `backend/pytest.ini` (testpaths, markers `unit` / `integration`)
- [x] `backend/tests/conftest.py`: `TEST_DATABASE_URL` (default `<dev db>_test`, recreated each run), `alembic upgrade head` once, transactional session per test, `TestClient` with `get_db` override, user/employee/JWT factories; `tests/test_smoke.py` (3 passing)
- [x] Test database `<dev db>_test` is created automatically by the test run; documented in `docs/setup.md` §9
- [x] Seed the `Employee` role (`app/scripts/seed_roles.py`, idempotent); run on the dev DB

**Done when:** an empty smoke test runs against the test DB.

## Phase 2 — Models, migration, legacy removal
- [x] `models/skill_question.py` (both `SkillQuestion` and `SkillQuestionOption`), `models/assessment_enums.py`
- [x] Rewrite `models/assessment.py`, `assessment_skill.py`, `assessment_question.py` (§2.5–2.7 + §A.5 columns)
- [x] Add `verified`, `last_assessed_at`, `last_assessment_id` to `models/employee_skill.py` (§2.8)
- [x] Update relationships in `skill.py`, `employee.py`, `user.py`; update `models/__init__.py`
- [x] Delete `models/assessment_result.py`, `models/assessment_answer.py`
- [x] Delete `old_Ollama/`; keep the CV skill test endpoint `/assessment`, its service and the root `ai/` folder (§A.4)
- [x] `assessmentstatus` includes ASSIGNED / CANCELLED; assignment + session-lock columns (§A.5); partial unique index on ASSIGNED or IN_PROGRESS
- [x] Remove `EXPERT` from `SkillLevel` (model, migration enum swap with a guard, `skill_comparison_service.py`) (§A.9)
- [x] Lowercase skill names: `utils/skill_names.normalize_skill_name`, used everywhere skills are created or looked up; migration with collision guard + `CHECK (name = lower(name))` (§A.2)
- [x] Hand-written Alembic revision `a7c3e91d4b20` (§14): guard against non-empty legacy tables, drop legacy, create enums, tables, indexes and the partial unique index, alter `employee_skills`, full downgrade
- [x] Fix `schemas/employee_skill.py` and `crud/employee_skill.py` (`last_assessed_at`, reset `verified` on manual edit)

**Done when:** `alembic upgrade head` and `alembic downgrade -1` both succeed on a copy of the dev DB, and the app starts.

## Phase 3 — Skill deletion safety
- [x] `positions.py`: deleting a position or changing its title no longer deletes `Skill` rows (2026-10-08)
- [x] `DELETE /skills/{id}` → 409 when the skill has bank questions or assessment history
- [x] Tests: `tests/test_skill_deletion_safety.py` (5), `tests/test_skill_names.py` (6)

**Done when:** no position operation deletes a skill, and deleting a referenced skill returns 409.

## Phase 4 — Question-bank schemas and validation
- [x] `schemas/question_bank.py`: `BankOption`, `BankQuestion`, `SkillQuestionBank` (done early for the generator)
- [x] Merge `schemas/questions.py` into it; old file deleted (nothing imported it)
- [x] Unit tests, including the real invalid questions as fixtures (`tests/test_question_bank_schema.py`)

## Phase 5 — Importer
- [x] `services/question_bank_import_service.py`: parse → validate → skill mapping (override map → case-insensitive name → create; never via aliases) → `content_hash` upsert → deactivate missing → report
- [x] `scripts/import_question_bank.py` with `--dry-run`, `--strict`, optional paths, `--report`
- [x] `data/question_bank/skill_name_map.json` supported (optional, only for real merges; none needed today)
- [x] Integration tests (§13 "Import"): `tests/test_question_bank_import.py`, 15 tests
- [x] Run on the dev DB (3,495 questions, 64 skills created, 0 rejected; second run 0 inserted). No rejected questions to send; report saved in `.db_backups/question_import_report.json`

**Done when:** a second run reports 0 inserted, and all 83 skills are assessable.

## Phase 5b — Generate questions for uncovered skills (§A.3)
- [x] `schemas/question_bank.py` strict validation (pulled forward from Phase 4)
- [x] `ai/question_generator.py`: Gemini call per skill × level, `response_schema`, strict validation, retries, quota detection
- [x] `scripts/generate_question_bank.py`: `--skills`, `--per-level`, `--limit`, `--dry-run`; resumable; skips 12 vague skills
- [x] Test run with `sql` (15/15 valid)
- [x] Gemini run stopped after 8 skills (kept in `generated/gemini_position_skills.jsonl`); Gemini parked for later
- [x] Length bias: fixed in all generated questions (0 left); checked by `correct_is_obviously_longest` in `schemas/question_bank.py` and by the tests
- [x] Spot-check; "correct option much longer than the rest" check added
- [x] Importer stores `source = generated:<model>` for files under `generated/`

**Done when:** every non-skipped skill required by a position has at least 1 Beginner, 2 Intermediate and 2 Advanced active questions.

## Phase 6 — Scoring (pure)
- [x] `services/assessment_scoring_service.py`: 18-entry `(B, I, A) → level` table from §A.7, `SCORING_RULES_VERSION = "2026-10-08.v1"`
- [x] Unit tests for all 18 combinations (`tests/test_assessment_scoring.py`); also `score_skill` (unanswered = wrong, 1 B / 2 I / 2 A layout check) and `profile_action_for` (§A.8)

## Phase 7 — Comparison integration and targeting
- [x] `skill_comparison_service.py`: add `skill_id` to every entry
- [x] Strip `skill_id` in `gap_analysis_service.py` before calling Gemini (still returned to the API)
- [x] `services/assessment_target_service.py`: categories (D2), bank availability, order matched → needs_improvement → unmatched with essential first, cap 8 (§A.6), not-assessable reasons
- [ ] **Postponed by the user (2026-10-08):** retake cooldown (D10, 30 days per skill, reason `recently_assessed`); will be implemented later
- [x] `crud/question_bank.py`: availability counts (seen-question ids move to Phase 8, where they're used)
- [x] Tests: comparison still returns the same categories; target selection rules (`tests/test_assessment_targets.py`)

## Phase 8 — Generation and persistence
- [x] `services/assessment_generation_service.py`: per-level sampling with `SystemRandom`, prefer unseen, option shuffle into `option_order`, single transaction
- [x] Idempotent start: return the existing IN_PROGRESS assessment; start an ASSIGNED one in place; handle the partial-index race
- [x] Expiry handling (D12: marked EXPIRED on the next start; grading it is Phase 9), `expires_at` computation (D15)
- [x] `crud/assessment.py`: owner-scoped loaders, `FOR UPDATE` loader, served question ids
- [x] Tests (§13 "Random selection", "Persistence"): `tests/test_assessment_generation.py`

## Phase 9 — API, grading and profile application
- [x] `auth/dependencies.py`: `get_current_user_with_employee`
- [x] `core/config.py`: assessment settings
- [x] `core/exceptions.py` + `exception_handlers.py`: assessment exceptions (§10.6)
- [x] Rewrite `schemas/assessment.py` (§10.4–10.5)
- [x] `services/assessment_service.py` facade: preview, start, get, answer, violation, submit, result, list
- [x] Grading + profile application per §A.8 (None → delete row)
- [x] HR assign / cancel / start-on-behalf endpoints; `get_assessment_actor` (owner or HR) (§A.5)
- [x] Session lock: `POST /assessments/{id}/session`, `/heartbeat`, `X-Assessment-Session` check on every read/write, takeover after timeout, `ASSESSMENT_OPEN_ELSEWHERE` 409
- [x] Tests: second device rejected while fresh; takeover after stale; HR and employee can't both answer; `expires_at` doesn't move
- [x] `api/endpoints/assessments.py` (§10.3); register in `main.py` with prefix `/assessments`
- [x] HR: `GET /employees/{employee_id}/assessments` (explicit HR dependency); `api/endpoints/question_bank.py` coverage
- [x] Tests (§13 "Authorization", "Answer validation", "No-leak", "Scoring", "Profile application")

Notes: `get_assessment_actor` became an owner-or-HR check inside `assessment_service._load`; HR routes live in `api/endpoints/employee_assessments.py`; `held_by` is `employee` / `hr`; `POST /assessments` returns 200 for both new and resumed tests and also opens the session. The full lifecycle is covered by `tests/test_assessment_api.py`; a manual Swagger run needs a position with skills for the HR user's employee (employee 1's position has none yet).

**Done when:** a full lifecycle via Swagger works for the HR user linked to employee 1, and the no-leak test passes.

## Phase 10 — Vocabulary alignment (D17)
- [x] Pass active bank skill names to `generate_perfect_profile` as preferred names (`ai/perfect_profile.py`, `services/position_skill_service.py`, `crud/question_bank.skill_names_with_questions`); tests in `tests/test_position_vocabulary.py`
- [x] Checked coverage of existing positions (read-only): 6 of 10 fully assessable, the rest miss only skipped vague skills; HR Manager (employee 1) has no skills yet
- [x] 9 target positions created by `app/scripts/seed_assessment_demo.py` with fixed bank skills (not via Gemini, so every skill is testable and the data is reproducible), one mock employee each (DEMO001–DEMO009, mixed gap categories) and an Employee login each (password `Demo@1234`); run on the dev DB (backup `.db_backups/ai_hr_assistant_before_demo_seed.sql`); tests in `tests/test_seed_assessment_demo.py`

## Phase 11 — React integration (`my_frontend`)
- [ ] `services/assessmentService.ts`; rewrite `types/assessment.ts`
- [ ] New `pages/AssessmentsPage.tsx` (preview + start/resume + history)
- [ ] Rewire `AssessmentInstructionsPage`, `AssessmentPage`, `AssessmentResultPage`
- [ ] Server-backed `useAssessmentAttempt`; `useAssessmentSecurity` reports violations; timer capped by `expires_at`
- [ ] Routes in `App.tsx`; fix the sidebar link in `AppLayout.tsx`
- [ ] Verified badges + history in `EmployeeDetailsPage`; verified levels in `GapAnalysisResultPage`; `types/employeeSkills.ts`
- [ ] Delete `data/mockAssessment.ts`
- [ ] Employee portal (D1 = A+B+C): role-aware `ProtectedRoute` / login, employee layout
- [ ] HR "Assign assessment" + "Run on behalf" on `EmployeeDetailsPage`; employee "Assigned to you" card
- [ ] Heartbeat every 20 s; "open on another device" screen with retry
- [ ] Remove Expert from level types, selects and badges; skill names shown lowercase (optional CSS capitalize)
- [ ] `npm run lint` and `npm run build` pass; manual run-through: start → refresh (same questions) → answer → submit → result → profile updated

## Phase 12 — Docs and cleanup
- [ ] Update `docs/assessment.md`, `docs/api.md`, `docs/database.md`, `docs/backend.md`, `docs/setup.md` (migration + import step), `README.md` status table
- [ ] Delete root `testing_assessments.py`
- [ ] Remove `backend/app/services/old/skill_gap_service.py` / `skill_alias_service.py` together with `backend/test_skill_alias_system.py` (optional cleanup)
