"""
Upgrade every client after deploying a new version (docs/deployment.md):
for each clients/*.env, run the database migrations and re-import the main
question bank. Stops at the first failure, so later clients stay on the
old version until it is fixed.

This is the tools container's default command:

    docker compose build
    docker compose run --rm tools
    docker compose up -d

Usage (from backend/):
    python -m app.scripts.upgrade_clients [client_a client_b ...]
"""
import argparse
import sys
from pathlib import Path

# Add backend directory to sys.path if running directly
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.scripts.client_env import CLIENTS_DIR, StepError, client_env_files, read_env, run_step


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate every client database.")
    parser.add_argument("clients", nargs="*", help="Only these clients (default: every clients/*.env)")
    parser.add_argument("--skip-question-bank", action="store_true", help="Only run migrations")
    parser.add_argument("--clients-dir", type=Path, default=CLIENTS_DIR, help=argparse.SUPPRESS)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    files = client_env_files(args.clients_dir)
    if args.clients:
        wanted = set(args.clients)
        missing = wanted - {path.stem for path in files}
        if missing:
            print(f"No env file for: {', '.join(sorted(missing))}")
            return 1
        files = [path for path in files if path.stem in wanted]
    if not files:
        print(f"No client env files in {args.clients_dir}")
        return 1

    done: list[str] = []
    for path in files:
        name = path.stem
        print(f"\n== {name}")
        try:
            client_env = read_env(path)
            run_step(f"{name}: migrations", ["-m", "alembic", "upgrade", "head"], client_env)
            if not args.skip_question_bank:
                run_step(f"{name}: main question bank", ["-m", "app.scripts.import_question_bank"], client_env)
        except StepError as err:
            print(f"\nFAILED: {err}")
            print(f"Upgraded: {', '.join(done) or 'none'}")
            print(f"Not upgraded: {', '.join(p.stem for p in files[len(done):])}")
            return 1
        done.append(name)

    print(f"\nOK: Upgraded {len(done)} client(s): {', '.join(done)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
