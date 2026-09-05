from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.employee_skill import EmployeeSkill
from app.models.position_skill import PositionSkill


class SkillComparisonService:
    """
    Compares an employee's actual skills against the skills
    required by the employee's position.

    The comparison produces four categories:

        1. matched
        2. needs_improvement
        3. unmatched
        4. additional_skills

    No AI or external API is used here.
    The comparison is completely deterministic.
    """

    # ------------------------------------------
    # Skill proficiency ranking
    # ------------------------------------------

    LEVEL_RANK = {
        "Beginner": 1,
        "Intermediate": 2,
        "Advanced": 3,
        "Expert": 4,
    }

    # ------------------------------------------
    # Main method
    # ------------------------------------------

    def compare_employee_to_position(
        self,
        db: Session,
        employee_id: int,
    ) -> dict:
        """
        Compare an employee's skills against the skills
        required by the employee's assigned position.

        The position_id is obtained automatically from
        the Employee record.

        Args:
            db:
                SQLAlchemy database session.

            employee_id:
                ID of the employee being evaluated.

        Returns:
            Dictionary containing:

                matched
                needs_improvement
                unmatched
                additional_skills

        Raises:
            ValueError:
                If the employee does not exist.
        """

        # ==========================================
        # 1. Get employee
        # ==========================================

        employee = (
            db.query(Employee)
            .filter(
                Employee.id == employee_id
            )
            .first()
        )

        if employee is None:
            raise ValueError(
                f"Employee with id={employee_id} was not found."
            )

        # ==========================================
        # 2. Get employee's position
        # ==========================================

        position_id = employee.position_id

        # ==========================================
        # 3. Get employee skills
        # ==========================================

        employee_skills = (
            db.query(EmployeeSkill)
            .filter(
                EmployeeSkill.employee_id == employee_id
            )
            .all()
        )

        # ==========================================
        # 4. Get position required skills
        # ==========================================

        position_skills = (
            db.query(PositionSkill)
            .filter(
                PositionSkill.position_id == position_id
            )
            .all()
        )

        # ==========================================
        # 5. Build employee skill lookup
        # ==========================================
        #
        # Example:
        #
        # {
        #     "python": EmployeeSkill(...),
        #     "machine learning": EmployeeSkill(...),
        #     "react": EmployeeSkill(...)
        # }
        #
        # Lowercase keys make the comparison
        # case-insensitive.
        #

        employee_skill_map = {}

        for employee_skill in employee_skills:

            skill_name = (
                employee_skill.skill.name
                .strip()
                .lower()
            )

            employee_skill_map[skill_name] = employee_skill

        # ==========================================
        # 6. Prepare result
        # ==========================================

        result = {
            "matched": [],
            "needs_improvement": [],
            "unmatched": [],
            "additional_skills": [],
        }

        # Keep track of required skills so we can
        # later find employee skills that aren't
        # required by the position.

        required_skill_names = set()

        # ==========================================
        # 7. Compare required skills
        # ==========================================

        for position_skill in position_skills:

            skill_name = (
                position_skill.skill.name
                .strip()
            )

            skill_key = skill_name.lower()

            required_skill_names.add(skill_key)

            required_level = (
                position_skill
                .required_skill_level
                .value
            )

            priority = (
                "Essential"
                if position_skill.is_essential
                else "Optional"
            )

            # --------------------------------------
            # Does employee have this skill?
            # --------------------------------------

            employee_skill = employee_skill_map.get(
                skill_key
            )

            # --------------------------------------
            # Employee does NOT have the skill
            # --------------------------------------

            if employee_skill is None:

                result["unmatched"].append(
                    {
                        "skill": skill_name,
                        "employee_level": "None",
                        "required_level": required_level,
                        "priority": priority,
                    }
                )

                continue

            # --------------------------------------
            # Employee has the skill
            # --------------------------------------

            employee_level = (
                employee_skill.level.value
            )

            employee_rank = self.LEVEL_RANK[
                employee_level
            ]

            required_rank = self.LEVEL_RANK[
                required_level
            ]

            # --------------------------------------
            # Employee meets or exceeds requirement
            # --------------------------------------

            if employee_rank >= required_rank:

                result["matched"].append(
                    {
                        "skill": skill_name,
                        "employee_level": employee_level,
                        "required_level": required_level,
                        "priority": priority,
                    }
                )

            # --------------------------------------
            # Employee has skill but level is too low
            # --------------------------------------

            else:

                result["needs_improvement"].append(
                    {
                        "skill": skill_name,
                        "employee_level": employee_level,
                        "required_level": required_level,
                        "priority": priority,
                    }
                )

        # ==========================================
        # 8. Find additional employee skills
        # ==========================================
        #
        # These are skills the employee has but
        # the position doesn't require.
        #

        for employee_skill in employee_skills:

            skill_name = (
                employee_skill.skill.name
                .strip()
            )

            skill_key = skill_name.lower()

            if skill_key not in required_skill_names:

                result["additional_skills"].append(
                    {
                        "skill": skill_name,
                        "employee_level": (
                            employee_skill.level.value
                        ),
                    }
                )

        # ==========================================
        # 9. Return comparison
        # ==========================================

        return result