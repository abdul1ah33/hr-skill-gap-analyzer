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

---

## Next

### 🔜 Phase 5 — Importer
- [ ] `services/question_bank_import_service.py`: parse → validate → map skill by lowercase name (create if missing) → `content_hash` upsert → deactivate removed questions → report
- [ ] `scripts/import_question_bank.py` (`--dry-run`, `--strict`), reading the curated file and everything under `generated/` (`source = curated` / `generated:<model>` / `claude`)
- [ ] Integration tests; run on the dev DB; send the rejected-question report to the teammate

### ⬜ Phase 6 — Scoring (pure)
- [ ] 18-entry table from plan §A.7, `SCORING_RULES_VERSION = "2026-10-08.v1"`, unit tests for all 18 cases

### ⬜ Phase 7 — Comparison integration and targeting
- [ ] `skill_id` in comparison results; target selection (matched → needs_improvement → unmatched, essential first, cap 8, 30-day cooldown)

### ⬜ Phase 8 — Generation and persistence
- [ ] Random 1 B / 2 I / 2 A per skill (prefer unseen), option shuffle, single transaction, idempotent start, expiry

### ⬜ Phase 9 — API, grading, profile application
- [ ] Employee, HR-assign and HR-on-behalf endpoints; session lock + heartbeat; grading; None → delete employee skill

### ⬜ Phase 10 — Gemini vocabulary alignment
### ⬜ Phase 11 — React integration (`my_frontend`)
### ⬜ Phase 12 — Docs and cleanup

---

## Open issues

- ✅ ~~Answer-length bias~~ fixed: 183 Claude-written and 77 Gemini-written questions had a correct option >15% longer than every other option. Near-miss options were rewritten (and 40 overly long Gemini correct answers shortened); now 0 in both files. The generator rejects such questions from now on (`MAX_CORRECT_LENGTH_RATIO` in `app/ai/question_generator.py`).
- ✅ ~~`POST /skills` broken~~ fixed: create/update accept only `name` (normalised to lowercase); responses still include `category`/`description` as null. Tests added (16 passing).
- ✅ ~~Leftover database `ai_hr_assistant_migration_test`~~ dropped.
- ✅ ~~Teammate's bank: 22 invalid questions~~ fixed in `output_question_bank.jsonl`: duplicated option types retyped, duplicate 7th options dropped, and wrong answers corrected (Python descriptors, JavaScript generator, accounting retail method 59.5%, two-stage DDM $46.17, Gordon growth reworded, thermodynamics reworded to the computable initial liquid mass, PyTorch autograd, `git switch -c` replaced as it was also correct). Google Ads #19 was valid; option uniqueness is now case-sensitive. The whole bank passes validation.
- ⚠️ **`backend/app/test_ai_service.py`** imports `ai.perfect_profile`, which doesn't exist (pre-existing).
- ✅ Committed in 13 commits and pushed to `origin/main` (2026-10-08).
