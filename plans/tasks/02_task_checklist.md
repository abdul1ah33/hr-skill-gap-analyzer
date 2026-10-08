# Skill Assessment — Task Checklist

Phases follow plan §12. Section references (§) point to `00_skill_assessment_implementation_plan.md`; D-numbers point to `01_decisions_needed.md`.

---

## Phase 0 — Decisions
- [ ] Decide D1, D2, D4, D5 (blocking)
- [ ] Decide D3, D6, D8, D10, D12, D13, D15
- [ ] Record the answers in `01_decisions_needed.md`

**Done when:** every 🔴 item has an answer.

## Phase 1 — Test infrastructure
- [ ] Add `pytest` to `backend/requirements.txt`
- [ ] `backend/pytest.ini` (testpaths, markers `unit` / `integration`)
- [ ] `backend/tests/conftest.py`: `TEST_DATABASE_URL`, `alembic upgrade head` once, transactional session per test, `TestClient` with `get_db` override, user/employee/JWT factories
- [ ] Create the `ai_hr_assistant_test` Postgres database (document in `docs/setup.md`)

**Done when:** an empty smoke test runs against the test DB.

## Phase 2 — Models, migration, legacy removal
- [ ] `models/skill_question.py`, `models/skill_question_option.py` (§2.3–2.4)
- [ ] Rewrite `models/assessment.py`, `assessment_skill.py`, `assessment_question.py` (§2.5–2.7)
- [ ] Add `verified`, `last_assessed_at`, `last_assessment_id` to `models/employee_skill.py` (§2.8)
- [ ] Update relationships in `skill.py`, `employee.py`, `user.py`; update `models/__init__.py`
- [ ] Delete `models/assessment_result.py`, `models/assessment_answer.py`
- [ ] Delete `api/endpoints/assessment.py`, `services/old/assessment_service.py`; remove the router from `main.py`
- [ ] Hand-written Alembic revision (§14): guard against non-empty legacy tables, drop legacy, create enums, tables, indexes and the partial unique index, alter `employee_skills`, full downgrade
- [ ] Fix `schemas/employee_skill.py` and `crud/employee_skill.py` (`last_assessed_at`, reset `verified` on manual edit)

**Done when:** `alembic upgrade head` and `alembic downgrade -1` both succeed on a copy of the dev DB, and the app starts.

## Phase 3 — Skill deletion safety
- [ ] Shared helper `is_skill_referenced(db, skill_id)` (position_skills, employee_skills, skill_questions, assessment_skills)
- [ ] Use it in `positions.py` orphan cleanup (both functions)
- [ ] `DELETE /skills/{id}` → `SkillInUseError` (409) when referenced by bank/history
- [ ] Tests (§13 "Skill deletion safety")

**Done when:** changing a position title never deletes a skill that has questions or employee holders.

## Phase 4 — Question-bank schemas and validation
- [ ] `schemas/question_bank.py`: `ImportOption`, `ImportQuestion` (exactly 6 options, exact type set, unique option texts, non-empty fields, level ∈ B/I/A), `ImportSkillBank` (unique question texts)
- [ ] Merge `schemas/questions.py` into it; delete the old file (keep `QuestionChunk` only if the generator needs it)
- [ ] Unit tests, including the 21 real invalid questions as fixtures

## Phase 5 — Importer
- [ ] `services/question_bank_import_service.py`: parse → validate → skill mapping (override map → case-insensitive name → create; never via aliases) → `content_hash` upsert → deactivate missing → report
- [ ] `scripts/import_question_bank.py` with `--dry-run`, `--strict`, optional path
- [ ] `data/question_bank/skill_name_map.json` (start with `{"risk management": "Risk Management"}` if D9 = keep names)
- [ ] Integration tests (§13 "Import")
- [ ] Run on the dev DB; save the report; send the rejected-question list to the teammate

**Done when:** a second run reports 0 inserted, and all 83 skills are assessable.

## Phase 6 — Scoring (pure)
- [ ] `services/assessment_scoring_service.py`: 18-entry `(B, I, A) → level` table from D4, `SCORING_RULES_VERSION`
- [ ] Unit tests for all 18 combinations

## Phase 7 — Comparison integration and targeting
- [ ] `skill_comparison_service.py`: add `skill_id` to every entry
- [ ] (Optional) strip `skill_id` in `gap_analysis_service.py` before calling Gemini
- [ ] `services/assessment_target_service.py`: categories (D2), bank availability, ordering and cap (D3), cooldown (D10), not-assessable reasons
- [ ] `crud/question_bank.py`: availability counts, seen-question ids per employee
- [ ] Tests: comparison still returns the same categories; target selection rules

## Phase 8 — Generation and persistence
- [ ] `services/assessment_generation_service.py`: per-level sampling with `SystemRandom`, prefer unseen, option shuffle into `option_order`, single transaction
- [ ] Idempotent start: return the existing IN_PROGRESS assessment; handle the partial-index race
- [ ] Expiry handling (D12), `expires_at` computation (D15)
- [ ] `crud/assessment.py`: owner-scoped loaders, `FOR UPDATE` loader
- [ ] Tests (§13 "Random selection", "Persistence")

## Phase 9 — API, grading and profile application
- [ ] `auth/dependencies.py`: `get_current_user_with_employee`
- [ ] `core/config.py`: assessment settings
- [ ] `core/exceptions.py` + `exception_handlers.py`: assessment exceptions (§10.6)
- [ ] Rewrite `schemas/assessment.py` (§10.4–10.5)
- [ ] `services/assessment_service.py` facade: preview, start, get, answer, violation, submit, result, list
- [ ] Grading + profile application per D5, D6, D7, D13 (§9.4–9.5)
- [ ] `api/endpoints/assessments.py` (§10.3); register in `main.py` with prefix `/assessments`
- [ ] HR: `GET /employees/{employee_id}/assessments` (explicit HR dependency); `api/endpoints/question_bank.py` coverage
- [ ] Tests (§13 "Authorization", "Answer validation", "No-leak", "Scoring", "Profile application")

**Done when:** a full lifecycle via Swagger works for the HR user linked to employee 1, and the no-leak test passes.

## Phase 10 — Vocabulary alignment (D17)
- [ ] Pass active bank skill names to `generate_perfect_profile` as preferred names (`ai/perfect_profile.py`, `services/position_skill_service.py`)
- [ ] Create or regenerate the 9 target positions; check coverage via `GET /question-bank/skills` / the position coverage endpoint

## Phase 11 — React integration (`my_frontend`)
- [ ] `services/assessmentService.ts`; rewrite `types/assessment.ts`
- [ ] New `pages/AssessmentsPage.tsx` (preview + start/resume + history)
- [ ] Rewire `AssessmentInstructionsPage`, `AssessmentPage`, `AssessmentResultPage`
- [ ] Server-backed `useAssessmentAttempt`; `useAssessmentSecurity` reports violations; timer capped by `expires_at`
- [ ] Routes in `App.tsx`; fix the sidebar link in `AppLayout.tsx`
- [ ] Verified badges + history in `EmployeeDetailsPage`; verified levels in `GapAnalysisResultPage`; `types/employeeSkills.ts`
- [ ] Delete `data/mockAssessment.ts`
- [ ] If D1 = employee portal: role-aware `ProtectedRoute` / login, employee layout
- [ ] `npm run lint` and `npm run build` pass; manual run-through: start → refresh (same questions) → answer → submit → result → profile updated

## Phase 12 — Docs and cleanup
- [ ] Update `docs/assessment.md`, `docs/api.md`, `docs/database.md`, `docs/backend.md`, `docs/setup.md` (migration + import step), `README.md` status table
- [ ] Delete root `testing_assessments.py`
- [ ] Remove `backend/app/services/old/skill_gap_service.py` / `skill_alias_service.py` together with `backend/test_skill_alias_system.py` (optional cleanup)
