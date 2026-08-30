import logging
import os

from sqlalchemy.orm import Session

from app.ai.resume_parser import parse_resume
from app.services.pdf_extractor import PDFService

from app.models.employee import Employee
from app.models.position import Position
from app.models.skill import Skill
from app.models.employee_skill import EmployeeSkill, SkillLevel
from app.models.education import Education
from app.models.certification import Certification

logger = logging.getLogger(__name__)


class ResumeService:

    def __init__(self):
        self.pdf_service = PDFService()

    def extract_candidate(self, file_path: str) -> dict:
        """
        Extract candidate information from a resume.
        This method only performs AI extraction.
        """

        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY environment variable is not configured."
            )

        raw_text = self.pdf_service.extract_text(file_path)

        return parse_resume(
            raw_text=raw_text,
            api_key=api_key,
        )

    def create_employee_from_resume(
        self,
        db: Session,
        candidate: dict,
    ) -> Employee:

        # ---------------------------------------------------------
        # 1. Find or create position
        # ---------------------------------------------------------

        position_title = candidate.get("position")

        if not position_title:
            raise ValueError(
                "Could not determine the candidate's position from the resume."
            )

        position = (
            db.query(Position)
            .filter(Position.title.ilike(position_title))
            .first()
        )

        position_is_new = position is None

        if not position:
            position = Position(
                title=position_title,
                description=None,
                level=None,
                salary_grade=None,
                department_id=None,
            )

            db.add(position)
            db.flush()

        # ---------------------------------------------------------
        # 2. Create employee
        # ---------------------------------------------------------

        employee = Employee(
            employee_number="TEMP",
            first_name=candidate.get("first_name") or "Unknown",
            last_name=candidate.get("last_name") or "Unknown",
            email=candidate.get("email"),
            phone=candidate.get("phone"),
            years_experience=candidate.get("years_experience"),
            position_id=position.id,
        )

        db.add(employee)

        db.flush()

        # Generate employee number
        employee.employee_number = f"EMP{employee.id:04d}"

        # ---------------------------------------------------------
        # 3. Create / attach skills
        # ---------------------------------------------------------

        for skill_data in candidate.get("skills", []):

            skill_name = skill_data["name"]
            proficiency = skill_data["proficiency"]

            skill = (
                db.query(Skill)
                .filter(Skill.name.ilike(skill_name))
                .first()
            )

            if not skill:
                skill = Skill(
                    name=skill_name
                )

                db.add(skill)
                db.flush()

            employee_skill = EmployeeSkill(
                employee_id=employee.id,
                skill_id=skill.id,
                level=SkillLevel(proficiency),
            )

            db.add(employee_skill)

        # ---------------------------------------------------------
        # 4. Education
        # ---------------------------------------------------------

        for education_description in candidate.get("education", []):

            education = Education(
                employee_id=employee.id,
                description=education_description,
            )

            db.add(education)

        # ---------------------------------------------------------
        # 5. Certifications
        # ---------------------------------------------------------

        for certification_name in candidate.get("certifications", []):

            certification = Certification(
                employee_id=employee.id,
                name=certification_name,
            )

            db.add(certification)

        # ---------------------------------------------------------
        # 6. Commit everything
        # ---------------------------------------------------------

        db.commit()

        db.refresh(employee)

        # ---------------------------------------------------------
        # 7. Generate position skills for newly created positions
        # ---------------------------------------------------------

        if position_is_new:
            try:
                from app.services.position_skill_service import PositionSkillService
                PositionSkillService().generate_position_skills(
                    db=db,
                    position_id=position.id,
                )
            except Exception:
                logger.exception(
                    "Auto skill generation failed for new position '%s'",
                    position_title,
                )

        return employee