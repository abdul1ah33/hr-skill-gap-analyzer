# Skill Alias System Documentation

## Overview

The Skill Alias System enhances skill matching between employees and position requirements across the HR Management application. It solves the exact-string matching limitation by mapping equivalent skills, technologies, and terms to a canonical skill definition before resorting to AI or marking skills as missing.

---

## System Architecture & Matching Pipeline

When comparing employee skills against required position skills, the system uses a modular 4-step pipeline:

```
                  +-----------------------------------+
                  |  Required Position Skill Input    |
                  +-----------------------------------+
                                    |
                                    v
                        +-----------------------+
                        |  Step 1: Exact Match  |
                        +-----------------------+
                                    |
                            (Match Found?) 
                             /         \
                           Yes          No
                           /              \
                          v                v
                  +---------------+   +-----------------------------+
                  | Return Level  |   | Step 2: Alias Lookup        |
                  +---------------+   | (Bidirectional Canonical)   |
                                      +-----------------------------+
                                                     |
                                             (Match Found?)
                                              /         \
                                            Yes          No
                                            /              \
                                           v                v
                                   +---------------+   +-----------------------------+
                                   | Return Level  |   | Step 3: AI Semantic Match   |
                                   +---------------+   | (Future Extension Hook)     |
                                                       +-----------------------------+
                                                                     |
                                                             (Match Found?)
                                                              /         \
                                                            Yes          No
                                                            /              \
                                                           v                v
                                                   +---------------+   +---------------+
                                                   | Return Level  |   | Mark Missing  |
                                                   +---------------+   +---------------+
```

---

## Bidirectional Canonical Skill Resolution

The alias resolution normalizes both required position skills and employee skills to their parent canonical `Skill`.

### Supported Match Scenarios:

| Required Skill | Employee Skill | Resolved Canonical Skill | Outcome |
| :--- | :--- | :--- | :--- |
| `Computer Programming` | `Python` | `Computer Programming` | **Matched** |
| `Python` | `Computer Programming` | `Computer Programming` | **Matched** |
| `Java` | `Python` | `Computer Programming` | **Matched** |
| `Container Management` | `Docker` | `Containerization` | **Matched** |
| `Patient Care` | `CPR` | `Patient Care` | **Matched** |

---

## Database Model & Relationships

### `SkillAlias` (`app/models/skill_alias.py`)
- `id`: Primary Key
- `skill_id`: Foreign Key (`skills.id`, `ondelete="CASCADE"`)
- `alias`: String(100), Unique, Indexed
- `created_at`, `updated_at`: DateTime timestamps

### `Skill` (`app/models/skill.py`)
- `aliases`: `relationship("SkillAlias", back_populates="skill", cascade="all, delete-orphan")`

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

### Running the Seed Script:
```bash
python app/scripts/seed_skill_aliases.py
```

---

## Future-Proofing for AI Semantic Matching

`SkillAliasService.find_matching_employee_skill` returns `None` when neither exact match nor canonical alias resolution succeeds. 

To introduce AI semantic matching in the future:
```python
# In app/services/skill_alias_service.py or skill_gap_service.py:
employee_level = SkillAliasService.find_matching_employee_skill(
    db=db,
    required_skill_name=skill_name,
    employee_skills=employee_skills,
    alias_map=alias_map,
)

if employee_level is None:
    # Insert AI Semantic Matching here before marking as missing:
    # employee_level = AISemanticService.match_skill(skill_name, employee_skills)
    pass
```
