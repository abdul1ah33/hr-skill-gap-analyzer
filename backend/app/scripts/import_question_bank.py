"""
Import the question bank into the database. Safe to run repeatedly: existing
questions are left unchanged, new ones are inserted, and questions removed
from a file are deactivated (never deleted).

By default it imports app/data/question_bank/*.jsonl (source "curated") and
app/data/question_bank/generated/*.jsonl (source "generated:<model>").
Deactivation only looks at the sources of the files being imported.

Usage (from backend/):
    python -m app.scripts.import_question_bank --dry-run
    python -m app.scripts.import_question_bank
    python -m app.scripts.import_question_bank path/to/file.jsonl --strict
    python -m app.scripts.import_question_bank --report rejected.json
"""
import argparse
import json
import sys
from pathlib import Path

# Add backend directory to sys.path if running directly
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db.database import SessionLocal, engine
from app.services.question_bank_import_service import (
    QuestionBankImportError,
    QuestionBankImportService,
    default_bank_files,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import question-bank JSONL files.")
    parser.add_argument("paths", nargs="*", type=Path, help="Files to import (default: all bank files)")
    parser.add_argument("--dry-run", action="store_true", help="Validate and report, then roll back")
    parser.add_argument("--strict", action="store_true", help="Abort on the first invalid question")
    parser.add_argument("--report", type=Path, help="Write the full report as JSON to this file")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    paths = args.paths or default_bank_files()

    missing = [str(p) for p in paths if not p.is_file()]
    if missing:
        print(f"File not found: {', '.join(missing)}")
        return 1

    # The engine echoes SQL by default; thousands of inserts would bury the report
    engine.echo = False

    session = SessionLocal()
    try:
        report = QuestionBankImportService(session, strict=args.strict).import_files(paths)
        if args.dry_run:
            session.rollback()
        else:
            session.commit()
    except QuestionBankImportError as err:
        session.rollback()
        print(f"Import aborted, nothing was written: {err}")
        return 1
    finally:
        session.close()

    print(report.summary())
    print("Dry run: nothing was written." if args.dry_run else "Import committed.")

    if args.report:
        args.report.write_text(json.dumps(report.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Report written to {args.report}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
