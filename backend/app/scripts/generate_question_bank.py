"""
Generate assessment questions with Gemini for skills that have none yet.

By default it targets skills required by at least one position that are not
covered by any question-bank file, minus SKIPPED_SKILLS (too vague to test).
Results go to app/data/question_bank/generated/<output>.jsonl in the same
format as output_question_bank.jsonl (one line per skill, names lowercase).

The run is resumable: finished levels are kept in <output>.progress.json, so
a run stopped by the Gemini quota continues where it left off.

Usage (from backend/):
    python -m app.scripts.generate_question_bank --dry-run
    python -m app.scripts.generate_question_bank
    python -m app.scripts.generate_question_bank --skills "sql,java" --per-level 5
"""
import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path

# Add backend directory to sys.path if running directly
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from google import genai

from app.ai.question_generator import (
    DEFAULT_MODEL,
    QuotaExhaustedError,
    generate_level_questions,
)
from app.schemas.question_bank import SkillQuestionBank

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("generate_question_bank")

BANK_DIR = backend_dir / "app" / "data" / "question_bank"
GENERATED_DIR = BANK_DIR / "generated"
LEVELS = ("Beginner", "Intermediate", "Advanced")

# Position skills that are too broad (or duplicates of a more specific skill)
# to produce meaningful questions. Compared in lowercase.
SKIPPED_SKILLS = {
    "computer programming",
    "troubleshooting",
    "debugging",                # covered by "software debugging"
    "engineering principles",
    "team leadership",
    "production processes",
    "process optimization",
    "technical reporting",
    "prototyping",              # covered by "software prototyping"
    "configuration management", # covered by "software configuration management"
    "product testing",
    "quality assurance",
}


def normalize_skill_name(name: str) -> str:
    return " ".join(name.split()).lower()


def covered_skill_names() -> set[str]:
    """Lowercase skill names that already have questions in any bank file."""
    names: set[str] = set()
    for path in BANK_DIR.rglob("*.jsonl"):
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    names.add(normalize_skill_name(json.loads(line)["skill_name"]))
    return names


def position_skill_names() -> list[str]:
    from app.db.database import SessionLocal
    from app.models.position_skill import PositionSkill
    from app.models.skill import Skill

    db = SessionLocal()
    try:
        rows = (
            db.query(Skill.name)
            .join(PositionSkill, PositionSkill.skill_id == Skill.id)
            .distinct()
            .all()
        )
        return sorted({normalize_skill_name(r[0]) for r in rows})
    finally:
        db.close()


def load_progress(path: Path) -> dict:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {}


def save_progress(path: Path, progress: dict) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(progress, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--skills", help="Comma-separated skill names (overrides the DB selection)")
    parser.add_argument("--per-level", type=int, default=5, help="Questions per level (default 5)")
    parser.add_argument("--limit", type=int, help="Stop after this many skills")
    parser.add_argument("--output", default="position_skills", help="Output file name without extension")
    parser.add_argument("--delay", type=float, default=6.0, help="Seconds between Gemini calls (default 6)")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--dry-run", action="store_true", help="Only list the skills that would be generated")
    args = parser.parse_args()

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    output_path = GENERATED_DIR / f"{args.output}.jsonl"
    progress_path = GENERATED_DIR / f"{args.output}.progress.json"
    report_path = GENERATED_DIR / f"{args.output}.rejections.log"

    covered = covered_skill_names()
    if args.skills:
        candidates = [normalize_skill_name(s) for s in args.skills.split(",") if s.strip()]
    else:
        candidates = [s for s in position_skill_names() if s not in SKIPPED_SKILLS]
    targets = [s for s in candidates if s not in covered]
    if args.limit:
        targets = targets[: args.limit]

    logger.info("%d skills to generate (%d questions each)", len(targets), args.per_level * len(LEVELS))
    if args.dry_run:
        for name in targets:
            print(f"  {name}")
        return 0
    if not targets:
        return 0

    load_dotenv(backend_dir / ".env")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY is not set in backend/.env")
        return 1
    client = genai.Client(api_key=api_key)

    progress = load_progress(progress_path)
    done = 0
    try:
        for index, skill_name in enumerate(targets, start=1):
            skill_progress = progress.setdefault(skill_name, {})
            for level in LEVELS:
                if len(skill_progress.get(level, [])) >= args.per_level:
                    continue
                existing = skill_progress.get(level, [])
                logger.info("[%d/%d] %s - %s", index, len(targets), skill_name, level)
                questions, rejections = generate_level_questions(
                    client,
                    skill_name,
                    level,
                    count=args.per_level - len(existing),
                    avoid_texts=[q["question_text"] for lvl in skill_progress.values() for q in lvl],
                    model_name=args.model,
                )
                skill_progress[level] = existing + questions
                save_progress(progress_path, progress)
                if rejections:
                    with open(report_path, "a", encoding="utf-8") as f:
                        for reason in rejections:
                            f.write(f"{skill_name} | {level} | {reason}\n")
                time.sleep(args.delay)

            if all(len(skill_progress.get(level, [])) >= args.per_level for level in LEVELS):
                bank = SkillQuestionBank(
                    skill_name=skill_name,
                    questions=[q for level in LEVELS for q in skill_progress[level]],
                )
                with open(output_path, "a", encoding="utf-8") as f:
                    f.write(bank.model_dump_json() + "\n")
                del progress[skill_name]
                save_progress(progress_path, progress)
                done += 1
            else:
                logger.warning("%s is incomplete; it will be retried on the next run", skill_name)
    except QuotaExhaustedError as err:
        logger.error("Gemini quota reached, stopping. Re-run later to continue. (%s)", err)
        logger.info("%d skills finished in this run; output: %s", done, output_path)
        return 2

    logger.info("%d skills finished; output: %s", done, output_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
