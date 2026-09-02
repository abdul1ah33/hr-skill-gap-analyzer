from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.services.skill_comparison_service import SkillComparisonService

from app.ai.gap_analysis_ai import generate_gap_report


class SkillGapService:
    """
    Combines:

        Phase C:
        EmployeeSkill vs PositionSkill comparison

        Phase D:
        AI-generated gap analysis

    The service itself does not perform any AI logic.
    It simply connects the two phases.
    """

    def __init__(self):
        self.comparison_service = SkillComparisonService()

    def generate_employee_gap_analysis(
        self,
        db: Session,
        employee_id: int,
        api_key: str,
    ) -> dict:
        """
        Generate the complete skill gap analysis for an employee.

        Flow:

            1. Find employee
            2. Get employee's position
            3. Run Phase C skill comparison
            4. Send Phase C result to Phase D AI
            5. Return both results

        Args:
            db: SQLAlchemy database session.
            employee_id: ID of the employee.
            api_key: Gemini API key.

        Returns:
            Dictionary containing:
                employee_id
                job_title
                skill_diff
                gap_analysis

        Raises:
            ValueError: If employee does not exist.
        """

        # ---------------------------------------------------------
        # 1. Get employee
        # ---------------------------------------------------------

        employee = (
            db.query(Employee)
            .filter(Employee.id == employee_id)
            .first()
        )

        if employee is None:
            raise ValueError(
                f"Employee with id={employee_id} was not found."
            )

        # ---------------------------------------------------------
        # 2. Get the employee's position
        # ---------------------------------------------------------

        if employee.position is None:
            raise ValueError(
                f"Employee with id={employee_id} does not have a position."
            )

        job_title = employee.position.title

        # ---------------------------------------------------------
        # 3. PHASE C
        # ---------------------------------------------------------
        # Compare the employee's actual skills against
        # the required skills of their position.

        skill_diff = (
            self.comparison_service.compare_employee_to_position(
                db=db,
                employee_id=employee_id,
            )
        )

        # ---------------------------------------------------------
        # 4. PHASE D
        # ---------------------------------------------------------
        # Send the exact Phase C result to the AI.
        #
        # We do NOT modify the AI file.
        # We simply call its existing function.

        gap_analysis = generate_gap_report(
            job_title=job_title,
            skill_diff=skill_diff,
            api_key=api_key,
        )

        # ---------------------------------------------------------
        # 5. Return the complete result
        # ---------------------------------------------------------

        return {
            "employee_id": employee_id,
            "job_title": job_title,
            "skill_diff": skill_diff,
            "gap_analysis": gap_analysis,
        }