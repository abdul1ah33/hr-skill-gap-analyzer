from app.services.pdf_text_service import PDFService
from ai.agents.resume_extractor import ResumeExtractor
from ai.agents.ollama_model import OllamaModel

from app.models.employee import Employee
from app.models.position import Position
from app.models.department import Department
from app.models.skill import Skill
from app.models.employee_skill import EmployeeSkill, SkillLevel

from sqlalchemy.orm import Session


class ResumeImportService:

    def __init__(self):
        self.pdf = PDFService()
        self.llm = OllamaModel()
        self.extractor = ResumeExtractor(self.llm)

    def import_resume(
        self,
        db: Session,
        file_path: str,
    ):

        resume_text = self.pdf.extract_text(file_path)

        resume_data = self.extractor.extract(resume_text)

        employee = self._create_employee(
            db,
            resume_data,
        )

        return employee



    def _create_employee(
        self,
        db: Session,
        resume_data: dict,
    ) -> Employee:

        # Create or get the department
        department_name = resume_data.get("department")
        department = db.query(Department).filter_by(name=department_name).first()

        if not department:
            department = Department(name=department_name)
            db.add(department)
            db.commit()
            db.refresh(department)

        # Create or get the position
        position_title = resume_data.get("position_title")
        position = db.query(Position).filter_by(title=position_title).first()

        if not position:
            position = Position(
                title=position_title,
                department_id=department.id,
            )
            db.add(position)
            db.commit()
            db.refresh(position)

        # Create the employee
        employee = Employee(
            first_name=resume_data.get("first_name"),
            last_name=resume_data.get("last_name"),
            email=resume_data.get("email"),
            phone=resume_data.get("phone"),

            department_id=department.id,
            position_id=position.id,
        )

        db.add(employee)
        db.commit()
        db.refresh(employee)

        # Skill level mapping
        level_mapping = {
            "BEGINNER": SkillLevel.BEGINNER,
            "INTERMEDIATE": SkillLevel.INTERMEDIATE,
            "ADVANCED": SkillLevel.ADVANCED,
            "EXPERT": SkillLevel.EXPERT,
        }

        # Add skills
        for skill_data in resume_data.get("skills", []):

            skill_name = skill_data.get("name")
            skill_level = level_mapping.get(
                skill_data.get("level", "Beginner").upper(),
                SkillLevel.BEGINNER,
            )

            # Create or get the skill
            skill = db.query(Skill).filter_by(name=skill_name).first()

            if not skill:
                skill = Skill(name=skill_name)
                db.add(skill)
                db.commit()
                db.refresh(skill)

            # Prevent duplicate employee skills
            existing = (
                db.query(EmployeeSkill)
                .filter_by(
                    employee_id=employee.id,
                    skill_id=skill.id,
                )
                .first()
            )

            if existing:
                continue

            employee_skill = EmployeeSkill(
                employee_id=employee.id,
                skill_id=skill.id,
                level=skill_level,
                years_experience=resume_data.get("years_experience"),
            )

            db.add(employee_skill)

        db.commit()

        return employee