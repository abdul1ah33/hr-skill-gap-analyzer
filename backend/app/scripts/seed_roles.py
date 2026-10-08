"""
Create the roles the application needs (HR and Employee). Idempotent:
existing roles are left unchanged.

Usage (from backend/):
    python -m app.scripts.seed_roles
"""
import sys
from pathlib import Path

# Add backend directory to sys.path if running directly
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.role import Role


ROLES = {
    "HR": "Human Resources manager with full administrative access",
    "Employee": "Regular employee with self-service access",
}


def seed_roles(db: Session) -> list[str]:
    """Create missing roles and return the names that were created."""
    existing = {name for (name,) in db.query(Role.name).all()}
    created = []
    for name, description in ROLES.items():
        if name not in existing:
            db.add(Role(name=name, description=description))
            created.append(name)
    db.commit()
    return created


if __name__ == "__main__":
    session = SessionLocal()
    try:
        created = seed_roles(session)
        print(f"Created roles: {', '.join(created)}" if created else "All roles already exist.")
    finally:
        session.close()
