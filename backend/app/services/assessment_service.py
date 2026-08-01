import app.core.paths

from sqlalchemy.orm import Session

from app.models.employee import Employee

from app.services.skill_gap_service import SkillGapService

from ai.agents.ollama_model import OllamaModel
from ai.agents.assessment import Assess


class AssessmentService:

    def __init__(self, db: Session):
        self.db = db

        self.model = OllamaModel()

        self.assessor = Assess(self.model)


    def get_employee(self, employee_id: int) -> Employee:

        employee = (
            self.db.query(Employee)
            .filter(Employee.id == employee_id)
            .first()
        )

        if employee is None:
            raise ValueError("Employee not found")

        return employee

    
    def build_employee_data(self, employee: Employee) -> dict:

        employee_data = {
            "Name": f"{employee.first_name} {employee.last_name}",
            "Position": employee.position.title,
            "Skills": {},
        }

        for employee_skill in employee.employee_skills:

            employee_data["Skills"][
                employee_skill.skill.name
            ] = employee_skill.level

        return employee_data


    def build_required_data(self, employee: Employee) -> dict:

        required_data = {
            "Skills": {}
        }

        for position_skill in employee.position.position_skills:

            required_data["Skills"][position_skill.skill.name] = {
                "required_level": position_skill.required_skill_level,
                "importance": position_skill.importance,
                "essential": position_skill.is_essential,
            }

        return required_data


    def compare_employee_skills(self, employee: Employee):

        employee_data = self.build_employee_data(employee)

        required_data = self.build_required_data(employee)

        matched, missing, needs_improvement = (
            SkillGapService.compare_skills(
                employee_data["Skills"],
                required_data["Skills"],
                db=self.db,
            )
        )

        return (
            employee_data,
            matched,
            missing,
            needs_improvement,
        )


    def generate_assessment(self, employee_id: int):

        employee = self.get_employee(employee_id)

        (
            employee_data,
            matched,
            missing,
            needs_improvement,
        ) = self.compare_employee_skills(employee)

        report = self.assessor.assess(
            matched,
            missing,
            needs_improvement,
            employee_data,
        )

        return report