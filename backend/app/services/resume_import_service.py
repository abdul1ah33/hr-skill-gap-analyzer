from app.services.pdf_text_service import PDFService

import app.core.paths
import logging

from ai.agents.resume_extractor import ResumeExtractor
from ai.agents.ollama_model import OllamaModel

from app.models.employee import Employee
from app.models.position import Position
from app.models.department import Department
from app.models.skill import Skill
from app.models.employee_skill import EmployeeSkill, SkillLevel

from sqlalchemy.orm import Session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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

        try:
            resume_text = self.pdf.extract_text(file_path)
            logger.info(f"=== RESUME TEXT START ===")
            logger.info(resume_text[:500])  # First 500 chars
            logger.info(f"=== RESUME TEXT END ===")

            resume_data = self.extractor.extract(resume_text)
            logger.info(f"=== AI EXTRACTED DATA ===")
            logger.info(f"Raw response: {resume_data}")
            logger.info(f"Type: {type(resume_data)}")
            if isinstance(resume_data, dict):
                logger.info(f"Keys: {resume_data.keys()}")
                logger.info(f"Position field: {resume_data.get('position')}")
                logger.info(f"First name: {resume_data.get('first_name')}")
                logger.info(f"Last name: {resume_data.get('last_name')}")
            logger.info(f"=== AI DATA END ===")

            # Check if extraction returned meaningful data
            if not resume_data or not isinstance(resume_data, dict):
                logger.warning("AI extraction returned invalid data, using fallback")
                resume_data = {}

        except Exception as e:
            logger.error(f"Error during resume extraction: {e}")
            logger.error(f"Exception type: {type(e)}")
            import traceback
            logger.error(traceback.format_exc())
            # Use empty dict as fallback if extraction fails
            resume_data = {}

        try:
            employee = self._create_employee(
                db,
                resume_data,
            )

            return employee

        except Exception as e:
            logger.error(f"Error creating employee from resume: {e}")
            db.rollback()
            raise


    def _create_employee(
        self,
        db: Session,
        resume_data: dict,
    ) -> Employee:

        # Create or get the department with fallback
        department_name = resume_data.get("department")
        if not department_name or department_name.strip() == "":
            # Use a default department if AI couldn't extract one
            department_name = "General"

        department = db.query(Department).filter_by(name=department_name).first()

        if not department:
            department = Department(name=department_name)
            db.add(department)
            db.flush()

        # Create or get the position - don't use fallback, let AI extract it
        # AI returns "position" field, not "position_title"
        position_title = resume_data.get("position") or resume_data.get("position_title")
        if not position_title or position_title.strip() == "":
            logger.warning(f"AI could not extract position title from resume. Resume data: {resume_data}")
            # Try to get the first available position in the department as fallback
            first_position = db.query(Position).filter_by(department_id=department.id).first()
            if first_position:
                position = first_position
                logger.info(f"Using existing position '{first_position.title}' as fallback")
            else:
                # Only create "General Role" if absolutely necessary
                position_title = "General Role"
                logger.warning(f"Creating fallback position '{position_title}' in department '{department.name}'")
                position = Position(
                    title=position_title,
                    department_id=department.id,
                )
                db.add(position)
                db.flush()
        else:
            position = db.query(Position).filter_by(title=position_title).first()

            if not position:
                position = Position(
                    title=position_title,
                    department_id=department.id,
                )
                db.add(position)
                db.flush()

        # Create employee with fallback values
        first_name = resume_data.get("first_name") or "Unknown"
        last_name = resume_data.get("last_name") or "Candidate"
        email = resume_data.get("email") or f"candidate_{department.id}@temp.com"

        logger.info(f"Creating employee: {first_name} {last_name}, email: {email}")
        logger.info(f"Using department: {department.name} (ID: {department.id})")
        logger.info(f"Using position: {position.title} (ID: {position.id})")

        # Generate employee number if not provided
        import random
        employee_number = resume_data.get("employee_number") or f"EMP-{random.randint(1000, 9999)}"

        employee = Employee(
            employee_number=employee_number,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=resume_data.get("phone"),
            department_id=department.id,
            position_id=position.id,
        )

        db.add(employee)
        db.flush()

        # Skill level mapping
        level_mapping = {
            "BEGINNER": SkillLevel.BEGINNER,
            "INTERMEDIATE": SkillLevel.INTERMEDIATE,
            "ADVANCED": SkillLevel.ADVANCED,
            "EXPERT": SkillLevel.EXPERT,
        }

        for skill_data in resume_data.get("skills", []):

            # Handle both string and dict formats for skills
            if isinstance(skill_data, str):
                skill_name = skill_data.strip()
                skill_level = SkillLevel.INTERMEDIATE  # Default level for string skills
            elif isinstance(skill_data, dict):
                skill_name = skill_data.get("name")
                if not skill_name:
                    continue
                skill_level = level_mapping.get(
                    skill_data.get("level", "Beginner").upper(),
                    SkillLevel.BEGINNER,
                )
            else:
                continue

            if not skill_name:
                continue

            skill = db.query(Skill).filter_by(name=skill_name).first()

            if not skill:
                skill = Skill(name=skill_name)
                db.add(skill)
                db.flush()

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
                years_experience=resume_data.get("years_experience", 0),
            )

            db.add(employee_skill)

        db.commit()
        db.refresh(employee)

        return employee