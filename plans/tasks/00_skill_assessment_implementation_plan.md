# Skill Assessment System — Implementation Plan

Source spec: `plans/skill_assessment_feature.md`
Status: **plan only — nothing implemented yet**
Companion files:
- `plans/tasks/01_decisions_needed.md`: open decisions that block or shape implementation
- `plans/tasks/02_task_checklist.md`: phase-by-phase checklist with acceptance criteria

---

## 0. What the codebase analysis found (read this first)

These facts come from the code, the question-bank file and a **read-only** query against the local dev database. They shape the plan below.

### 0.1 Question bank data

`backend/app/data/question_bank/output_question_bank.jsonl`

| Fact | Value |
|---|---|
| Skills | 83, all names unique (also case-insensitively) |
| Questions | 2,490: **exactly 10 Beginner / 10 Intermediate / 10 Advanced for every skill** |
| Duplicate question texts | 0 |
| Longest question text | 1,221 chars |
| Longest option text | 1,528 chars, and **168 options are longer than 255 chars**, so options need `Text` columns (the legacy `option_a…d` columns are `String(255)`) |
| **Questions that break the spec** | **21** (listed below) |

The spec says each question has exactly 6 options with one of each type. 21 questions violate that:

| Problem | Count | Examples |
|---|---|---|
| Two `correct` options | 8 | Python #26, JavaScript #15, accounting #17, financial analysis #16 & #18, PyTorch #21 & #25, thermodynamics #13 |
| 7 options | 8 | JavaScript #15, Apache Kafka #21 & #24, accounting #17, financial analysis #16 & #18, PyTorch #21, Autodesk AutoCAD #26 |
| 5 options | 1 | PyTorch #25 |
| Duplicate non-correct type, one type missing (6 options, one correct) | 10 | Docker #22, Microsoft Excel #5, Git #5 & #18, TensorFlow #22, SAS #19, PTC Creo #24, Google Analytics #11, food safety standards #6 & #8 |

(Indexes are 0-based positions inside each skill's `questions` array. Some questions have more than one problem.)

Even after dropping all 21, every skill keeps at least 8 valid questions per level, which is enough for 1/2/2 selection.

### 0.2 Skill-name coverage against the real database

Read-only query against the dev DB (`alembic_version = f2908fc365d4`):

| Fact | Value |
|---|---|
| `skills` rows | 235 |
| Bank skills that already exist as a `Skill` (exact name) | 18 |
| Bank skills that exist only with different casing | 1 (`risk management` vs `Risk Management`) |
| Bank skills with no matching `Skill` | 64 (would be created on import) |
| Distinct skills currently required by positions | 92 |
| **Of those, covered by the bank** | **13**: Python, JavaScript, Docker, Kubernetes, Ansible, Git, Machine Learning, Deep Learning, TensorFlow, PyTorch, MATLAB, Project Management, Risk Management |
| Existing positions | HR Manager, Software Engineer, Machine Learning Engineer, Senior Supply Chain Specialist, Electrical Power Engineer, … (most are not among the 9 target position families) |

**Consequence:** with today's data, most required skills are **not assessable**. The design must handle "no question bank for this skill" as a normal case, and Phase 9 (vocabulary alignment) is what makes the feature useful for new positions.

Bank names mix styles: ESCO-style lowercase (`accounting`, `recruit personnel`, `manage restaurant service`) and O*NET-style tool names (`Amazon Web Services AWS CloudFormation`, `Intuit QuickBooks`). Gemini's `perfect_profile` normalizes to short industry names (`AWS`, `SQL`, `CI/CD`), so exact matches will stay rare unless Gemini is given the bank's vocabulary.

### 0.3 Other code facts that affect the design

| Finding | Where | Impact |
|---|---|---|
| Legacy assessment tables exist but have **0 rows** | `assessments`, `assessment_questions`, `assessment_results`, `assessment_answers`, `assessment_skills` | Safe to drop and recreate; no data migration needed |
| Legacy `/assessment` endpoint is an AI text report, not a test, and imports Ollama code via `backend.app.services.old…` | `backend/app/api/endpoints/assessment.py`, `backend/app/services/old/assessment_service.py` | Remove |
| `SkillComparisonService` returns skill **names only**, no `skill_id` | `backend/app/services/skill_comparison_service.py` | Small additive change needed |
| **Orphan-skill cleanup deletes any `Skill` no position references** (and cascades to `employee_skills`) | `backend/app/api/endpoints/positions.py` (`_delete_position_skills_and_orphan_skills`, `_cleanup_orphan_skills_for_ids`) | Would destroy question-bank skills, or fail once they're protected by a foreign key. **Must be fixed.** |
| `EmployeeSkillResponse` exposes `verified`, `last_assessed`, `years_experience`, but `employee_skills` has **none of these columns**. `crud.update_employee_skill` sets `last_assessed` on a non-existent column. | `backend/app/schemas/employee_skill.py`, `backend/app/crud/employee_skill.py` | Add real columns for assessment tracking |
| `skilllevel` Postgres enum stores names: `BEGINNER, INTERMEDIATE, ADVANCED, EXPERT` | migration `b6b4472c0459` | Reuse it for question levels |
| DB has **only the `HR` role** and one user (`abdullah`, HR, linked to employee 1). No `Employee` role or employee users exist. | `roles`, `users` | Who takes the test is a real product decision (see D1) |
| `get_current_employee` requires role `Employee` | `backend/app/auth/dependencies.py` | Need a dependency that accepts any authenticated user linked to an employee |
| Seed aliases treat categories as aliases (`Python` → alias of `Computer Programming`, `Docker` → `Containerization`) | `backend/app/scripts/seed_skill_aliases.py` | **Do not** resolve bank skills through `skill_aliases`: it would map Python questions onto "Computer Programming" |
| No `tests/` folder; `pytest` not in requirements (`httpx` is) | `backend/` | Testing infrastructure must be added |
| Frontend assessment uses string option ids (`"A"`), a 5-second timer, a hard-coded `employeeId: 1` and mock data | `my_frontend/src/...` | Rewire to the API |

---

## 1. Architecture

### 1.1 Concepts

```
PERMANENT (imported once, reused)            PER ATTEMPT (created when an employee starts)
───────────────────────────────────          ──────────────────────────────────────────────
Skill                                        Assessment            (one attempt by one employee)
 └── SkillQuestion        (~30 per skill)     └── AssessmentSkill   (one per tested skill: snapshot + result)
      └── SkillQuestionOption (6 per q)            └── AssessmentQuestion (5 per skill: which bank question,
                                                                           shuffled option order, answer)
```

- The **question bank** belongs to a `Skill` and never changes during an attempt.
- An **assessment** stores references to bank questions plus everything needed to grade them and to reproduce what the employee saw.
- **Grading, level calculation and profile updates happen only in the backend.**

### 1.2 End-to-end flow

```
Employee (authenticated, user.employee_id set)
   │ GET /assessments/preview
   ▼
AssessmentTargetService
   ├─ SkillComparisonService.compare_employee_to_position()   (existing, + skill_id)
   ├─ keep categories in scope (see D2): matched / needs_improvement / unmatched
   ├─ check each skill has an active question bank (≥1 B, ≥2 I, ≥2 A)
   └─ apply ordering + cap (see D3)
   │ → assessable skills + not-assessable skills (with reason)
   │
   │ POST /assessments         (start: idempotent, returns the existing in-progress attempt)
   ▼
AssessmentGenerationService
   ├─ for each target skill: random sample 1 B + 2 I + 2 A from active questions
   │   (prefer questions this employee has never seen)
   ├─ shuffle each question's options server-side, store the order
   ├─ snapshot claimed level / required level / category per skill
   └─ persist Assessment → AssessmentSkill → AssessmentQuestion (single transaction)
   │
   ▼
Frontend gets SAFE payload: question ids (attempt-scoped), text, level, options as {id: 1..6, text}
   │
   │ PUT /assessments/{id}/answers/{question_id}   {option_id}   (autosave, refresh-safe)
   │ POST /assessments/{id}/violations             {reason}
   │ POST /assessments/{id}/submit
   ▼
AssessmentScoringService
   ├─ correctness = selected option's type == "correct" (all other types = wrong)
   ├─ per skill: count B / I / A correct → level via the scoring table (see §9, D4)
   └─ store per-skill result
   ▼
EmployeeSkill update (see D5–D7)
   ├─ level := assessed level (create the row for unmatched skills that score ≥ Beginner)
   ├─ verified = true, last_assessed_at, last_assessment_id
   ▼
Next skill-gap analysis automatically reflects the verified levels
```

### 1.3 Layering (matches existing conventions)

| Layer | Existing pattern | New code |
|---|---|---|
| Router | `app/api/endpoints/*.py`, registered in `app/main.py` with a prefix | `app/api/endpoints/assessments.py` |
| Services | `app/services/*_service.py` (class per service, `db` passed in) | target, generation, scoring, import services |
| CRUD | `app/crud/*.py` | `app/crud/assessment.py`, `app/crud/question_bank.py` |
| Schemas | `app/schemas/*.py` (Pydantic v2, `from_attributes`) | `app/schemas/assessment.py` (rewrite), `app/schemas/question_bank.py` |
| Errors | `app/core/exceptions.py` + `app/core/exception_handlers.py` | new assessment exceptions + handlers |
| Scripts | `app/scripts/seed_skill_aliases.py` (runnable with `python app/scripts/…`) | `app/scripts/import_question_bank.py` |

---

## 2. Database design

### 2.1 Naming recommendation

The spec proposed `AssessmentQuestion` / `AssessmentOption` for the **permanent bank**. I recommend **not** doing that:

- "AssessmentQuestion" naturally reads as "a question inside an assessment", which is exactly the per-attempt concept.
- The bank is owned by a **skill**, not by an assessment.

| Concept | Model | Table |
|---|---|---|
| Permanent bank question | `SkillQuestion` | `skill_questions` |
| Permanent bank option | `SkillQuestionOption` | `skill_question_options` |
| One employee attempt | `Assessment` | `assessments` (recreated) |
| Skill tested in an attempt | `AssessmentSkill` | `assessment_skills` (recreated) |
| Question presented in an attempt (+ answer) | `AssessmentQuestion` | `assessment_questions` (recreated) |

**Why no separate `AssessmentAttempt` / template table:** there is no reusable "assessment definition"; every assessment is generated per employee from their gap. A retake is just a new `Assessment` row. A template table would be empty overhead (YAGNI). If HR-authored fixed tests are wanted later, add `assessment_templates` then.

**Why no separate `AssessmentAnswer` table:** each presented question has at most one answer, so the answer lives on `AssessmentQuestion` (1:1). Changing an answer before submit overwrites it; the history of intermediate clicks has no business value. If answer-change auditing is ever needed, add `assessment_answer_events`.

### 2.2 New enums

| Python enum | Postgres type | Values | Location |
|---|---|---|---|
| `SkillLevel` (existing) | `skilllevel` (existing) | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT | reuse; questions only use the first three (validated in Pydantic + DB `CHECK`) |
| `QuestionOptionType` | `questionoptiontype` | CORRECT, NEAR_MISS, MISCONCEPTION, PLAUSIBLE_WRONG_1, PLAUSIBLE_WRONG_2, PLAUSIBLE_WRONG_3 | `app/models/skill_question_option.py` |
| `AssessmentStatus` | `assessmentstatus` | IN_PROGRESS, SUBMITTED, EXPIRED, TERMINATED | `app/models/assessment.py` |
| `SkillGapCategory` | `skillgapcategory` | MATCHED, NEEDS_IMPROVEMENT, UNMATCHED, ADDITIONAL | `app/models/assessment_skill.py` |

Follow the existing pattern: `class X(str, enum.Enum)` + `SQLAlchemyEnum(X)` (stores member names).

### 2.3 `skill_questions` (new): permanent bank

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| skill_id | FK `skills.id`, **ON DELETE RESTRICT**, not null, indexed | A skill with a bank can't be deleted silently |
| question_text | Text, not null | |
| proficiency_level | `skilllevel`, not null | CHECK level ≠ EXPERT |
| content_hash | String(64), not null, **unique** | sha256 of normalized (skill name + question text + options' text/type). Basis for idempotent import and immutability. |
| is_active | Boolean, not null, default true | Inactive = never selected again (removed from source file or failed validation on re-import). Kept for history. |
| source | String(255), nullable | e.g. `output_question_bank.jsonl` |
| created_at / updated_at | DateTime(tz) | match existing style |

Indexes: `ix_skill_questions_skill_level_active (skill_id, proficiency_level, is_active)`, which serves the selection query.
Relationships: `skill` (many-to-one), `options` (one-to-many, `cascade="all, delete-orphan"`, ordered by id).
Rule: **rows are immutable once imported.** A content change creates a new hash, which means a new row; the old row is deactivated. Historical attempts therefore always point to exactly what the employee saw.

### 2.4 `skill_question_options` (new)

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | **Never sent to the frontend** |
| question_id | FK `skill_questions.id`, ON DELETE CASCADE, not null, indexed | |
| text | Text, not null | |
| option_type | `questionoptiontype`, not null | backend-only |
| explanation | Text, not null | backend-only |

Constraints: `UNIQUE(question_id, option_type)`, which enforces one option of each type (and hence exactly one CORRECT) at DB level. A partial unique index `(question_id) WHERE option_type='CORRECT'` is then redundant. Exactly-6 is enforced by the importer (can't express count in a simple constraint).

### 2.5 `assessments` (recreated): one attempt

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| employee_id | FK `employees.id`, ON DELETE CASCADE, not null, indexed | the person being assessed |
| started_by_user_id | FK `users.id`, ON DELETE SET NULL, nullable | who started it (self or HR, see D1) |
| position_id | FK `positions.id`, ON DELETE SET NULL, nullable | position at start time (snapshot) |
| position_title | String(100), nullable | snapshot for display if the position changes/deletes |
| status | `assessmentstatus`, not null, default IN_PROGRESS | |
| seconds_per_question | Integer, not null | config snapshot |
| max_violations | Integer, not null | config snapshot |
| violation_count | Integer, not null, default 0 | |
| started_at | DateTime(tz), not null | |
| expires_at | DateTime(tz), not null | started_at + questions × seconds_per_question + grace |
| submitted_at | DateTime(tz), nullable | set on SUBMITTED / EXPIRED / TERMINATED finalization |
| applied_to_profile | Boolean, not null, default false | whether levels were written to `employee_skills` |
| scoring_version | String(20), nullable | version of the scoring table used at grading (§9.4) |
| created_at / updated_at | DateTime(tz) | |

Constraints / indexes:
- **Partial unique index** `uq_assessments_one_active_per_employee ON assessments(employee_id) WHERE status = 'IN_PROGRESS'`. At most one running attempt, safe against double-click races.
- Index `(employee_id, created_at)` for history listing.

Relationships: `employee`, `started_by`, `position`, `skills` (→ AssessmentSkill, `cascade="all, delete-orphan"`, ordered by `display_order`).

### 2.6 `assessment_skills` (recreated)

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| assessment_id | FK `assessments.id`, ON DELETE CASCADE, not null | |
| skill_id | FK `skills.id`, ON DELETE RESTRICT, not null, indexed | keeps history intact |
| display_order | Integer, not null | |
| category | `skillgapcategory`, not null | snapshot from SkillComparisonService |
| claimed_level | `skilllevel`, nullable | employee's level at start (null for unmatched) |
| required_level | `skilllevel`, nullable | position requirement at start |
| is_essential | Boolean, nullable | snapshot |
| beginner_correct | SmallInteger, nullable | 0–1, filled at submit |
| intermediate_correct | SmallInteger, nullable | 0–2 |
| advanced_correct | SmallInteger, nullable | 0–2 |
| total_correct | SmallInteger, nullable | 0–5 |
| assessed_level | `skilllevel`, nullable | null = "None" result **or** not graded yet; disambiguate with `graded_at` |
| graded_at | DateTime(tz), nullable | |
| profile_action | String(20), nullable | what happened to `employee_skills`: `created`, `upgraded`, `downgraded`, `unchanged`, `removed`, `skipped` (audit) |

Constraints: `UNIQUE(assessment_id, skill_id)`, `UNIQUE(assessment_id, display_order)`, CHECKs on counter ranges.

### 2.7 `assessment_questions` (recreated): presented question + answer

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | **This is the `question_id` the frontend sees** (attempt-scoped, so bank ids never leak) |
| assessment_skill_id | FK `assessment_skills.id`, ON DELETE CASCADE, not null, indexed | |
| skill_question_id | FK `skill_questions.id`, ON DELETE RESTRICT, not null, indexed | the bank question |
| display_order | Integer, not null | order within the skill |
| proficiency_level | `skilllevel`, not null | denormalized from bank for fast grading/display |
| option_order | JSONB, not null | list of `skill_question_options.id` in shuffled order. Frontend option `id` = 1-based position in this list. |
| selected_option_id | FK `skill_question_options.id`, ON DELETE RESTRICT, nullable | resolved server-side from the submitted position |
| selected_option_type | `questionoptiontype`, nullable | snapshot of what kind of answer they chose (correct / near_miss / misconception / plausible_wrong_n), for future analytics |
| is_correct | Boolean, nullable | set at answer time or at grading (both server-side) |
| answered_at | DateTime(tz), nullable | |

Constraints: `UNIQUE(assessment_skill_id, skill_question_id)` (no duplicate question in a skill), `UNIQUE(assessment_skill_id, display_order)`.

`selected_option_type` is stored per the spec ("save the type of answer the employee chose"). Scoring uses only `CORRECT` vs everything else.

### 2.8 `employee_skills` (modified)

Add:

| Column | Type | Notes |
|---|---|---|
| verified | Boolean, not null, server_default false | true when the current level came from an assessment |
| last_assessed_at | DateTime(tz), nullable | |
| last_assessment_id | FK `assessments.id`, ON DELETE SET NULL, nullable | |

Any manual level change through `PUT /employees/{id}/skills/{skill_id}` should reset `verified=false` (the level is no longer the tested one).

`years_experience` (exposed by the schema, absent in DB) is out of scope. Either add the column or remove it from the schema in a separate cleanup.

### 2.9 Tables removed

| Table | Reason |
|---|---|
| `assessment_results` | folded into `assessments` + `assessment_skills` |
| `assessment_answers` | folded into `assessment_questions` |
| old `assessments`, `assessment_questions`, `assessment_skills` | dropped and recreated with the new shape (all have 0 rows) |

Untouched: `courses`, `course_skills`, `recommendations` (future: recommend courses from assessed gaps).

### 2.10 Relationship summary

```
skills 1──* skill_questions 1──* skill_question_options
skills 1──* assessment_skills
skills 1──* employee_skills
employees 1──* assessments 1──* assessment_skills 1──* assessment_questions
assessment_questions *──1 skill_questions
assessment_questions *──1 skill_question_options   (selected)
employee_skills *──1 assessments                   (last_assessment, nullable)
users 1──* assessments                              (started_by, nullable)
positions 1──* assessments                          (nullable snapshot)
```

Cascade summary: deleting an **employee** deletes their assessments (consistent with `employee_skills`). Deleting a **skill** that has bank questions or assessment history is **blocked** (RESTRICT); the orphan-cleanup code must skip such skills (§3).

---

## 3. Existing files to modify

| File | Change |
|---|---|
| `backend/app/models/__init__.py` | Remove `AssessmentResult`, `AssessmentAnswer`; add `SkillQuestion`, `SkillQuestionOption` (keep `Assessment`, `AssessmentSkill`, `AssessmentQuestion` names) |
| `backend/app/models/assessment.py` | Rewrite per §2.5 |
| `backend/app/models/assessment_skill.py` | Rewrite per §2.6 |
| `backend/app/models/assessment_question.py` | Rewrite per §2.7 |
| `backend/app/models/skill.py` | Add `questions` relationship (→ SkillQuestion); keep `assessment_skills` |
| `backend/app/models/employee.py` | Replace `assessment_results` relationship with `assessments` |
| `backend/app/models/user.py` | Replace `created_assessments` (back-populates `creator`) with `started_assessments` (→ `Assessment.started_by`) |
| `backend/app/models/employee_skill.py` | Add `verified`, `last_assessed_at`, `last_assessment_id` |
| `backend/app/schemas/employee_skill.py` | Make `verified` / `last_assessed_at` real; rename `last_assessed` → `last_assessed_at`; drop `verified` from `EmployeeSkillUpdate` (only assessments set it) |
| `backend/app/crud/employee_skill.py` | Remove the broken `last_assessed` logic; reset `verified=False` on manual level change |
| `backend/app/schemas/questions.py` | Becomes the import contract (or move to `question_bank.py`, see §4); add strict validators |
| `backend/app/schemas/assessment.py` | Rewrite: all safe request/response schemas (§10) |
| `backend/app/services/skill_comparison_service.py` | Add `skill_id` to every entry it returns (additive; existing consumers ignore it) |
| `backend/app/services/gap_analysis_service.py` | Optional: strip `skill_id` before sending `skill_diff` to Gemini (keeps the prompt unchanged) |
| `backend/app/api/endpoints/positions.py` | Fix orphan cleanup: only delete a skill when **no** `position_skills`, `employee_skills`, `skill_questions` or `assessment_skills` reference it. Extract a shared helper. |
| `backend/app/api/endpoints/skills.py` | `DELETE /skills/{id}`: return 409 when the skill has bank questions or assessment history, instead of a 500 IntegrityError |
| `backend/app/auth/dependencies.py` | Add `get_current_user_with_employee` (any role, `employee_id` required) |
| `backend/app/core/exceptions.py` / `exception_handlers.py` | Assessment exceptions + handlers (§10.6) |
| `backend/app/core/config.py` | Assessment settings (questions per level, seconds per question, grace, max violations, max skills, retake cooldown) |
| `backend/app/main.py` | Replace `assessment_router` (`/assessment`) with new `assessments_router` (`/assessments`); register HR question-bank router |
| `backend/app/api/endpoints/employees.py` | HR: `GET /employees/{employee_id}/assessments` (or put it in the assessments router, see §10) |
| `backend/requirements.txt` | Add `pytest` (and `pytest-cov` optional) |
| `backend/app/ai/perfect_profile.py` + `backend/app/services/position_skill_service.py` | Phase 9: pass bank skill names to Gemini as preferred vocabulary |
| `docs/assessment.md`, `docs/api.md`, `docs/database.md`, `docs/backend.md`, `README.md` | Update after implementation |

---

## 4. New files

### Backend

| File | Purpose |
|---|---|
| `backend/app/models/skill_question.py` | `SkillQuestion` |
| `backend/app/models/skill_question_option.py` | `SkillQuestionOption`, `QuestionOptionType` |
| `backend/app/schemas/question_bank.py` | Import contract: `ImportOption`, `ImportQuestion`, `ImportSkillBank` with strict validators, plus HR coverage response schemas. (Merge in and delete `schemas/questions.py`; keep `QuestionChunk` there only if the generation pipeline still needs it.) |
| `backend/app/crud/question_bank.py` | Queries: active questions per skill/level, coverage per skill, questions seen by an employee |
| `backend/app/crud/assessment.py` | Load assessment with ownership filter, active assessment for employee, history lists, row locks |
| `backend/app/services/question_bank_import_service.py` | Parse JSONL → validate → map skills → idempotent upsert → report |
| `backend/app/services/assessment_target_service.py` | Comparison → target skills → bank availability → ordering/cap |
| `backend/app/services/assessment_generation_service.py` | Random selection, option shuffle, persistence |
| `backend/app/services/assessment_scoring_service.py` | Pure scoring function (lookup table) + grading + profile application |
| `backend/app/services/assessment_service.py` | Thin facade used by the router: start, get, answer, violation, submit, expire |
| `backend/app/api/endpoints/assessments.py` | Assessment endpoints |
| `backend/app/api/endpoints/question_bank.py` | HR: coverage/read-only bank stats |
| `backend/app/scripts/import_question_bank.py` | CLI: `python app/scripts/import_question_bank.py [path] [--dry-run] [--strict]` |
| `backend/app/data/question_bank/skill_name_map.json` | Optional curated mapping: bank skill name → existing `Skill.name` (e.g. `"risk management": "Risk Management"`) |
| `backend/alembic/versions/<rev>_skill_assessment_system.py` | Migration (§14) |
| `backend/tests/conftest.py` | Test DB + fixtures |
| `backend/tests/unit/test_question_bank_validation.py` | |
| `backend/tests/unit/test_assessment_scoring.py` | |
| `backend/tests/unit/test_question_selection.py` | |
| `backend/tests/integration/test_question_bank_import.py` | |
| `backend/tests/integration/test_assessment_lifecycle.py` | |
| `backend/tests/integration/test_assessment_security.py` | |
| `backend/tests/integration/test_skill_gap_integration.py` | |
| `backend/tests/fixtures/question_bank_small.jsonl` (+ invalid variants) | |
| `backend/pytest.ini` | test paths, markers |

### Frontend (`my_frontend`)

| File | Purpose |
|---|---|
| `src/services/assessmentService.ts` | API calls |
| `src/pages/AssessmentsPage.tsx` | List own assessments + "Start assessment" (preview of skills, not-assessable list) |
| `src/components/assessment/QuestionCard.tsx`, `AssessmentProgress.tsx`, `SkillResultTable.tsx` | Split the big pages (optional but recommended) |

---

## 5. Legacy code

| Item | Action | Reason |
|---|---|---|
| `backend/app/api/endpoints/assessment.py` | **Delete** | AI text report, not a test; imports via `backend.app…`; replaced by `assessments.py` |
| `backend/app/services/old/assessment_service.py` | **Delete** | Only used by the legacy endpoint; depends on Ollama (`ai/agents`) |
| `backend/app/services/old/skill_gap_service.py`, `skill_alias_service.py` | Keep for now (still imported by `backend/test_skill_alias_system.py`); delete together with that script in a later cleanup |
| `backend/app/models/assessment_result.py` | **Delete** | Folded into new models |
| `backend/app/models/assessment_answer.py` | **Delete** | Folded into `assessment_questions` |
| `backend/app/models/assessment.py`, `assessment_skill.py`, `assessment_question.py` | **Rewrite** | |
| `backend/app/schemas/assessment.py` (current 2 classes) | **Rewrite** | Option `id` semantics change (attempt-scoped position) |
| `testing_assessments.py` (repo root) | **Delete** (or move under `ai/`) | Ollama experiment, unrelated to the new feature |
| `ai/agents/assessment.py` | Leave in `ai/` (experimental folder), no longer referenced by the backend |
| `my_frontend/src/data/mockAssessment.ts` | **Delete** after integration | |
| `my_frontend/src/hooks/assessment/useAssessmentAttempt.ts` | **Rewrite** (server-backed) | Current one invents ids/timestamps client-side |
| `frontend/` legacy app (`AIAssessmentPage.tsx` calls `/assessment/...`) | Leave; it's unmaintained and will 404 on that call | |

---

## 6. Question-bank import

### 6.1 Approach

A **service** (`QuestionBankImportService`) that does the work, called by a **CLI script** (`app/scripts/import_question_bank.py`), same style as `seed_skill_aliases.py`. No HTTP upload endpoint in v1: the bank is curated content deployed with the code. An HR upload endpoint can reuse the service later.

### 6.2 Steps

1. **Parse** the JSONL line by line; report line numbers on JSON errors.
2. **Validate each skill block** with Pydantic (`ImportSkillBank`):
   - `skill_name`: non-empty after `strip()`, ≤ 100 chars (fits `skills.name`).
   - Duplicate `skill_name` across lines (case-insensitive): error.
3. **Validate each question** (`ImportQuestion`):
   - `question_text` non-empty; `proficiency_level` ∈ {Beginner, Intermediate, Advanced}.
   - **Exactly 6 options.**
   - **Option types are exactly the set** {correct, near_miss, misconception, plausible_wrong_1, plausible_wrong_2, plausible_wrong_3}, which implies exactly one `correct` and no duplicates.
   - Option texts non-empty and **unique within the question** (case/whitespace-insensitive).
   - `explanation` non-empty.
   - Duplicate question text within a skill: error.
4. **Per-skill level counts** (after dropping invalid questions):
   - Fewer than **1 B / 2 I / 2 A** valid questions: the skill is **not assessable**. Import its valid questions anyway (or skip the skill under `--strict`) and report it.
   - Fewer than 10 per level: **warning** (a smaller pool leaks faster through retakes).
5. **Invalid-question policy** (see D8): default = **skip the invalid question, report it, continue**; `--strict` = abort without writing anything. Today this skips the 21 questions in §0.1.
6. **Skill mapping**, in order:
   1. `skill_name_map.json` override, if present.
   2. Case-insensitive, whitespace-trimmed match on `skills.name` (`func.lower(Skill.name) == name.lower()`). If more than one row matches (possible because the unique constraint is case-sensitive), error and ask for an override.
   3. Otherwise **create** a `Skill` with the bank's name exactly as written (see D9 on casing).
   - **Never** resolve through `skill_aliases` (category semantics, §0.3).
7. **Idempotent upsert** per question using `content_hash`:
   - Hash exists: leave it (re-activate if it was inactive).
   - New hash: insert question + 6 options.
   - Active questions of that skill whose hash is no longer in the file: set `is_active=false` (never delete; attempts may reference them).
8. **Single transaction** for the whole run; `--dry-run` rolls back at the end.
9. **Report**: skills matched / created, questions inserted / unchanged / deactivated / rejected (with reasons and line/index), not-assessable skills, per-skill counts.

Running the import twice in a row gives "0 inserted, 2,469 unchanged".

### 6.3 Where to fix the 21 bad questions

Send the report back to the teammate. Fixing the source file is better than auto-repairing (e.g. picking one of two "correct" options is a content decision). Re-running the import then inserts the fixed versions automatically.

---

## 7. Assessment generation

### 7.1 Identify target skills (`AssessmentTargetService`)

1. Load the employee and position. Error if no position, or the position has no `position_skills` yet (skills are generated in the background after position creation).
2. Call `SkillComparisonService.compare_employee_to_position(db, employee_id)` (now returns `skill_id`).
3. Keep entries from the categories in scope (**D2**; recommended: matched + needs_improvement + unmatched, i.e. every required skill; additional skills excluded).
4. For each `skill_id`, check bank availability: active question counts per level ≥ 1/2/2. Otherwise mark it **not assessable** (`reason: "no_question_bank"` or `"insufficient_questions"`).
5. Apply ordering and cap (**D3**). Recommended order: essential before optional, then needs_improvement → unmatched → matched; cap at `ASSESSMENT_MAX_SKILLS` (default 8, i.e. 40 questions).
6. Retake cooldown (**D10**): skip skills assessed within `ASSESSMENT_RETAKE_COOLDOWN_DAYS` (reason `"recently_assessed"`).
7. Zero assessable skills: `NoAssessableSkillsError` (422) with the not-assessable list so the UI can explain why.

### 7.2 Select questions (`AssessmentGenerationService`)

For each target skill, for each level with its quota `{Beginner: 1, Intermediate: 2, Advanced: 2}` (config):

1. `pool = active SkillQuestions for (skill_id, level)`.
2. `unseen = pool − questions this employee was served in previous assessments`.
3. If `len(unseen) ≥ quota`, sample from `unseen`; otherwise take all of `unseen` and fill the rest from the seen pool.
4. Use `random.SystemRandom().sample(...)`, which is unpredictable and needs no seed.

Question order inside a skill (**D11**): recommended Beginner → Intermediate → Advanced (a difficulty ramp). Skills ordered as in 7.1.

### 7.3 Shuffle options

For every selected question: `option_order = SystemRandom().sample(option_ids, k=6)` stored as JSONB on the `AssessmentQuestion`. The frontend option `id` is the 1-based index in `option_order`.

### 7.4 Persist (one transaction)

1. `Assessment` (status IN_PROGRESS, config snapshot, `expires_at`).
2. `AssessmentSkill` per target (category, claimed/required level, essential, order).
3. `AssessmentQuestion` × 5 per skill (bank id, level, option_order, order).
4. Commit. If the partial unique index fires (concurrent start), roll back and return the existing IN_PROGRESS assessment.

`POST /assessments` is idempotent from the user's point of view: if an IN_PROGRESS one exists (and isn't expired), it is returned instead of generating a new one. That's what keeps the question set fixed across refreshes and double clicks.

### 7.5 Return safe data

The response is built only from these fields: `AssessmentQuestion.id`, `SkillQuestion.question_text`, `proficiency_level`, and for each position *i* in `option_order`: `{id: i+1, text: option.text}`. Plus `selected_option` (the position the employee already chose, for resuming). `option_type`, `explanation`, bank ids and option row ids are never put in a response model.

---

## 8. Security

| Threat | Prevention |
|---|---|
| **Exposing correct answers / option types** | Response schemas (`AssessmentQuestionPublic`, `AssessmentOptionPublic`) don't have those fields. Responses are built field by field, never by dumping ORM objects. A test asserts that serialized JSON never contains `option_type`, `explanation`, `correct`, `is_correct` or `near_miss` (§13). |
| **Exposing explanations** | Same; explanations are never returned, including after submit (v1). |
| **Learning answers across attempts via ids** | Frontend sees attempt-scoped question ids and per-question option positions (1–6) in a fresh shuffle every attempt. Bank and option row ids never leave the server, so ids can't be correlated between attempts or shared between employees. |
| **Immediate feedback leaks** | Answer save returns only `{saved: true}`, never correctness. Results after submit are per skill (counts + level), not per question. |
| **Submitting to another employee's assessment** | Every query loads the assessment with `WHERE id = :id AND employee_id = :current_user.employee_id`. Not found means **404** (not 403, so ids can't be probed). HR can **read** any assessment but cannot answer or submit one. |
| **Submitting an option from another question** | Client sends `{option_id: 1..6}` for a given `question_id`. The server loads the `AssessmentQuestion` **through the assessment it owns** (`assessment_question.assessment_skill.assessment_id == assessment.id`) and maps the position via its own `option_order`. Out-of-range values return 422. There's no way to name a foreign option. |
| **Changing the question set after creation** | No endpoint adds, removes or edits questions. Selection happens once at start, inside a transaction. Bank rows are immutable (hash-versioned). FKs are RESTRICT, so served questions can't be deleted. |
| **Answering after time / after submit** | Each write checks `status == IN_PROGRESS` and `now <= expires_at`, else 409. Expired attempts are finalized lazily on the next access (D12). |
| **Double submit / race** | `submit` takes `SELECT … FOR UPDATE` on the assessment row, and grading plus profile application run once (status check inside the lock). |
| **Multiple parallel attempts to cherry-pick** | Partial unique index: one IN_PROGRESS per employee. Retake cooldown (D10). |
| **Tab switching / leaving the page** | Frontend reports violations; server counts them and terminates at `max_violations`. This is a deterrent, not a guarantee: a modified client can skip reporting. Document this as a limitation. |
| **HR inflating levels** | Assessed levels are written only by the scoring service. Manual edits reset `verified=false`, so the UI can tell tested levels from hand-entered ones. |
| **Mass assignment** | Request schemas accept only `option_id` / `reason`; no client-supplied status, score, level or employee_id. |
| **Unprotected routers** | New routers declare dependencies at router level. (Existing `/employees` and `/skills` exposure is separate tech debt, but `/employees/{id}/assessments` must be HR-protected.) |

---

## 9. Scoring

### 9.1 Correctness

`is_correct = (selected_option.option_type == CORRECT)`. Unanswered (null) counts as incorrect. `near_miss`, `misconception` and `plausible_wrong_*` all count as **incorrect**; their type is stored in `selected_option_type` for future features.

### 9.2 The rules as written

- R1: total 0–1 correct → **None**
- R2: Beginner correct and 0–1 Intermediate correct → **Beginner**
- R3: Beginner correct and both Intermediate correct → **Intermediate**
- R4: 4–5 total correct → **Advanced**

### 9.3 All 18 possible outcomes (B ∈ 0–1, I ∈ 0–2, A ∈ 0–2)

| # | B | I | A | Total | Rules that fire | Status |
|---|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 0 | R1 | None |
| 2 | 0 | 0 | 1 | 1 | R1 | None |
| 3 | 0 | 1 | 0 | 1 | R1 | None |
| 4 | **0** | **0** | **2** | 2 | — | ❗ **Undefined** |
| 5 | **0** | **1** | **1** | 2 | — | ❗ **Undefined** |
| 6 | **0** | **2** | **0** | 2 | — | ❗ **Undefined** |
| 7 | **0** | **1** | **2** | 3 | — | ❗ **Undefined** |
| 8 | **0** | **2** | **1** | 3 | — | ❗ **Undefined** |
| 9 | 0 | 2 | 2 | 4 | R4 | Advanced (⚠ while missing the Beginner question) |
| 10 | **1** | **0** | **0** | 1 | **R1 + R2** | ❗ **Conflict**: None vs Beginner |
| 11 | 1 | 0 | 1 | 2 | R2 | Beginner |
| 12 | 1 | 0 | 2 | 3 | R2 | Beginner (⚠ both Advanced right, no Intermediate) |
| 13 | 1 | 1 | 0 | 2 | R2 | Beginner |
| 14 | 1 | 1 | 1 | 3 | R2 | Beginner |
| 15 | **1** | **1** | **2** | 4 | **R2 + R4** | ❗ **Conflict**: Beginner vs Advanced |
| 16 | 1 | 2 | 0 | 3 | R3 | Intermediate |
| 17 | **1** | **2** | **1** | 4 | **R3 + R4** | ❗ **Conflict**: Intermediate vs Advanced |
| 18 | **1** | **2** | **2** | 5 | **R3 + R4** | ❗ **Conflict**: Intermediate vs Advanced |

**5 undefined cases (#4–#8) and 5 conflicting cases (#10, #15, #17, #18)** need a decision (**D4**). Cases #9 and #12 are defined but questionable.

A *proposal only* for you to accept or change: rule precedence **R4 > R1 > R3 > R2**, and for B=0 with 2–3 correct use **Beginner**. That gives #4–#8 → Beginner, #10 → None, #15/#17/#18 → Advanced.

### 9.4 Implementation shape

- `assessment_scoring_service.py` holds the result as an **explicit 18-entry lookup table** keyed by `(B, I, A)` → `SkillLevel | None`, built from the approved decision. No chained `if`s, so the table *is* the spec, and a unit test asserts all 18 keys exist.
- Expose `SCORING_RULES_VERSION` (string) and store it on `assessments` (`scoring_version` column) so results stay explainable if the table changes later.
- Grading steps on submit:
  1. Lock the assessment; verify IN_PROGRESS (or finalize an expired one per D12).
  2. For each `AssessmentQuestion`: compute `is_correct` from `selected_option_id` (if not already set).
  3. For each `AssessmentSkill`: fill the counters, `assessed_level` and `graded_at`.
  4. Apply to the profile (D5–D7), set `profile_action`, update `employee_skills.verified / last_assessed_at / last_assessment_id`.
  5. Status SUBMITTED, `submitted_at`, `applied_to_profile`. Commit.

### 9.5 Profile-application rules that need decisions

| Case | Question | Decision |
|---|---|---|
| Assessed **None** | Delete the `employee_skills` row, keep it unverified, or leave it? | **D5** |
| Claimed **Expert**, assessed Advanced | The bank can't test Expert. Downgrade to Advanced, or keep Expert? | **D6** |
| Unmatched skill assessed ≥ Beginner | Create a new `employee_skills` row? (recommended: yes) | **D7** |
| Assessed higher than claimed | Upgrade? (recommended: yes, that's the point) | D7 |
| Apply automatically or after HR approval? | | **D13** |
| Expired / terminated attempts | Grade and apply, grade only, or discard? | **D12** |

---

## 10. API design

### 10.1 Conventions observed

Routers live in `app/api/endpoints/`, are registered in `main.py` with a plural prefix, and use router-level `dependencies=[Depends(get_current_hr)]` for HR-only routers. Self-service lives under `/me`. Errors are domain exceptions mapped in `exception_handlers.py`. Response schemas use `ConfigDict(from_attributes=True)`.

### 10.2 Auth dependencies

- `get_current_user_with_employee` (new): any authenticated user whose `employee_id` is set. Taking an assessment is about *being an employee*, not about a role. This also lets the single HR user (linked to employee 1) test the feature today.
- `get_current_hr` (existing): HR reads.

### 10.3 Endpoints

**Employee (self):** router `app/api/endpoints/assessments.py`, prefix `/assessments`, router dependency `get_current_user_with_employee`.

| Method | Path | Purpose | Success | Errors |
|---|---|---|---|---|
| GET | `/assessments/preview` | Which skills would be tested, plus which aren't assessable and why | 200 `AssessmentPreview` | 422 no position |
| POST | `/assessments` | Start, or return the current IN_PROGRESS one (idempotent) | 201 new / 200 existing, `AssessmentDetail` | 422 `NoAssessableSkills` |
| GET | `/assessments` | My assessments (history) | 200 `list[AssessmentSummary]` | |
| GET | `/assessments/{assessment_id}` | Questions (safe) + my saved answers + config + remaining time; or the result if finalized | 200 `AssessmentDetail` | 404 |
| PUT | `/assessments/{assessment_id}/questions/{question_id}/answer` | Save / replace one answer | 200 `AnswerSaved` | 404, 409 not in progress / expired, 422 bad option |
| POST | `/assessments/{assessment_id}/violations` | Report a proctoring violation | 200 `ViolationRecorded` (count, terminated?) | 404, 409 |
| POST | `/assessments/{assessment_id}/submit` | Grade + apply | 200 `AssessmentResult` | 404, 409 already finalized |
| GET | `/assessments/{assessment_id}/result` | Result after finalization | 200 `AssessmentResult` | 404, 409 still in progress |

`PUT` per question (rather than a bulk `POST /answers`) matches the one-question-at-a-time UI, autosaves (survives refresh/crash), and is naturally idempotent. A bulk variant isn't needed.

**HR (read-only):**

| Method | Path | Router | Purpose |
|---|---|---|---|
| GET | `/employees/{employee_id}/assessments` | `employees.py` (with explicit `Depends(get_current_hr)` since that router's dependency is commented out) | An employee's assessment history |
| GET | `/assessments/{assessment_id}/result` | same handler; owner **or** HR | View a result |
| GET | `/question-bank/skills` | `question_bank.py` (HR) | Coverage: per skill, active counts per level, assessable yes/no |
| GET | `/positions/{position_id}/assessment-coverage` (optional) | `question_bank.py` | Which of a position's skills are assessable |

(Optional, D1: `POST /employees/{employee_id}/assessments` for HR to *assign* an assessment.)

### 10.4 Request schemas

```python
class AnswerRequest(BaseModel):
    option_id: int = Field(ge=1, le=6)   # position in the shuffled list

class ViolationRequest(BaseModel):
    reason: Literal["tab_hidden", "window_blur", "fullscreen_exit", "copy_attempt"]
```

`POST /assessments` takes no body in v1 (scope comes from config). Add `{ "include_unmatched": bool }` later if D2 makes it optional.

### 10.5 Response schemas (`app/schemas/assessment.py`)

```python
class AssessmentOptionPublic(BaseModel):
    id: int            # 1..6
    text: str

class AssessmentQuestionPublic(BaseModel):
    question_id: int   # AssessmentQuestion.id
    question_text: str
    proficiency_level: Literal["Beginner", "Intermediate", "Advanced"]
    options: list[AssessmentOptionPublic]
    selected_option_id: int | None    # only the employee's own choice

class AssessmentSkillPublic(BaseModel):
    skill_id: int
    skill_name: str
    questions: list[AssessmentQuestionPublic]

class AssessmentConfigPublic(BaseModel):
    seconds_per_question: int
    max_violations: int
    total_questions: int

class AssessmentDetail(BaseModel):
    id: int
    status: Literal["in_progress", "submitted", "expired", "terminated"]
    position_title: str | None
    started_at: datetime
    expires_at: datetime
    violation_count: int
    config: AssessmentConfigPublic
    skills: list[AssessmentSkillPublic]      # empty once finalized

class NotAssessableSkill(BaseModel):
    skill_id: int
    skill_name: str
    reason: Literal["no_question_bank", "insufficient_questions", "recently_assessed", "over_limit"]

class AssessmentPreview(BaseModel):
    position_title: str
    assessable: list[PreviewSkill]           # name, category, claimed/required level
    not_assessable: list[NotAssessableSkill]
    total_questions: int
    estimated_minutes: int

class SkillResultPublic(BaseModel):
    skill_id: int
    skill_name: str
    category: str
    claimed_level: str | None
    assessed_level: str | None               # None = "None"
    required_level: str | None
    correct: int                             # 0..5 (D14: show or hide)
    total: int                               # 5
    profile_action: str

class AssessmentResult(BaseModel):
    id: int
    status: str
    submitted_at: datetime | None
    skills: list[SkillResultPublic]

class AssessmentSummary(BaseModel):
    id: int; status: str; started_at: datetime; submitted_at: datetime | None
    skill_count: int; position_title: str | None
```

Never return `selected_option_type` or `is_correct` per question to the employee. An HR-only per-question detail view (including option types) could be added later if HR needs it.

### 10.6 Exceptions (follow `app/core/exceptions.py` pattern)

| Exception | HTTP |
|---|---|
| `AssessmentNotFoundError` (also used for "not yours") | 404 |
| `AssessmentQuestionNotFoundError` | 404 |
| `AssessmentNotInProgressError` | 409 |
| `AssessmentExpiredError` | 409 |
| `AssessmentNotFinalizedError` | 409 |
| `InvalidAnswerOptionError` | 422 |
| `NoAssessableSkillsError` (carries the not-assessable list) | 422 |
| `EmployeeHasNoPositionError` | 422 |
| `SkillInUseError` (skill delete with bank/history) | 409 |

### 10.7 Validation summary

- Path ids are ints; ownership is checked in the query.
- `option_id` range is checked in the schema, then against `len(option_order)`.
- Every write checks status and expiry server-side; client timers are UX only.

---

## 11. Frontend (`my_frontend`): files that will change (not implemented now)

| File | Change |
|---|---|
| `src/types/assessment.ts` | Rewrite to match §10.5 (numeric option ids, `question_id`, `proficiency_level`, skills grouping, result types) |
| `src/services/assessmentService.ts` (**new**) | `getPreview`, `startAssessment`, `getAssessment`, `saveAnswer`, `reportViolation`, `submitAssessment`, `getResult`, `listMyAssessments`; HR: `getEmployeeAssessments` |
| `src/pages/AssessmentsPage.tsx` (**new**) | Preview (assessable + not-assessable skills, estimated time), start/resume button, history |
| `src/pages/AssessmentInstructionsPage.tsx` | Load from `getAssessment`/preview instead of `mockAssessment`; config from the server |
| `src/pages/AssessmentPage.tsx` | Load the server assessment; save each answer via `PUT`; resume at the first unanswered question after refresh; option letters A–F derived from index; submit via API; remove hard-coded `employeeId: 1` and `console.log` |
| `src/pages/AssessmentResultPage.tsx` | Show the per-skill result (claimed → assessed, required, action) |
| `src/hooks/assessment/useAssessmentAttempt.ts` | Become server-backed (load, save answer, submit, status from server) |
| `src/hooks/assessment/useAssessmentSecurity.ts` | Call `reportViolation`; react to `terminated` from the server |
| `src/hooks/assessment/useAssessmentTimer.ts` | Keep; additionally cap by server `expires_at` |
| `src/data/mockAssessment.ts` | Delete |
| `src/App.tsx` | Add `/assessments` route; keep `/assessments/:id/instructions`, `/assessments/:id`, `/assessments/:id/result`. Consider rendering the test page outside `AppLayout` (distraction-free) |
| `src/layouts/AppLayout.tsx` | Replace the broken `/assessments/:id/instructions` nav link with `/assessments` |
| `src/types/employeeSkills.ts` | Add `verified`, `last_assessed_at` |
| `src/pages/EmployeeDetailsPage.tsx` | "Verified" badge per skill; assessment history (HR) |
| `src/pages/GapAnalysisResultPage.tsx` | Show which levels are verified; link to the employee's latest assessment |
| `src/components/ProtectedRoute.tsx`, `src/pages/LoginPage.tsx` | Only if D1 = employee self-service portal: role-aware routing (decode JWT `role`) and an employee layout |

---

## 12. Implementation order

Adjusted from the suggested order. Scoring logic comes early because it's pure and blocked only by D4. The orphan-cleanup fix must land before the import.

| Phase | Work | Depends on |
|---|---|---|
| **0 — Decisions** | Resolve `01_decisions_needed.md` (at least D1–D5, D8, D12) | — |
| **1 — Test infrastructure** | `pytest`, `backend/tests/`, test Postgres DB, fixtures | — |
| **2 — Models + migration** | New/rewritten models, `employee_skills` columns, enums, migration dropping legacy tables; remove legacy endpoint/service/models; update `main.py` | 0 |
| **3 — Skill deletion safety** | Fix orphan cleanup in `positions.py`; 409 on `DELETE /skills/{id}` | 2 |
| **4 — Question-bank schemas + validation** | `schemas/question_bank.py` strict validators + unit tests | 1 |
| **5 — Importer** | Import service + CLI + `skill_name_map.json`; run on dev DB; send the rejection report to the teammate | 2, 3, 4 |
| **6 — Scoring (pure)** | Lookup table + unit tests for all 18 cases | D4 |
| **7 — Comparison integration + targeting** | `skill_id` in comparison output; `AssessmentTargetService`; preview | 2, 5 |
| **8 — Generation + persistence** | Selection, shuffle, transactional start, idempotency, expiry | 7 |
| **9 — API** | Router, schemas, exceptions, auth dependency, HR endpoints; grading + profile application wired to submit | 6, 8 |
| **10 — Vocabulary alignment** | Feed bank skill names to `perfect_profile` so new positions use assessable names; optional coverage endpoint per position | 5 |
| **11 — React integration** | §11 | 9 |
| **12 — Docs + cleanup** | Update docs, delete mock data and the root `testing_assessments.py` | 11 |

---

## 13. Testing

Infrastructure: `pytest` with a dedicated **PostgreSQL** test database (`TEST_DATABASE_URL`). SQLite can't run partial unique indexes on enums or `FOR UPDATE` the same way. Create the schema with `alembic upgrade head` once per session (this also tests the migration), and wrap each test in a transaction that's rolled back. Use FastAPI `TestClient` with `get_db` overridden and auth via real JWTs from `create_access_token`.

| Area | Tests |
|---|---|
| **Question-bank validation** (unit) | valid question passes; 5 and 7 options rejected; two `correct` rejected; zero `correct` rejected; duplicate type rejected; unknown type rejected; empty text/explanation rejected; duplicate option text rejected; level `Expert` rejected; duplicate question text in a skill rejected; skill-level count below 1/2/2 → not assessable; count below 10 → warning. Parametrize the 21 real failing questions from the bank as regression fixtures. |
| **Import** (integration) | fresh import creates skills, questions and 6 options each; case-insensitive skill match reuses `Risk Management`; name-map override applied; second run inserts 0 (idempotent); changed question → new row + old deactivated; question removed from file → deactivated, not deleted; `--dry-run` writes nothing; `--strict` aborts on the first invalid question; ambiguous case-duplicate skills → error |
| **Random selection** (unit/integration) | exactly 1/2/2 per skill; no duplicates within a skill; only active questions; only the skill's own questions; prefers unseen questions; falls back to seen when unseen < quota; distribution sanity (statistical, many runs, every question eventually selected); option_order is a permutation of the 6 option ids |
| **Persistence** | start creates the expected rows in one transaction; second start returns the same assessment (same question ids, same option order) → refresh-safe; concurrent starts → one IN_PROGRESS (partial index); question set unchanged after GET/answer calls; expired assessment handled per D12 |
| **Authorization** | no token → 401; another employee's assessment → 404 for GET, PUT answer, submit; user without `employee_id` → 403 on start; HR can read any result but cannot answer/submit another's; HR endpoints reject non-HR |
| **Answer validation** | option_id 0 or 7 → 422; question_id of another assessment → 404; answer after submit → 409; after expiry → 409; overwrite before submit OK; response never includes correctness |
| **No-leak** | JSON of every employee-facing endpoint contains none of: `option_type`, `explanation`, `is_correct`, `correct`, `near_miss`, `misconception`, `plausible_wrong`, bank question ids, option row ids |
| **Scoring** | all 18 (B, I, A) combinations against the approved table; unanswered = wrong; near_miss/misconception count as wrong but `selected_option_type` stored; per-skill counters correct; submit twice → 409 and the profile is updated once |
| **Profile application** | upgrade, downgrade, create (unmatched), None handling (D5), Expert handling (D6), `verified`/`last_assessed_at`/`last_assessment_id` set; manual edit resets `verified` |
| **Skill-gap integration** | comparison output includes `skill_id`; after an assessment that changes levels, `compare_employee_to_position` moves skills between matched / needs_improvement as expected; gap-analysis endpoint still works (Gemini mocked) |
| **Skill deletion safety** | updating a position title no longer deletes skills that have bank questions or employee holders; `DELETE /skills/{id}` with a bank → 409 |

---

## 14. Migration considerations

One Alembic revision on top of `f2908fc365d4`, e.g. `xxxx_skill_assessment_system.py`. **Write it by hand or heavily review autogenerate**: autogenerate does not handle enum type creation/drop, partial indexes or JSONB defaults well.

**Upgrade:**
1. Drop legacy tables in FK order: `assessment_answers` → `assessment_results` → `assessment_questions` → `assessment_skills` → `assessments`. All have **0 rows** in dev. For any other environment, add a guard that aborts if any of them has rows, rather than silently destroying data.
2. Create enum types `questionoptiontype`, `assessmentstatus`, `skillgapcategory` (reuse the existing `skilllevel` with `create_type=False`).
3. Create `skill_questions`, `skill_question_options`, `assessments`, `assessment_skills`, `assessment_questions` with the constraints, indexes and partial unique index from §2.
4. `ALTER TABLE employee_skills` ADD `verified` (server_default false), `last_assessed_at`, `last_assessment_id` (FK SET NULL).

**Downgrade:** drop the new columns, tables and enum types; recreate the legacy tables exactly as in `b6b4472c0459` (empty).

**Data:** the question bank is **not** loaded by the migration (it's content, not schema, and 2.5k rows with validation reporting belong in the import script). Deploy order: `alembic upgrade head` → `python app/scripts/import_question_bank.py`.

**Other environments:** teammates must run the migration and then the import. Document both in `docs/setup.md`.

---

## 15. Business & product considerations

- **Purpose:** turn self-reported or resume-derived levels into verified levels, giving fairer gap analyses, better-targeted training, and objective input for promotion/hiring decisions.
- **Coverage is the biggest risk** (§0.2): 13 of 92 current position skills are assessable. Without vocabulary alignment (Phase 10) and bank growth, employees will see many "not assessable" skills. Show coverage to HR openly.
- **Fairness & trust:** automated downgrades can upset employees. Mitigations: an HR-review option (D13), show results to the employee, keep `claimed_level` history, allow a retake after a cooldown.
- **Legal/HR policy:** if results feed employment decisions, people should be told how levels are computed. Keep `scoring_version` and the per-skill counters for auditability.
- **Question exposure:** each attempt reveals 5 of 30 questions per skill. "Prefer unseen" plus a cooldown slow down memorization; the bank needs periodic refresh. Track per-question usage and correctness rates later (the `selected_option_type` data enables item analysis: misconception rates, too-easy/too-hard questions).
- **Content quality:** 21 of 2,490 questions (0.8%) were structurally invalid, which means correctness errors probably exist too. Plan a light human review, at least of the Beginner questions (they gate levels).
- **Time limits & accessibility:** questions are up to 1,221 characters with options up to 1,528. The mock's 5 seconds per question is far too short; 60–90 s is realistic (D15). Consider accommodations (extended time) as a config per assessment.
- **Test length:** 8 skills × 5 = 40 questions ≈ 40–60 minutes. Longer tests reduce quality; hence the cap (D3).
- **Expert level:** the bank tops out at Advanced, so Expert can never be verified (D6).
- **Future features enabled by this data:** course recommendations from assessed gaps (`courses`, `recommendations` tables already exist), misconception-targeted learning (near_miss/misconception choices), and team skill heatmaps for HR.

---

## 16. Position families and bank skills

For reference when creating the 9 target positions and aligning vocabulary (grouping inferred from the bank's line order):

| Position family | Bank skills |
|---|---|
| Software Engineer (Python/Backend) | Python, Django, JavaScript, PostgreSQL, GraphQL, MySQL, Git |
| Cloud/DevOps Engineer | Docker, Kubernetes, Amazon Web Services AWS CloudFormation, Apache Kafka, Ansible, Jenkins CI, Bash, Ubuntu, Apache HTTP Server, Splunk Enterprise, Linux |
| Data Scientist / ML Engineer | Machine Learning, Deep Learning, TensorFlow, PyTorch, Apache Spark, Hadoop, SAS, Data mining software, IBM SPSS Statistics, MATLAB |
| Mechanical / CAD Engineer | Autodesk AutoCAD, Dassault Systemes SolidWorks, Autodesk Inventor, PTC Creo Parametric, Siemens NX, thermodynamics, mechanical engineering, Computer-aided engineering CAE software, Computerized numerical control CNC software, Finite element analysis software |
| Civil Engineer / Construction Manager | civil engineering, construction methods, Bentley MicroStation, Autodesk AutoCAD Civil 3D, building information modelling, Project Management, surveying, urban planning, Oasys structural design and analysis software |
| Accounting / Finance Manager | accounting, financial analysis, risk management, Microsoft Excel, Intuit QuickBooks, Sage 50 Accounting, Payroll software, General ledger software, Accounts payable software |
| HR / Recruitment Manager | human resource management, Oracle PeopleSoft Human Capital Management, Applicant tracking software, employment law, recruit personnel, manage payroll, Oracle Taleo, ADP Workforce Now, Employee performance management system |
| Digital Marketing Specialist | digital marketing techniques, Search engine optimization SEO software, Google Analytics, Google Ads, social media marketing techniques, Adobe Photoshop, MailChimp, content marketing strategy, Salesforce Marketing Cloud, web analytics |
| Hospitality / Restaurant Manager | hotel operations, MICROS Systems OPERA Property Management System PMS, food and beverage industry, food safety standards, Point of sale POS restaurant software, customer service, event management, manage restaurant service |

---

## 17. Final assessment-related file tree

```
backend/
├── alembic/versions/
│   └── xxxx_skill_assessment_system.py          (new)
├── app/
│   ├── api/endpoints/
│   │   ├── assessments.py                       (new; replaces assessment.py)
│   │   ├── question_bank.py                     (new, HR)
│   │   ├── employees.py                         (modified: HR history endpoint)
│   │   ├── positions.py                         (modified: orphan cleanup)
│   │   └── skills.py                            (modified: 409 on delete)
│   ├── auth/dependencies.py                     (modified)
│   ├── core/
│   │   ├── config.py                            (modified: assessment settings)
│   │   ├── exceptions.py                        (modified)
│   │   └── exception_handlers.py                (modified)
│   ├── crud/
│   │   ├── assessment.py                        (new)
│   │   ├── question_bank.py                     (new)
│   │   └── employee_skill.py                    (modified)
│   ├── data/question_bank/
│   │   ├── output_question_bank.jsonl           (existing data)
│   │   └── skill_name_map.json                  (new, optional)
│   ├── models/
│   │   ├── __init__.py                          (modified)
│   │   ├── skill_question.py                    (new)
│   │   ├── skill_question_option.py             (new)
│   │   ├── assessment.py                        (rewritten)
│   │   ├── assessment_skill.py                  (rewritten)
│   │   ├── assessment_question.py               (rewritten)
│   │   ├── employee_skill.py                    (modified)
│   │   ├── skill.py / employee.py / user.py     (modified relationships)
│   │   ├── assessment_result.py                 (deleted)
│   │   └── assessment_answer.py                 (deleted)
│   ├── schemas/
│   │   ├── assessment.py                        (rewritten: safe API schemas)
│   │   ├── question_bank.py                     (new: import contract + coverage)
│   │   ├── questions.py                         (merged into question_bank.py, then deleted)
│   │   └── employee_skill.py                    (modified)
│   ├── scripts/
│   │   └── import_question_bank.py              (new)
│   ├── services/
│   │   ├── assessment_service.py                (new facade)
│   │   ├── assessment_target_service.py         (new)
│   │   ├── assessment_generation_service.py     (new)
│   │   ├── assessment_scoring_service.py        (new)
│   │   ├── question_bank_import_service.py      (new)
│   │   ├── skill_comparison_service.py          (modified: skill_id)
│   │   ├── position_skill_service.py            (modified: Phase 10)
│   │   └── old/assessment_service.py            (deleted)
│   ├── ai/perfect_profile.py                    (modified: Phase 10)
│   └── main.py                                  (modified)
├── tests/                                       (new)
│   ├── conftest.py
│   ├── fixtures/question_bank_small.jsonl (+ invalid variants)
│   ├── unit/
│   │   ├── test_question_bank_validation.py
│   │   ├── test_question_selection.py
│   │   └── test_assessment_scoring.py
│   └── integration/
│       ├── test_question_bank_import.py
│       ├── test_assessment_lifecycle.py
│       ├── test_assessment_security.py
│       └── test_skill_gap_integration.py
├── pytest.ini                                   (new)
└── requirements.txt                             (modified: pytest)

my_frontend/src/
├── services/assessmentService.ts                (new)
├── types/assessment.ts                          (rewritten)
├── types/employeeSkills.ts                      (modified)
├── pages/
│   ├── AssessmentsPage.tsx                      (new)
│   ├── AssessmentInstructionsPage.tsx           (modified)
│   ├── AssessmentPage.tsx                       (modified)
│   ├── AssessmentResultPage.tsx                 (modified)
│   ├── EmployeeDetailsPage.tsx                  (modified)
│   └── GapAnalysisResultPage.tsx                (modified)
├── hooks/assessment/
│   ├── useAssessmentAttempt.ts                  (rewritten)
│   ├── useAssessmentSecurity.ts                 (modified)
│   └── useAssessmentTimer.ts                    (modified)
├── components/assessment/                       (new, optional split)
├── data/mockAssessment.ts                       (deleted)
├── App.tsx                                      (modified)
└── layouts/AppLayout.tsx                        (modified)

testing_assessments.py                           (deleted)
```
