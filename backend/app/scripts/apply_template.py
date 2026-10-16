"""
Apply an industry template to the database in DATABASE_URL. Safe to run
repeatedly: existing rows are never overwritten, so re-applying changes
nothing. See docs/templates.md.

The template is a key under app/data/templates/ or a path to a template folder.

Usage (from backend/):
    python -m app.scripts.apply_template port --dry-run
    python -m app.scripts.apply_template port --organization-name "Client A Port"
    python -m app.scripts.apply_template path/to/template --report report.json
"""
import argparse
import json
import sys
from pathlib import Path

# Add backend directory to sys.path if running directly
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db.database import SessionLocal
from app.services.template_service import (
    TemplateError,
    TemplateService,
    resolve_template_dir,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply an industry template.")
    parser.add_argument("template", help="Template key (e.g. port) or path to a template folder")
    parser.add_argument("--dry-run", action="store_true", help="Validate and report, then roll back")
    parser.add_argument(
        "--organization-name",
        help="Company name, needed only if organization settings don't exist yet",
    )
    parser.add_argument("--report", type=Path, help="Write the full report as JSON to this file")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    directory = resolve_template_dir(args.template)

    session = SessionLocal()
    try:
        report = TemplateService(session).apply(directory, organization_name=args.organization_name)
        if args.dry_run:
            session.rollback()
        else:
            session.commit()
    except TemplateError as err:
        session.rollback()
        if err.report is not None:
            print(err.report.summary())
        print(f"\nTemplate not applied, nothing was written:\n{err}")
        return 1
    finally:
        session.close()

    print(report.summary())
    print("Dry run: nothing was written." if args.dry_run else "Template applied.")

    if args.report:
        args.report.write_text(json.dumps(report.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Report written to {args.report}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
