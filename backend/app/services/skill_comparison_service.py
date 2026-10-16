from __future__ import annotations

from sqlalchemy.orm import Session, aliased

from app.models.employee import Employee
from app.models.employee_skill import EmployeeSkill
from app.models.position_skill import PositionSkill
from app.models.skill import Skill
from app.models.skill_alias import SkillAlias


class SkillComparisonService:
    """
    Compares an employee's actual skills against the skills
    required by the employee's position.

    Every entry includes the skill_id, so callers (e.g. the assessment
    target selection) don't have to look skills up by name again. Entries
    for skills the employee has also say whether the level was verified
    by a skill assessment.

    The comparison produces four categories:

        1. matched
        2. needs_improvement
        3. unmatched
        4. additional_skills

    An employee skill also covers a required skill
    when one of the two names is an alias of the
    other (skill_aliases); such entries carry
    "matched_via" with the employee's skill name.

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
        # Skill names are unique and normalized, so
        # the skill_id identifies a skill exactly.
        #

        employee_skill_map = {
            employee_skill.skill_id: employee_skill
            for employee_skill in employee_skills
        }

        alias_links = self._alias_links(
            db,
            set(employee_skill_map)
            | {
                position_skill.skill_id
                for position_skill in position_skills
            },
        )

        # ==========================================
        # 6. Prepare result
        # ==========================================

        result = {
            "matched": [],
            "needs_improvement": [],
            "unmatched": [],
            "additional_skills": [],
        }

        # Employee skills that cover a required skill,
        # exactly or through an alias. The rest are
        # additional skills.

        covered_skill_ids = set()

        # ==========================================
        # 7. Compare required skills
        # ==========================================

        for position_skill in position_skills:

            skill_name = position_skill.skill.name

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
            #
            # First under the same skill, otherwise
            # under a direct alias of it (e.g. the
            # employee has "rtg operation", an alias
            # of "rtg crane operation"). With several
            # aliases, the highest level counts.
            #

            alias_skills = [
                employee_skill_map[skill_id]
                for skill_id in alias_links.get(position_skill.skill_id, ())
                if skill_id in employee_skill_map
            ]

            covered_skill_ids.add(position_skill.skill_id)
            covered_skill_ids.update(
                employee_skill.skill_id
                for employee_skill in alias_skills
            )

            employee_skill = employee_skill_map.get(
                position_skill.skill_id
            )

            matched_via = None

            if employee_skill is None and alias_skills:

                employee_skill = max(
                    alias_skills,
                    key=lambda row: (
                        self.LEVEL_RANK[row.level.value],
                        row.skill.name,
                    ),
                )

                matched_via = employee_skill.skill.name

            # --------------------------------------
            # Employee does NOT have the skill
            # --------------------------------------

            if employee_skill is None:

                result["unmatched"].append(
                    {
                        "skill_id": position_skill.skill_id,
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

            entry = {
                "skill_id": position_skill.skill_id,
                "skill": skill_name,
                "employee_level": employee_level,
                "required_level": required_level,
                "priority": priority,
                "verified": employee_skill.verified,
            }

            # The employee's own skill name, when it
            # was found through an alias
            if matched_via:
                entry["matched_via"] = matched_via

            # --------------------------------------
            # Employee meets or exceeds requirement
            # --------------------------------------

            if employee_rank >= required_rank:

                result["matched"].append(entry)

            # --------------------------------------
            # Employee has skill but level is too low
            # --------------------------------------

            else:

                result["needs_improvement"].append(entry)

        # ==========================================
        # 8. Find additional employee skills
        # ==========================================
        #
        # These are skills the employee has but
        # the position doesn't require, not even
        # under an alias.
        #

        for employee_skill in employee_skills:

            if employee_skill.skill_id not in covered_skill_ids:

                result["additional_skills"].append(
                    {
                        "skill_id": employee_skill.skill_id,
                        "skill": employee_skill.skill.name,
                        "employee_level": (
                            employee_skill.level.value
                        ),
                        "verified": employee_skill.verified,
                    }
                )

        # ==========================================
        # 9. Return comparison
        # ==========================================

        return result

    # ------------------------------------------
    # Alias lookup
    # ------------------------------------------

    @staticmethod
    def _alias_links(
        db: Session,
        skill_ids: set[int],
    ) -> dict[int, set[int]]:
        """
        Pairs of the given skills where one skill's
        name is an alias of the other, in both
        directions: {skill_id: {linked skill_ids}}.

        Only direct aliases count. Two skills that
        are both aliases of a third one are NOT
        linked: the seeded aliases are often broader
        categories ("python" and "java" are both
        aliases of "computer programming"), and
        those two are not the same skill.
        """

        if not skill_ids:
            return {}

        aliased_skill = aliased(Skill)

        rows = (
            db.query(SkillAlias.skill_id, aliased_skill.id)
            .join(
                aliased_skill,
                aliased_skill.name == SkillAlias.alias,
            )
            .filter(
                SkillAlias.skill_id.in_(skill_ids),
                aliased_skill.id.in_(skill_ids),
            )
            .all()
        )

        links: dict[int, set[int]] = {}

        for owner_id, alias_skill_id in rows:
            links.setdefault(owner_id, set()).add(alias_skill_id)
            links.setdefault(alias_skill_id, set()).add(owner_id)

        return links
