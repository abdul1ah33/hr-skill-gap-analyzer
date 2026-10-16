# Industry Templates

An industry template is a folder of JSON files describing what a client in that industry needs: departments, positions, the skills each position requires (with level and essential flag), skill aliases, training courses and assessment questions. Applying a template **copies** that data into the client's own database; after that it is ordinary data that HR customizes through the existing Positions and Position Skills screens.

Background and reasoning: [plans/industry_templates_plan.md](plans/industry_templates_plan.md) (§2, §5.4).

Code map:

| Piece | File |
|---|---|
| File format (Pydantic) and cross-file checks | `backend/app/schemas/template.py` |
| Loader and applier | `backend/app/services/template_service.py` |
| Command line | `backend/app/scripts/apply_template.py` |
| Templates | `backend/app/data/templates/<key>/` |
| Test template | `backend/tests/fixtures/templates/mini/` |

---

## Folder layout

```
backend/app/data/templates/port/
    template.json
    skills.json
    departments.json
    positions.json
    courses.json            optional
    question_bank/*.jsonl   optional, same format as the main question bank
```

The version lives in `template.json`; older versions are in git history.

### `template.json`

```json
{
  "key": "port",
  "name": "Port & Terminal Operations",
  "industry": "port",
  "version": 1,
  "reviewed": false,
  "description": "Optional text."
}
```

- `key`: lowercase letters, digits, `-` and `_`, starting with a letter.
- `industry`: stored lowercase; copied into `organization_settings.industry` if that is empty.
- `reviewed`: set to `true` once a domain expert has reviewed skills, levels and questions. While it is `false` the applier prints a warning.

### `skills.json`

```json
[
  {
    "name": "RTG Crane Operation",
    "description": "Operating rubber-tyred gantry cranes in the container yard.",
    "esco_uri": "http://data.europa.eu/esco/skill/...",
    "aliases": ["Rubber Tyred Gantry Operation", "RTG Operation"]
  }
]
```

Names and aliases are normalized like everywhere else (trimmed, single spaces, lowercase), so `"RTG Crane Operation"` is stored as `rtg crane operation`. `description`, `esco_uri` and `aliases` are optional.

### `departments.json`

```json
[{ "name": "Quay Operations", "description": "Optional." }]
```

### `positions.json`

```json
[
  {
    "title": "RTG Operator",
    "department": "Yard Operations",
    "level": "Junior",
    "description": "Optional.",
    "skills": [
      { "skill": "RTG Crane Operation", "required_level": "Advanced" },
      { "skill": "Radio Communication", "required_level": "Beginner", "is_essential": false,
        "short_description": "Optional." }
    ]
  }
]
```

- `department` is optional; when given it must be in `departments.json`.
- `required_level`: `Beginner`, `Intermediate` or `Advanced`. `is_essential` defaults to `true`.

### `courses.json` (optional)

```json
[
  {
    "title": "IMDG Code Basics",
    "provider": "Test Academy",
    "url": "https://...",
    "difficulty": "Beginner",
    "estimated_hours": 8,
    "description": "Optional.",
    "skills": ["Dangerous Goods Handling"]
  }
]
```

### `question_bank/*.jsonl` (optional)

The same format as `backend/app/data/question_bank/` (one skill per line, six options per question; see [assessment.md](assessment.md)). Every skill used here must be in `skills.json`.

---

## Validation

Before anything is written, the loader checks each file against its schema and then the references between files. All problems are reported together:

- skill names are unique; an alias is not also a skill name and doesn't belong to two skills; an ESCO URI isn't used twice;
- department names are unique; every position's department exists;
- a position appears once per department and lists each skill once; every required skill exists in `skills.json`;
- course titles are unique and their skills exist;
- every skill in the question files exists in `skills.json`.

The question files are imported in **strict** mode: one invalid question stops the whole run.

---

## Applying rules

The applier creates what's missing and **never overwrites** existing rows:

| Data | Matched by | If it exists |
|---|---|---|
| Skills | Name. A name that is already an **alias** resolves to that alias's skill (with a warning) | Kept. An empty `description` / `esco_uri` is filled in from the template |
| Aliases | Alias text | Kept. An alias already pointing at another skill, or equal to a skill name, is skipped with a warning |
| Departments | Name, case-insensitive | Kept |
| Positions | Title (case-insensitive) + department | **Left completely untouched**, including its required skills |
| Position skills | — | Only added to positions created in this run |
| Courses | Title, case-insensitive | Kept |
| Questions | Content hash (question-bank importer) | Unchanged; questions removed from the template files are deactivated |

Consequences:

- **Re-applying the same template changes nothing.**
- **HR customizations survive**: a removed required skill isn't re-added and a changed level isn't reset, because existing positions are never touched.
- New rows get `source = "template:<key>@<version>"` (positions and position skills). HR edits set it back to `manual`.
- Template questions are stored with `source = "template:<key>"`, so applying a template never deactivates questions in the main bank.

Other checks:

- **Coverage gate**: after the import, every template skill must have at least 1 Beginner / 2 Intermediate / 2 Advanced active questions (from the template or the main bank). Otherwise the run fails and nothing is written. The report lists the skills that fall short.
- **Organization settings**: if they don't exist yet, pass `--organization-name`. The applier records `template_key`, `template_version` and `template_applied_at`.
- **One industry per database**: applying a template with a different key than the one already applied is refused, and so is applying an older version of the same template.
- Everything runs in one transaction.

---

## Running it

From `backend/`, with `DATABASE_URL` pointing at the client's database:

```bash
# Validate and see what would happen; writes nothing
python -m app.scripts.apply_template port --dry-run --organization-name "Client A Port"

# Apply
python -m app.scripts.apply_template port --organization-name "Client A Port"

# A template folder outside app/data/templates, with a JSON report
python -m app.scripts.apply_template path/to/template --dry-run --report report.json
```

Example output:

```
Template: Mini Port (test template) (mini v1)
WARNING: this template has not been reviewed by a domain expert yet
Skills: 6 created, 0 already present
Aliases: 4 created, 0 already present
Departments: 2 created, 0 already present
Positions: 3 created, 0 already present
Position skills: 8 created, 0 already present
Courses: 1 created, 0 already present
Questions: 30 inserted, 0 unchanged, 0 reactivated, 0 deactivated
Not assessable skills: 0
Dry run: nothing was written.
```

Exit code is `0` on success and `1` when the template is invalid or can't be applied.

---

## Authoring a template

1. List departments and positions (ideally from the client's org chart).
2. Draft each position's skills, using ESCO + Gemini the way `PositionSkillService` does, then trim and normalize by hand. Fill in `esco_uri` where there is a matching ESCO concept.
3. Generate questions for every skill with `python -m app.scripts.generate_question_bank` and put the output in `question_bank/`.
4. Run `apply_template <key> --dry-run` against a scratch database until it passes.
5. Have a domain expert review it, then set `"reviewed": true`.

## Not supported yet

Upgrading a client from one template version to the next (beyond adding what's missing), templates inheriting from each other, and certification requirements. See plan §6.
