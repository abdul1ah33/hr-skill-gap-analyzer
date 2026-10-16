"""
First data in a new client database: roles, organization settings and the
first HR user. Safe to run again: existing rows are left unchanged.
Normally run by provision_client (docs/deployment.md).

The HR password is read from the HR_PASSWORD environment variable, so it
doesn't show up in the process list.

Usage (from backend/):
    HR_PASSWORD=... python -m app.scripts.init_client \
        --organization-name "Client A Port" --industry port \
        --hr-email hr@client-a.com --hr-username hr
"""
import argparse
import os
import sys
from pathlib import Path

# Add backend directory to sys.path if running directly
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.security import hash_password
from app.crud.organization import get_organization, save_organization
from app.db.database import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.schemas.organization import OrganizationUpdate
from app.scripts.seed_roles import seed_roles


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Roles, organization settings and first HR user.")
    parser.add_argument("--organization-name", required=True)
    parser.add_argument("--industry")
    parser.add_argument("--hr-email", required=True)
    parser.add_argument("--hr-username", default="hr")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    password = os.environ.get("HR_PASSWORD")
    if not password:
        print("HR_PASSWORD is not set.")
        return 1

    session = SessionLocal()
    try:
        created = seed_roles(session)
        print(f"Roles created: {', '.join(created)}" if created else "Roles already exist.")

        organization = get_organization(session)
        if organization is None:
            save_organization(
                session,
                OrganizationUpdate(name=args.organization_name, industry=args.industry),
            )
            print(f"Organization settings created: {args.organization_name}")
        else:
            print(f"Organization settings already exist: {organization.name}")

        existing = (
            session.query(User)
            .filter((User.email == args.hr_email) | (User.username == args.hr_username))
            .first()
        )
        if existing is None:
            hr_role = session.query(Role).filter(Role.name == "HR").one()
            session.add(User(
                username=args.hr_username,
                email=args.hr_email,
                password_hash=hash_password(password),
                role_id=hr_role.id,
            ))
            print(f"HR user created: {args.hr_username} <{args.hr_email}>")
        else:
            print(f"User already exists, left unchanged: {existing.username} <{existing.email}>")

        session.commit()
    finally:
        session.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
