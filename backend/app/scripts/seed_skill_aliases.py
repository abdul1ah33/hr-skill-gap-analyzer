import sys
from pathlib import Path

# Add backend directory to sys.path if running directly
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db.database import SessionLocal
from app.models.skill import Skill
from app.models.skill_alias import SkillAlias


SEED_DATA = {
    # Tech / Software
    "Computer Programming": [
        "Python", "Java", "C#", "JavaScript", "TypeScript", "Go", "Rust", "C++", "C", "PHP", "Ruby", "Swift", "Kotlin"
    ],
    "Version Control": [
        "Git", "GitHub", "GitLab", "Bitbucket", "SVN"
    ],
    "Database Management": [
        "PostgreSQL", "MySQL", "SQL Server", "Oracle", "SQLite", "MongoDB", "Redis", "Cassandra"
    ],
    "Cloud Computing": [
        "AWS", "Azure", "Google Cloud", "GCP", "Cloud Architecture"
    ],
    "Containerization": [
        "Docker", "Kubernetes", "Podman", "Container Management"
    ],
    "CI/CD": [
        "GitHub Actions", "GitLab CI", "Jenkins", "CircleCI", "ArgoCD"
    ],
    "Testing": [
        "Unit Testing", "Integration Testing", "PyTest", "JUnit", "Selenium", "Cypress"
    ],
    "Cybersecurity": [
        "Penetration Testing", "SIEM", "Firewall Administration", "Ethical Hacking", "Network Security"
    ],
    "Linux Administration": [
        "Ubuntu", "CentOS", "Red Hat", "Debian", "Bash Scripting"
    ],
    "Office Software": [
        "Microsoft Excel", "Microsoft Word", "PowerPoint", "Google Sheets", "Google Docs"
    ],
    "Project Management": [
        "Jira", "Asana", "Trello", "Agile", "Scrum", "Kanban", "PMP"
    ],
    "Communication": [
        "Business Communication", "Presentation Skills", "Public Speaking", "Technical Writing"
    ],

    # HR & Recruitment
    "Recruitment": [
        "Talent Acquisition", "ATS", "Interviewing", "Sourcing", "Headhunting"
    ],
    "Payroll": [
        "SAP Payroll", "Oracle Payroll", "Payroll Processing", "ADP", "Compensation & Benefits"
    ],
    "HR Management": [
        "Human Resources", "Employee Relations", "HR Policy", "HRIS", "Onboarding"
    ],
    "Performance Management": [
        "KPI Tracking", "OKRs", "Talent Management", "Employee Appraisals"
    ],

    # Finance & Accounting
    "Financial Analysis": [
        "Budgeting", "Excel", "Power BI", "Financial Modeling", "Forecasting", "Variance Analysis"
    ],
    "Accounting": [
        "Bookkeeping", "General Ledger", "Accounts Payable", "Accounts Receivable", "QuickBooks", "Xero"
    ],
    "Taxation": [
        "Tax Planning", "Corporate Tax", "VAT Compliance", "Tax Auditing"
    ],
    "Financial Planning": [
        "Wealth Management", "Asset Allocation", "Portfolio Management"
    ],

    # Marketing & Sales
    "Digital Marketing": [
        "SEO", "SEM", "Google Analytics", "Social Media Marketing", "Email Marketing", "PPC"
    ],
    "Content Strategy": [
        "Copywriting", "Content Marketing", "Blogging", "Brand Storytelling"
    ],
    "Sales Management": [
        "B2B Sales", "Lead Generation", "CRM", "Salesforce", "Account Management", "Cold Calling"
    ],

    # Mechanical Engineering
    "Mechanical Design": [
        "AutoCAD", "SolidWorks", "CATIA", "3D CAD Modeling", "Autodesk Inventor"
    ],
    "Thermodynamics": [
        "HVAC Design", "Heat Transfer", "Thermal Analysis", "CFD Simulation"
    ],

    # Civil Engineering
    "Structural Engineering": [
        "STAAD Pro", "ETABS", "Structural Analysis", "Concrete Design", "Steel Design"
    ],
    "Surveying": [
        "GIS", "Total Station", "Land Surveying", "AutoCAD Civil 3D"
    ],

    # Electrical Engineering
    "Electrical Design": [
        "PLC Programming", "SCADA", "AutoCAD Electrical", "Circuit Design", "Embedded Systems"
    ],
    "Power Systems": [
        "High Voltage", "Substation Automation", "Power Distribution", "Grid Operations"
    ],

    # Healthcare & Nursing
    "Patient Care": [
        "Vital Signs Monitoring", "Triage", "Patient Assessment", "Basic Life Support (BLS)", "CPR"
    ],
    "Medical Diagnosis": [
        "Clinical Pathology", "Radiology Interpretation", "Diagnostic Testing"
    ],
    "Healthcare Administration": [
        "Electronic Health Records (EHR)", "HIPAA Compliance", "Medical Coding", "Epic Systems"
    ],

    # Logistics, Supply Chain & Manufacturing
    "Supply Chain Management": [
        "Logistics Optimization", "Vendor Management", "Procurement", "Freight Forwarding"
    ],
    "Lean Manufacturing": [
        "Six Sigma", "5S", "Kaizen", "Process Improvement", "Kanban Manufacturing"
    ],
    "Inventory Control": [
        "Warehouse Management System (WMS)", "Stock Auditing", "JIT Inventory"
    ],

    # Hospitality
    "Guest Relations": [
        "Front Desk Operations", "Customer Concierge", "Hospitality Management", "Reservation Systems"
    ],
    "Culinary Arts": [
        "Food Safety", "HACCP", "Menu Planning", "Commercial Cooking"
    ],

    # Education
    "Instructional Design": [
        "Curriculum Development", "E-Learning", "Articulate Storyline", "LMS Administration", "Canvas"
    ],
    "Classroom Management": [
        "Student Assessment", "Differentiated Instruction", "Pedagogy"
    ]
}


def seed_skill_aliases():
    db = SessionLocal()
    try:
        skills_created = 0
        aliases_created = 0

        for skill_name, aliases in SEED_DATA.items():
            # Check or create canonical Skill
            skill = (
                db.query(Skill)
                .filter(Skill.name.ilike(skill_name.strip()))
                .first()
            )
            if not skill:
                skill = Skill(name=skill_name.strip(), category="General")
                db.add(skill)
                db.flush()
                skills_created += 1

            # Populate Aliases idempotently
            for alias_str in aliases:
                clean_alias = alias_str.strip()
                existing_alias = (
                    db.query(SkillAlias)
                    .filter(SkillAlias.alias.ilike(clean_alias))
                    .first()
                )
                if not existing_alias:
                    db_alias = SkillAlias(skill_id=skill.id, alias=clean_alias)
                    db.add(db_alias)
                    aliases_created += 1

        db.commit()
        print(f"Seeding completed successfully!")
        print(f"Canonical Skills created: {skills_created}")
        print(f"Skill Aliases created: {aliases_created}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding skill aliases: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_skill_aliases()
