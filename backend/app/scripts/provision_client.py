"""
Set up a new client with one command (docs/deployment.md, plan §3):

    1. clients/<name>.env      created with a new database password and SECRET_KEY
                               (an existing file is reused)
    2. database + user         <name> / <name>; only that user (and the admin)
                               may connect to the database
    3. migrations              alembic upgrade head
    4. first data              roles, organization settings, first HR user
    5. question bank           the main bank (app/data/question_bank)
    6. industry template       optional, e.g. --template port
    7. summary                 HR login and what to add to docker-compose.yml / the Caddyfile

Every step can be re-run: a failed provisioning can simply be run again.

Run it in the tools container, which can reach the postgres service:

    docker compose run --rm tools python -m app.scripts.provision_client client_a \
        --organization-name "Client A Port" --industry port --template port \
        --hr-email hr@client-a.com

Needs POSTGRES_ADMIN_URL (a superuser connection, set by docker-compose.yml).
The HR password is taken from HR_PASSWORD, or generated and printed once.
"""
import argparse
import os
import secrets
import sys
from pathlib import Path

# Add backend directory to sys.path if running directly
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import psycopg
from psycopg import sql
from sqlalchemy.engine import make_url

from app.scripts.client_env import (
    CLIENTS_DIR,
    StepError,
    check_client_name,
    env_path,
    new_env,
    read_env,
    run_step,
)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Provision a new client.")
    parser.add_argument("name", help="Client name, e.g. client_a (also the database name)")
    parser.add_argument("--organization-name", required=True, help="Company name shown in the app")
    parser.add_argument("--industry", help="e.g. port; set from the template if omitted")
    parser.add_argument("--template", help="Industry template key or folder to apply")
    parser.add_argument("--hr-email", required=True, help="Login of the first HR user")
    parser.add_argument("--hr-username", default="hr")
    parser.add_argument(
        "--cors-origin",
        help="Frontend URL, for a new env file (default: http://<name with - for _>.localhost)",
    )
    parser.add_argument("--db-host", default="postgres", help="Database host[:port], for a new env file")
    parser.add_argument("--skip-question-bank", action="store_true", help="Don't import the main bank")
    parser.add_argument("--clients-dir", type=Path, default=CLIENTS_DIR, help=argparse.SUPPRESS)
    return parser.parse_args(argv)


def admin_conninfo() -> str:
    url = os.environ.get("POSTGRES_ADMIN_URL")
    if not url:
        raise StepError("POSTGRES_ADMIN_URL is not set (a superuser connection to the postgres database).")
    return url.replace("postgresql+psycopg://", "postgresql://", 1)


def ensure_env_file(args: argparse.Namespace) -> tuple[Path, bool]:
    path = env_path(args.name, args.clients_dir)
    if path.exists():
        return path, False

    path.parent.mkdir(parents=True, exist_ok=True)
    cors_origin = args.cors_origin or f"http://{args.name.replace('_', '-')}.localhost"
    path.write_text(
        new_env(args.name, args.db_host, cors_origin, os.environ.get("GEMINI_API_KEY", "")),
        encoding="utf-8",
    )
    os.chmod(path, 0o600)
    return path, True


def ensure_database(admin_url: str, database_url: str) -> list[str]:
    """
    Create the client's database user and database if missing; keep the
    user's password in line with the env file. Returns what was done.
    """
    url = make_url(database_url)
    user, password, database = url.username, url.password, url.database
    if not (user and password and database):
        raise StepError("DATABASE_URL must include a user, a password and a database name.")

    done = []
    with psycopg.connect(admin_url, autocommit=True) as conn:
        role_exists = conn.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (user,)).fetchone()
        verb = "ALTER ROLE {} WITH LOGIN PASSWORD {}" if role_exists else "CREATE ROLE {} LOGIN PASSWORD {}"
        conn.execute(sql.SQL(verb).format(sql.Identifier(user), sql.Literal(password)))
        done.append(f"database user '{user}' {'updated' if role_exists else 'created'}")

        if conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (database,)).fetchone():
            done.append(f"database '{database}' already exists")
        else:
            conn.execute(sql.SQL("CREATE DATABASE {} OWNER {}").format(
                sql.Identifier(database), sql.Identifier(user),
            ))
            done.append(f"database '{database}' created")

        # By default every user may connect to every database; only the
        # owner (and superusers) may connect to this one
        conn.execute(sql.SQL("REVOKE ALL ON DATABASE {} FROM PUBLIC").format(sql.Identifier(database)))

    return done


def provision(args: argparse.Namespace) -> str | None:
    """Run every step. Returns the generated HR password, if one was generated."""
    check_client_name(args.name)

    path, created = ensure_env_file(args)
    print(f"-- Env file: {path} ({'created' if created else 'already exists, reused'})")
    client_env = read_env(path)

    print("\n-- Database")
    for line in ensure_database(admin_conninfo(), client_env["DATABASE_URL"]):
        print(line)

    run_step("Migrations", ["-m", "alembic", "upgrade", "head"], client_env)

    hr_password = os.environ.get("HR_PASSWORD")
    generated = None
    if not hr_password:
        hr_password = generated = secrets.token_urlsafe(12)
    init_args = [
        "-m", "app.scripts.init_client",
        "--organization-name", args.organization_name,
        "--hr-email", args.hr_email,
        "--hr-username", args.hr_username,
    ]
    if args.industry:
        init_args += ["--industry", args.industry]
    run_step("Roles, organization, HR user", init_args, {**client_env, "HR_PASSWORD": hr_password})

    if not args.skip_question_bank:
        run_step("Main question bank", ["-m", "app.scripts.import_question_bank"], client_env)

    if args.template:
        run_step(
            f"Industry template '{args.template}'",
            ["-m", "app.scripts.apply_template", args.template],
            client_env,
        )

    return generated


def print_summary(args: argparse.Namespace, generated_password: str | None) -> None:
    service = f"api-{args.name.replace('_', '-')}"
    print(f"\nOK: Client '{args.name}' is provisioned.")
    print(f"  HR login: {args.hr_username} / {args.hr_email}")
    if generated_password:
        print(f"  HR password (shown once, change it after the first login): {generated_password}")
    print(
        "\nIf this is a new client, add it to docker-compose.yml and deploy/Caddyfile:\n\n"
        f"  {service}:\n"
        "    <<: *api\n"
        "    env_file:\n"
        f"      - path: clients/{args.name}.env\n"
        "        required: false\n\n"
        f"  http://{args.name.replace('_', '-')}.localhost {{\n"
        f"      import client {service}\n"
        "  }\n\n"
        f"then: docker compose up -d {service} && docker compose restart proxy"
    )


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        generated = provision(args)
    except (StepError, psycopg.Error) as err:
        print(f"\nFAILED: Provisioning stopped: {err}\nFix the problem and run the same command again.")
        return 1
    print_summary(args, generated)
    return 0


if __name__ == "__main__":
    sys.exit(main())
