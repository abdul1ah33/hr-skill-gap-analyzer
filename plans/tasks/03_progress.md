# Skill Assessment — Progress

Last updated: 2026-10-08. The detailed checklist is in `02_task_checklist.md`; decisions are in `01_decisions_needed.md`; the design is in `00_skill_assessment_implementation_plan.md` (§A overrides older sections).

Legend: ✅ done · 🔜 next · ⬜ not started · ⚠️ open issue

---

## Done

### ✅ Phase 0 — Decisions
- [x] D1, D3, D4, D5, D6 answered; D2, D7, D8, D10, D12, D13, D15 confirmed as "defaults OK"
- [x] Skill names stored in lowercase; CV skill test endpoint `/assessment` kept; orphan skills never deleted

### ✅ Phase 1 — Test infrastructure
- [x] `pytest` in `backend/requirements.txt`, `backend/pytest.ini`
- [x] `backend/tests/conftest.py`: separate test DB (`<dev db>_test`, rebuilt from migrations each run), rollback per test, `TestClient`, factories (role, user, employee, position, skill, position/employee skill, auth headers)
- [x] `app/scripts/seed_roles.py` (HR + Employee, idempotent); `Employee` role created in the dev DB
- [x] `docs/setup.md`: role seed, new migration, running tests

### ✅ Phase 2 — Models, migration, legacy removal
- [x] New models: `SkillQuestion`, `SkillQuestionOption` (`models/skill_question.py`), enums (`models/assessment_enums.py`)
- [x] Rewritten: `Assessment` (assignment, session lock, config snapshot), `AssessmentSkill`, `AssessmentQuestion`
- [x] `employee_skills`: `verified`, `last_assessed_at`, `last_assessment_id`
- [x] Removed `AssessmentResult`, `AssessmentAnswer` models and the unused `old_Ollama/` endpoint folder
- [x] `EXPERT` removed from `SkillLevel` (model, comparison service, old CV gap service)
- [x] Lowercase skill names: `utils/skill_names.normalize_skill_name`, used by skill/alias schemas, position skill generation, resume import and the alias seed
- [x] Migration `a7c3e91d4b20`: tested upgrade → downgrade → upgrade on a copy, `alembic check` clean, **applied to the dev DB** (backup in `.db_backups/`)
- [x] Employee skill schema/CRUD: `verified` reset on manual level change; removed non-existent fields

### ✅ Phase 3 — Skill deletion safety
- [x] Deleting a position or changing its title never deletes `Skill` rows
- [x] `DELETE /skills/{id}` returns 409 when the skill has bank questions or assessment history
- [x] Tests: 16 passing at the end of Phase 3 (`test_smoke.py`, `test_skill_deletion_safety.py`, `test_skill_names.py`)

### ✅ Question generation (Phase 5b, done early)
- [x] Strict bank validation: `app/schemas/question_bank.py` (finds 22 invalid questions in the teammate's bank)
- [x] Gemini generator: `app/ai/question_generator.py` + `app/scripts/generate_question_bank.py` (resumable; parked for later use)
- [x] All 67 non-vague position skills covered, 15 questions each (5 B / 5 I / 5 A):
  - 19 skills by Gemini → `app/data/question_bank/generated/gemini_position_skills.jsonl`
  - 48 skills by Claude → `app/data/question_bank/generated/claude_position_skills.jsonl`
- [x] 12 vague skills skipped (`SKIPPED_SKILLS` in the generator script)

### ✅ Phase 4 — Question-bank schemas and validation
- [x] Old `schemas/questions.py` deleted (nothing imported it); `schemas/question_bank.py` is the only bank format
- [x] Length-bias check moved into `schemas/question_bank.py` (`correct_is_obviously_longest`) so the generator and the importer share it
- [x] `tests/test_question_bank_schema.py`: every rule, the 21 original invalid questions as fixtures (`tests/fixtures/question_bank_cases.json`; Google Ads #19 as a must-stay-valid case), and every bank file in the repo validated (generated files also checked for length bias and 1 B / 2 I / 2 A coverage)
- [x] 58 tests passing

### ✅ Phase 5 — Importer
- [x] `app/services/question_bank_import_service.py`: validate each question → match skill by lowercase name (create if missing; optional `skill_name_map.json`) → `content_hash` upsert → deactivate questions removed from a file (scoped to the imported sources) → report (rejections with file/line, not-assessable skills, small pools, length-bias warnings)
- [x] `app/scripts/import_question_bank.py` (`--dry-run`, `--strict`, `--report`, optional paths); sources `curated` and `generated:<model>`
- [x] `tests/test_question_bank_import.py`: 15 tests (fresh import, lowercase match, name map, idempotent re-run, changed → new row + old deactivated, removed → deactivated then reactivated, source scoping, invalid/strict, not assessable, dry run, the real bank)
- [x] **Imported into the dev DB**: 3,495 questions (20,970 options), 64 skills created, 0 rejected, every skill assessable; second run 0 inserted. Backup in `.db_backups/ai_hr_assistant_before_question_import.sql`
- [x] Every position skill has questions except the 12 skipped vague ones
- [x] `docs/setup.md` and `docs/assessment.md`: import step
- [x] 73 tests passing

### ✅ Phase 6 — Scoring (pure)
- [x] `app/services/assessment_scoring_service.py`: explicit 18-entry `(B, I, A) → level` table from §A.7, `SCORING_RULES_VERSION = "2026-10-08.v1"`
- [x] `score_skill`: counts correct answers per level; unanswered = wrong; rejects anything other than 1 B / 2 I / 2 A
- [x] `profile_action_for(claimed, assessed)`: CREATED / NO_CHANGE / REMOVED / UPGRADED / DOWNGRADED / CONFIRMED (§A.8), ready for grading in Phase 9
- [x] `tests/test_assessment_scoring.py`: all 18 outcomes, the table checked against the short rule, layout errors, every profile action; 135 tests passing

### ✅ Phase 7 — Comparison integration and targeting
- [x] `skill_comparison_service.py`: every entry has `skill_id`; `gap_analysis_service.py` removes it before sending the comparison to Gemini (the API response still includes it)
- [x] `app/services/assessment_target_service.py`: candidates = every required skill (matched / needs_improvement / unmatched, not additional), ordered matched → needs_improvement → unmatched, essential first, then name; skills without 1 B / 2 I / 2 A active questions skipped as `no_question_bank` / `insufficient_questions`; cap `ASSESSMENT_MAX_SKILLS` (default 8, `core/config.py`), rest `over_limit`
- [x] Errors in `core/exceptions.py`: `PositionHasNoSkillsError`, `NoAssessableSkillsError` (carries the not-assessable list); HTTP handlers come in Phase 9
- [x] `app/crud/question_bank.py`: active question counts per skill and level
- [x] Test factory `bank_questions(skill, beginner, intermediate, advanced, is_active)`; `tests/test_assessment_targets.py` (11 tests); 146 tests passing
- [x] Checked read-only on the dev DB: e.g. Machine Learning Engineer → 8 skills tested, 4 over limit
- ⏸️ **Retake cooldown (D10) postponed by the user**; to be implemented later

### ✅ Phase 8 — Generation and persistence
- [x] `app/services/assessment_generation_service.py` `start()`:
  - returns the running assessment if there is one (same questions, same option order → refresh-safe)
  - starts an HR-assigned assessment in place (keeps `assigned_by`), otherwise creates a new one
  - per skill 1 B / 2 I / 2 A with `SystemRandom`, unseen questions first, then seen ones; Beginner → Intermediate → Advanced inside a skill
  - options shuffled once into `option_order`; config snapshot (`seconds_per_question`, `max_violations`), position snapshot, `expires_at = start + questions × 60 s + 120 s`
  - one transaction; losing the race on the one-active-assessment index returns the winner's assessment
  - an in-progress assessment past `expires_at` is marked EXPIRED and a new one starts (**grading of expired attempts comes with Phase 9**)
- [x] `app/crud/assessment.py` (owner-scoped and `FOR UPDATE` loaders, served question ids); `crud/question_bank.py` pools and option ids
- [x] Settings in `core/config.py` and `docs/setup.md`: `ASSESSMENT_SECONDS_PER_QUESTION` (60), `ASSESSMENT_GRACE_SECONDS` (120), `ASSESSMENT_MAX_VIOLATIONS` (3)
- [x] `tests/test_assessment_generation.py` (14 tests); 160 tests passing
- [x] Checked on the dev DB inside a rolled-back transaction: Machine Learning Engineer → 8 skills, 40 questions, 42 min deadline

### ✅ Phase 9 — API, grading, profile application
- [x] Endpoints (`api/endpoints/assessments.py`, `employee_assessments.py`, `question_bank.py`, registered in `main.py`):
  - employee: preview, start/resume (opens the session), history, detail, session, heartbeat, answer, violations, submit, result
  - HR: list, assign (`due_at` optional), cancel, start on behalf; question bank coverage
- [x] `app/services/assessment_service.py`: owner-or-HR access (404 for others), single open session (token hash, 60 s takeover, `ASSESSMENT_OPEN_ELSEWHERE` with `held_by` / `retry_after_seconds`, same token resumes after refresh), row locks on every write, lazy expiry, responses built field by field (no answer data can leak)
- [x] `app/services/assessment_grading_service.py`: grades every skill with the scoring table; submitted and expired → applied (None deletes the employee skill, otherwise level set or created with `verified = true`); terminated (3 violations) → graded, `not_applied`. Expired tests found by `start()` are now graded too
- [x] `app/schemas/assessment.py` rewritten (the old unused file replaced); assessment errors share one handler returning `{"detail", "code", …}`; `get_current_user_with_employee`; `ASSESSMENT_SESSION_TIMEOUT_SECONDS`
- [x] Docs: `docs/api.md` (Skill Assessments section), `docs/setup.md` (setting)
- [x] `tests/test_assessment_api.py` (27 tests: no-leak, sessions and takeover, answers, ownership, grading and every profile action, violations, expiry, HR assign / cancel / on behalf, coverage, auth); 187 tests passing
- ⚠️ Manual Swagger run not done: the HR user's employee (1) has a position without skills. Any employee with a generated position can be used once a user is linked to it

### ✅ Phase 10 — Gemini vocabulary alignment
- [x] `generate_perfect_profile(..., preferred_skill_names)`: the prompt lists the bank's skill names; Gemini must reuse a name exactly when it means the same skill and must not add skills just because they're listed (`build_prompt` in `ai/perfect_profile.py`)
- [x] `PositionSkillService` passes `skill_names_with_questions(db)` (skills with active questions)
- [x] `tests/test_position_vocabulary.py` (5 tests); 192 tests passing; docs updated (`assessment.md`, `backend.md`)
- [x] Coverage of existing positions (assessable / required skills): Computer Engineering Student 15/16, ML Engineer & Software Developer 16/18, Machine Learning Engineer 12/12, Senior Supply Chain Specialist 12/12, Software Engineer 15/16, Operation Engineer 12/17, Petrochemical Shift Supervisor 6/10, AI & ML Engineer 20/20, Electrical Power Engineer 10/10, HR Manager 0/0
- [x] **Demo data** (`app/scripts/seed_assessment_demo.py`, documented in `docs/setup.md`): 9 positions from the bank's skill families with fixed bank skills, one mock employee each (DEMO001–DEMO009) with matched / needs-improvement / unmatched skills, Employee logins `firstname.lastname` / `Demo@1234`. Seeded into the dev DB; checked end to end in a rolled-back transaction (employee login → preview → start 35 questions; HR assign → start on behalf 40 questions). 195 tests passing
- Agreed HR flow for Phase 11: HR "Start test" on any employee = assign + start on behalf (two calls behind one button); HR "Assign test" = assign only, the employee starts it from their own account

---

## Next

### 🔜 Phase 11 — React integration (`my_frontend`)
### ⬜ Phase 12 — Docs and cleanup

---

## Open issues

- ✅ ~~Answer-length bias~~ fixed: 183 Claude-written and 77 Gemini-written questions had a correct option >15% longer than every other option. Near-miss options were rewritten (and 40 overly long Gemini correct answers shortened); now 0 in both files. The generator rejects such questions from now on (`MAX_CORRECT_LENGTH_RATIO` in `app/ai/question_generator.py`).
- ✅ ~~`POST /skills` broken~~ fixed: create/update accept only `name` (normalised to lowercase); responses still include `category`/`description` as null. Tests added (16 passing).
- ✅ ~~Leftover database `ai_hr_assistant_migration_test`~~ dropped.
- ✅ ~~Teammate's bank: 22 invalid questions~~ fixed in `output_question_bank.jsonl`: duplicated option types retyped, duplicate 7th options dropped, and wrong answers corrected (Python descriptors, JavaScript generator, accounting retail method 59.5%, two-stage DDM $46.17, Gordon growth reworded, thermodynamics reworded to the computable initial liquid mass, PyTorch autograd, `git switch -c` replaced as it was also correct). Google Ads #19 was valid; option uniqueness is now case-sensitive. The whole bank passes validation.
- ⚠️ **Length bias in the teammate's bank:** in 1,534 of the 2,490 curated questions the correct option is more than 15% longer than every other option. They import fine (warning only), but test-takers can often guess by picking the longest answer. Options: rewrite the near-miss/misconception options as was done for the generated files, or ask the teammate to.
- ⚠️ **`backend/app/test_ai_service.py`** imports `ai.perfect_profile`, which doesn't exist (pre-existing).
- ✅ Committed in 13 commits and pushed to `origin/main` (2026-10-08).
