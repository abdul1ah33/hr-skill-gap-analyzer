# Skill Alias System Documentation

## Overview

A skill alias is another name for a skill: `rtg operation` for `rtg crane operation`, `lashing` for `container lashing`. Aliases are stored in `skill_aliases` and used by the deterministic comparison (`SkillComparisonService`), so an employee whose resume says "RTG operation" matches a position that requires "RTG crane operation". The comparison feeds both gap analysis and assessment target selection, so both benefit.

Aliases come from industry templates (`skills.json`, see [templates.md](templates.md)), the seed script below, or the `/skill-aliases` endpoints.

---

## Matching Pipeline

For each skill the position requires:

```
Required position skill
        |
        v
Step 1: the employee has the same skill?            -- yes --> compare levels
        | no
        v
Step 2: the employee has a skill whose name is an   -- yes --> compare levels,
        alias of the required skill, or the other            entry gets "matched_via"
        way round?
        | no
        v
Step 3: unmatched in the comparison. Gemini's gap analysis may still reconcile it
        (reconciled_skills, see ai-analysis.md section 3)
```

- Skill names are normalized (trimmed, single spaces, lowercase), so step 1 is an exact match on the skill.
- In step 2, when several of the employee's skills are aliases of the required skill, the highest level counts.
- `matched_via` holds the employee's own skill name, e.g. `{"skill": "rtg crane operation", "matched_via": "rtg operation", ...}`. The entry's `skill_id` is the required skill, so an assessment tests the required skill.
- An employee skill linked to a required skill by an alias is never listed under `additional_skills`.

### Only direct aliases

| Required Skill | Employee Skill | Aliases | Outcome |
| :--- | :--- | :--- | :--- |
| `rtg crane operation` | `rtg operation` | `rtg operation` → `rtg crane operation` | **Matched** (via alias) |
| `lashing` | `container lashing` | `lashing` → `container lashing` | **Matched** (via alias, other direction) |
| `computer programming` | `python` | `python` → `computer programming` | **Matched** (via alias) |
| `python` | `java` | both → `computer programming` | **Unmatched** |

Two skills that are only aliases of the same third skill are not treated as the same skill. The seeded aliases are often a broader category rather than a synonym (`python`, `java`, `go` are all aliases of `computer programming`), and someone who knows Java doesn't meet a Python requirement.

Implementation: `SkillComparisonService._alias_links` in `backend/app/services/skill_comparison_service.py`. Tests: `backend/tests/test_aliases_and_industry_context.py`.

---

## Database Model & Relationships

### `SkillAlias` (`app/models/skill_alias.py`)
- `id`: Primary Key
- `skill_id`: Foreign Key (`skills.id`, `ondelete="CASCADE"`)
- `alias`: String(100), Unique, Indexed
- `created_at`, `updated_at`: DateTime timestamps

### `Skill` (`app/models/skill.py`)
- `aliases`: `relationship("SkillAlias", back_populates="skill", cascade="all, delete-orphan")`

An alias only affects the comparison when a skill with that name exists and one of the two skills is on the employee's profile while the other is required by the position.

---

## Seed Script & Multi-Domain Coverage

The script `app/scripts/seed_skill_aliases.py` is idempotent and seeds canonical skills and aliases across multiple professions:

- **Tech & Software Engineering**: Python, Java, C#, JS, Go, Rust, Git, PostgreSQL, Docker, Kubernetes, AWS, PyTest, etc.
- **HR & Recruitment**: Talent Acquisition, ATS, Sourcing, SAP Payroll, HRIS, OKRs.
- **Finance & Accounting**: Budgeting, Excel, Power BI, Bookkeeping, Accounts Payable, QuickBooks.
- **Marketing & Sales**: SEO, SEM, Social Media Marketing, Copywriting, Salesforce, Cold Calling.
- **Mechanical Engineering**: AutoCAD, SolidWorks, CATIA, HVAC Design, CFD.
- **Civil Engineering**: STAAD Pro, ETABS, Surveying, GIS, AutoCAD Civil 3D.
- **Electrical Engineering**: PLC Programming, SCADA, Circuit Design, High Voltage.
- **Healthcare & Nursing**: Vital Signs Monitoring, Triage, BLS, CPR, EHR, HIPAA.
- **Logistics & Manufacturing**: Supply Chain, Lean Six Sigma, Kaizen, 5S, WMS.
- **Hospitality**: Guest Relations, Front Desk, HACCP, Culinary Arts.
- **Education**: Instructional Design, E-Learning, LMS, Curriculum Development.

Many of these are categories rather than synonyms. With them seeded, an employee with `python` meets a `computer programming` requirement (and the other way round). Review the list before seeding a client database; industry templates should list true synonyms only.

### Running the Seed Script:
```bash
python app/scripts/seed_skill_aliases.py
```
