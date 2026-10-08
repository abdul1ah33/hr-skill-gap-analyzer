# Skill Assessment — Decisions Needed

Each item says what is undecided, the options, and a recommendation. The plan (`00_skill_assessment_implementation_plan.md`) assumes the recommendation unless you choose otherwise. **D4 must be decided before the scoring phase**; nothing about scoring will be invented silently.

Legend: 🔴 blocks implementation · 🟡 needed before the related phase · 🟢 can default

## ✅ Answers (2026-10-08)

Details are in plan §A.

| # | Answer |
|---|---|
| D1 | **A + B + C**: self-service, HR assignment, and HR running it on the employee's behalf. The same attempt can't be open in two places at once (session lock + heartbeat, §A.5) |
| D2 | **Confirmed (defaults OK):** matched + needs_improvement + unmatched; not additional |
| D3 | **Matched first**, then needs_improvement, then unmatched. Cap of 8 assumed |
| D4 | **Proposal accepted** (table in §A.7) |
| D5 | **A: delete the row** when the assessed level is None, so the skill becomes unmatched |
| D6 | **Remove `EXPERT` from the enum** (0 rows use it) |
| D9 | **Superseded: all skill names are stored in lowercase** |
| D7, D8, D10, D12, D13, D15 | **Confirmed (defaults OK):** D7 upgrade + create verified rows; D8 skip and report invalid questions; D10 30-day cooldown per skill; D12 expired → graded and applied, terminated → graded, not applied; D13 apply automatically; D15 60 s per question + server deadline |
| D11, D14, D16, D17 | Recommendations assumed (grouped question order; show level + x/5; enforce copy blocking and report fullscreen exits; pass bank skill names to Gemini) |

---

## 🔴 D1 — Who takes the assessment, and who starts it?

The DB has only the `HR` role and a single HR user (linked to employee 1). No `Employee` role or employee accounts exist, and `my_frontend` is HR-only.

| Option | Effect |
|---|---|
| A. Employee self-service: any authenticated user linked to an employee starts and takes their own assessment; HR views results | Needs the `Employee` role seeded, employee signups, and (eventually) an employee portal in `my_frontend`. Works today for the HR user linked to employee 1. |
| B. HR assigns an assessment to an employee; the employee takes it | Adds an "assigned" status and an HR assign endpoint. Still needs employee login. |
| C. HR administers it on the employee's behalf (same login) | Simplest, but weak integrity: anyone with HR access can take the test for someone else. |

**Recommendation:** A now (dependency `get_current_user_with_employee`), with B added later if HR wants to control timing.

## 🔴 D2 — Which comparison categories are tested?

| Category | Test? | Reasoning |
|---|---|---|
| needs_improvement | **Yes** | Employee claims a level below the requirement; verify the real level |
| matched | **Yes** | Detects inflated claims (the main "faked level" risk) |
| unmatched | **Recommended: yes** | Employee has no recorded level, but resumes miss skills. Testing can discover real skills and create an `employee_skills` row. Cost: longer test and possibly discouraging. Alternative: include only *essential* unmatched skills. |
| additional_skills | **Recommended: no (v1)** | Not required by the position, so it doesn't affect the gap and makes the test longer. Could be an opt-in "verify my other skills" later. |

matched + needs_improvement + unmatched together = **every skill the position requires**, which is a simple rule to explain to users.

## 🟡 D3 — Maximum skills per assessment and their priority

A position can require 10–15 skills (50–75 questions). Recommendation: cap at **8 skills (40 questions)**. Priority: essential before optional; then needs_improvement → unmatched → matched. Skills over the cap are reported as `over_limit` and come first in the next attempt. Confirm the cap and order.

## 🔴 D4 — Scoring table (undefined and conflicting cases)

The rules as written leave **5 cases undefined** and **4 cases conflicting** (full 18-row table in plan §9.3).

Undefined (Beginner question wrong, 2–3 correct overall):

| B | I | A | Total |
|---|---|---|---|
| 0 | 0 | 2 | 2 |
| 0 | 1 | 1 | 2 |
| 0 | 2 | 0 | 2 |
| 0 | 1 | 2 | 3 |
| 0 | 2 | 1 | 3 |

Conflicting:

| B | I | A | Total | Rules |
|---|---|---|---|---|
| 1 | 0 | 0 | 1 | "0–1 correct → None" vs "Beginner correct + 0–1 Intermediate → Beginner" |
| 1 | 1 | 2 | 4 | "→ Beginner" vs "4–5 correct → Advanced" |
| 1 | 2 | 1 | 4 | "→ Intermediate" vs "4–5 correct → Advanced" |
| 1 | 2 | 2 | 5 | "→ Intermediate" vs "4–5 correct → Advanced" |

Also questionable but defined: **B0 I2 A2 → Advanced** while failing the Beginner question; **B1 I0 A2 → Beginner** with both Advanced right.

Proposal for you to accept or change: precedence **"4–5 → Advanced" > "0–1 → None" > "B + 2I → Intermediate" > "B + 0–1 I → Beginner"**, and B=0 with 2–3 correct → **Beginner**. The implementation will be an explicit 18-entry table, so any choice is a one-line change.

## 🔴 D5 — What happens to `employee_skills` when the assessed level is "None"?

| Option | Effect |
|---|---|
| A. Delete the row | Profile shows only proven skills; history is still kept in `assessment_skills.claimed_level` |
| B. Keep the row, set `verified=false`, record the failure in the assessment | Claimed level stays visible; gap analysis keeps trusting it |
| C. Keep the row unchanged; only HR acts on it | Assessment has no automatic effect |

**Recommendation:** A, combined with D13 if you want HR to confirm downgrades/removals.

## 🟡 D6 — Claimed "Expert"

The bank only goes up to Advanced, so Expert can't be verified. Options: (A) assessed Advanced → set Advanced (downgrade); (B) assessed Advanced keeps Expert but sets `verified=false`; (C) skip testing skills claimed at Expert. **Recommendation:** B. A perfect score shouldn't downgrade someone.

## 🟢 D7 — Upgrades and new rows

When the assessed level is higher than the claim, upgrade. When an unmatched skill scores ≥ Beginner, create the row with `verified=true`. **Recommendation:** yes to both.

## 🟡 D8 — Invalid questions in the bank (21 found)

Options: (A) the importer skips invalid questions and reports them (default), with `--strict` to abort; (B) refuse the whole import until the file is fixed; (C) auto-repair. **Recommendation:** A, and send the report to the teammate to fix the source. Never auto-repair: choosing between two "correct" options is a content decision.

## 🟢 D9 — Casing of new skill names

Bank names like `accounting` and `recruit personnel` will become new `Skill` rows. Options: keep them as written, or Title-Case new ones (`Accounting`). **Recommendation:** keep exact names by default, plus `skill_name_map.json` for curated renames/merges. Matching is case-insensitive either way.

## 🟡 D10 — Retake policy

Each attempt reveals 5 of 30 questions per skill. **Recommendation:** a 30-day cooldown per skill (configurable), and prefer questions the employee hasn't seen. Allow HR to override later.

## 🟢 D11 — Question order

**Recommendation:** grouped by skill; inside a skill Beginner → Intermediate → Advanced. Alternative: fully shuffled across skills.

## 🟡 D12 — Expired and terminated attempts

| Event | Options |
|---|---|
| Time runs out | (A) auto-grade what was answered, unanswered = wrong, apply to profile; (B) grade but don't apply; (C) discard |
| Terminated by violations | same options |

**Recommendation:** expired → A (status EXPIRED); terminated → B (graded for HR visibility, not applied).

## 🟡 D13 — Apply results automatically or after HR approval?

**Recommendation:** automatic for v1 (matches the goal "change levels in the database"), with full audit (`claimed_level`, `profile_action`, `scoring_version`). Add an approval step later if needed.

## 🟢 D14 — What the employee sees after submitting

Per skill: assessed level only, or also "x/5 correct"? Never per-question correctness or explanations (that would leak the answer key). **Recommendation:** level + x/5.

## 🟡 D15 — Time per question

The mock uses 5 s. Questions are up to 1,221 characters and options up to 1,528. **Recommendation:** 60 s per question (config), plus an overall deadline enforced by the server = questions × seconds + 2 min grace.

## 🟢 D16 — Fullscreen and copy protection

They're shown on the instructions page but not enforced. **Recommendation:** enforce copy blocking (client side) and report `fullscreen_exit` as a violation, or remove them from the instructions until they're implemented.

## 🟢 D17 — Gemini vocabulary alignment (Phase 10)

Only 13 of 92 current position skills are covered by the bank. **Recommendation:** pass the bank's skill names to `perfect_profile` as preferred names, so newly generated positions use assessable skill names. Requires changing the prompt in `backend/app/ai/perfect_profile.py`.
