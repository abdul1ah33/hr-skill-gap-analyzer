import app.core.paths

from typing import Optional
from sqlalchemy.orm import Session, selectinload

from app.models.employee import Employee
from app.models.employee_skill import EmployeeSkill
from app.models.position import Position
from app.models.position_skill import PositionSkill

from backend.app.services.old.skill_gap_service import SkillGapService

from ai.agents.ollama_model import OllamaModel
from ai.agents.assessment import Assess


class AssessmentService:

    def __init__(self, db: Session):
        self.db = db
        self.model = OllamaModel()
        self.assessor = Assess(self.model)

    def get_employee(self, employee_id: int) -> Employee:
        """Fetch employee with all required relationships eager-loaded."""
        employee = (
            self.db.query(Employee)
            .options(
                selectinload(Employee.department),
                selectinload(Employee.position).selectinload(Position.position_skills).selectinload(PositionSkill.skill),
                selectinload(Employee.employee_skills).selectinload(EmployeeSkill.skill),
            )
            .filter(Employee.id == employee_id)
            .first()
        )

        if employee is None:
            raise ValueError("Employee not found")

        return employee

    def get_position(self, position_id: int) -> Position:
        """Fetch a position with position_skills eager-loaded."""
        position = (
            self.db.query(Position)
            .options(
                selectinload(Position.position_skills).selectinload(PositionSkill.skill)
            )
            .filter(Position.id == position_id)
            .first()
        )
        if position is None:
            raise ValueError(f"Position {position_id} not found")
        return position

    def build_employee_data(self, employee: Employee) -> dict:
        employee_data = {
            "Name": f"{employee.first_name} {employee.last_name}",
            "Position": employee.position.title if employee.position else "Unknown",
            "Skills": {},
        }

        for employee_skill in employee.employee_skills:
            if employee_skill.skill and employee_skill.level:
                employee_data["Skills"][employee_skill.skill.name] = employee_skill.level

        return employee_data

    def build_required_data(self, position: Position) -> dict:
        required_data = {
            "Skills": {}
        }

        for position_skill in position.position_skills:
            if position_skill.skill:
                required_data["Skills"][position_skill.skill.name] = {
                    "required_level": position_skill.required_skill_level,
                    "importance": position_skill.importance,
                    "essential": position_skill.is_essential,
                }

        return required_data

    def compare_employee_skills(self, employee: Employee, target_position_id: Optional[int] = None):
        """
        Compare employee skills against a position's requirements.
        If target_position_id is provided, use that position instead of the employee's own.
        """
        employee_data = self.build_employee_data(employee)

        # Determine which position to compare against
        if target_position_id and target_position_id != employee.position_id:
            target_position = self.get_position(target_position_id)
        else:
            target_position = employee.position

        required_data = self.build_required_data(target_position)

        # Add position name to employee_data for context
        employee_data["Target Position"] = target_position.title

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

    def generate_assessment(self, employee_id: int, target_position_id: Optional[int] = None):
        employee = self.get_employee(employee_id)

        (
            employee_data,
            matched,
            missing,
            needs_improvement,
        ) = self.compare_employee_skills(employee, target_position_id=target_position_id)

        report = self.assessor.assess(
            matched,
            missing,
            needs_improvement,
            employee_data,
        )

        return report