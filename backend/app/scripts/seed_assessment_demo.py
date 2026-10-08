"""
Demo data for trying skill assessments: 9 positions built from the question
bank's skill families (plan §16), one mock employee per position with a mix
of matched / below-level / missing skills, and an Employee login for each.

Every position skill has bank questions, so every skill can be tested.
Idempotent: existing departments, positions, employees, users and skills are
reused and never changed; only missing rows are added.

Requires the roles and the imported question bank:
    python -m app.scripts.seed_roles
    python -m app.scripts.import_question_bank

Usage (from backend/):
    python -m app.scripts.seed_assessment_demo
"""
import sys
from pathlib import Path

# Add backend directory to sys.path if running directly
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.database import SessionLocal, engine
from app.models.department import Department
from app.models.employee import Employee
from app.models.employee_skill import EmployeeSkill, SkillLevel
from app.models.position import Position
from app.models.position_skill import PositionSkill
from app.models.role import Role
from app.models.skill import Skill
from app.models.user import User

# Shared password of every demo employee account
DEMO_PASSWORD = "Demo@1234"

B, I, A = SkillLevel.BEGINNER, SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED
E, O = True, False  # essential / optional

# title, department, level, [(bank skill, required level, essential)],
# employee (number, first, last, years of experience, extra skill)
DEMO_POSITIONS = [
    (
        "Backend Software Engineer", "IT and Computer Engineering", "Mid",
        [("python", A, E), ("django", I, E), ("postgresql", I, E), ("git", I, E),
         ("javascript", I, O), ("graphql", B, O), ("mysql", I, O)],
        ("DEMO001", "Youssef", "Kamal", 4, "microsoft excel"),
    ),
    (
        "Cloud DevOps Engineer", "IT and Computer Engineering", "Senior",
        [("docker", A, E), ("kubernetes", I, E), ("amazon web services aws cloudformation", I, E),
         ("linux", A, E), ("bash", I, E), ("ansible", I, O), ("jenkins ci", I, O),
         ("apache kafka", B, O), ("ubuntu", I, O), ("apache http server", B, O),
         ("splunk enterprise", B, O)],
        ("DEMO002", "Mariam", "Fathy", 7, "python"),
    ),
    (
        "Data Scientist", "Data and AI", "Mid",
        [("machine learning", A, E), ("deep learning", I, E), ("tensorflow", I, E),
         ("data mining software", I, E), ("pytorch", I, O), ("apache spark", I, O),
         ("matlab", I, O), ("hadoop", B, O), ("sas", B, O), ("ibm spss statistics", B, O)],
        ("DEMO003", "Khaled", "Mansour", 3, "python"),
    ),
    (
        "Mechanical Design Engineer", "Engineering", "Mid",
        [("mechanical engineering", A, E), ("thermodynamics", I, E),
         ("dassault systemes solidworks", A, E), ("autodesk autocad", I, E),
         ("finite element analysis software", I, E), ("autodesk inventor", I, O),
         ("ptc creo parametric", I, O), ("computer-aided engineering cae software", I, O),
         ("siemens nx", B, O), ("computerized numerical control cnc software", B, O)],
        ("DEMO004", "Nour", "Saleh", 5, "microsoft excel"),
    ),
    (
        "Civil Construction Engineer", "Construction", "Senior",
        [("civil engineering", A, E), ("construction methods", I, E),
         ("autodesk autocad civil 3d", I, E), ("building information modelling", I, E),
         ("project management", I, E), ("surveying", I, O), ("bentley microstation", B, O),
         ("urban planning", B, O), ("oasys structural design and analysis software", B, O)],
        ("DEMO005", "Hassan", "Adel", 9, "autodesk autocad"),
    ),
    (
        "Finance Manager", "Finance", "Senior",
        [("accounting", A, E), ("financial analysis", A, E), ("risk management", I, E),
         ("microsoft excel", A, E), ("general ledger software", I, E),
         ("intuit quickbooks", I, O), ("accounts payable software", I, O),
         ("sage 50 accounting", B, O), ("payroll software", B, O)],
        ("DEMO006", "Laila", "Hamdy", 10, "project management"),
    ),
    (
        "Recruitment Manager", "Human Resources", "Senior",
        [("human resource management", A, E), ("recruit personnel", A, E),
         ("employment law", I, E), ("applicant tracking software", I, E),
         ("employee performance management system", I, E), ("oracle taleo", I, O),
         ("manage payroll", I, O), ("oracle peoplesoft human capital management", B, O),
         ("adp workforce now", B, O)],
        ("DEMO007", "Salma", "Ibrahim", 8, "microsoft excel"),
    ),
    (
        "Digital Marketing Specialist", "Marketing", "Mid",
        [("digital marketing techniques", I, E), ("search engine optimization seo software", I, E),
         ("google analytics", I, E), ("google ads", I, E), ("social media marketing techniques", I, E),
         ("content marketing strategy", I, O), ("web analytics", I, O), ("adobe photoshop", B, O),
         ("mailchimp", B, O), ("salesforce marketing cloud", B, O)],
        ("DEMO008", "Omar", "Farouk", 3, "microsoft excel"),
    ),
    (
        "Restaurant Manager", "Hospitality", "Mid",
        [("manage restaurant service", A, E), ("food safety standards", A, E),
         ("customer service", A, E), ("food and beverage industry", I, E),
         ("point of sale pos restaurant software", I, E), ("event management", I, O),
         ("hotel operations", B, O), ("micros systems opera property management system pms", B, O)],
        ("DEMO009", "Dina", "Mostafa", 6, "project management"),
    ),
]

LOWER = {I: B, A: I}


def employee_level(index: int, required: SkillLevel) -> SkillLevel | None:
    """
    Spread the position's skills over the gap categories:
    every 3rd skill matched, the next one level below (needs improvement),
    the next missing (unmatched).
    """
    kind = index % 3
    if kind == 0:
        return required
    if kind == 1:
        return LOWER.get(required)  # None for Beginner → missing
    return None


def _get_or_create(db: Session, model, defaults: dict | None = None, **filters):
    row = db.query(model).filter_by(**filters).first()
    if row is not None:
        return row, False
    row = model(**filters, **(defaults or {}))
    db.add(row)
    db.flush()
    return row, True


def seed_demo(db: Session) -> list[tuple[str, str, str]]:
    """Create missing demo rows. Returns (position, username, email) per employee."""
    employee_role = db.query(Role).filter_by(name="Employee").first()
    if employee_role is None:
        raise SystemExit("Role 'Employee' is missing. Run: python -m app.scripts.seed_roles")

    all_names = {name for _, _, _, skills, employee in DEMO_POSITIONS for name, _, _ in skills} | {
        employee[4] for *_, employee in DEMO_POSITIONS
    }
    skills = {s.name: s for s in db.query(Skill).filter(Skill.name.in_(all_names))}
    missing = sorted(all_names - skills.keys())
    if missing:
        raise SystemExit(
            f"Skills missing: {', '.join(missing)}. Run: python -m app.scripts.import_question_bank"
        )

    accounts = []
    for title, department_name, level, position_skills, employee_data in DEMO_POSITIONS:
        department, _ = _get_or_create(db, Department, name=department_name)
        position, _ = _get_or_create(
            db, Position, title=title,
            defaults={"department_id": department.id, "level": level},
        )

        for skill_name, required, essential in position_skills:
            _get_or_create(
                db, PositionSkill,
                position_id=position.id, skill_id=skills[skill_name].id,
                defaults={"required_skill_level": required, "is_essential": essential},
            )

        number, first, last, years, extra_skill = employee_data
        email = f"{first.lower()}.{last.lower()}@demo.local"
        employee, created = _get_or_create(
            db, Employee, employee_number=number,
            defaults={
                "first_name": first,
                "last_name": last,
                "email": email,
                "years_experience": years,
                "department_id": department.id,
                "position_id": position.id,
                "notes": "Demo employee for skill assessments",
            },
        )

        if created:
            for index, (skill_name, required, _) in enumerate(position_skills):
                owned = employee_level(index, required)
                if owned is not None:
                    db.add(EmployeeSkill(employee_id=employee.id, skill_id=skills[skill_name].id, level=owned))
            if extra_skill not in {name for name, _, _ in position_skills}:
                db.add(EmployeeSkill(employee_id=employee.id, skill_id=skills[extra_skill].id, level=I))

        username = f"{first.lower()}.{last.lower()}"
        if db.query(User).filter_by(employee_id=employee.id).first() is None:
            db.add(User(
                username=username,
                email=employee.email,
                password_hash=hash_password(DEMO_PASSWORD),
                role_id=employee_role.id,
                employee_id=employee.id,
            ))

        accounts.append((title, username, employee.email))

    db.commit()
    return accounts


if __name__ == "__main__":
    engine.echo = False
    session = SessionLocal()
    try:
        rows = seed_demo(session)
    finally:
        session.close()

    print(f"Demo employee accounts (password: {DEMO_PASSWORD}):")
    for title, username, email in rows:
        print(f"  {title:<30} {username:<20} {email}")
