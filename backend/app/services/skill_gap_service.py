from typing import Optional
from sqlalchemy.orm import Session
from app.models.employee_skill import SkillLevel
from app.services.skill_alias_service import SkillAliasService


LEVEL_ORDER = {
    SkillLevel.BEGINNER: 0,
    SkillLevel.INTERMEDIATE: 1,
    SkillLevel.ADVANCED: 2,
    SkillLevel.EXPERT: 3,
}


class SkillGapService:

    @staticmethod
    def compare_skills(
        employee_skills: dict[str, SkillLevel],
        required_skills: dict[str, dict],
        db: Optional[Session] = None,
    ):
        matched = []
        missing = []
        needs_improvement = []

        alias_map = SkillAliasService.build_alias_map(db) if db is not None else None

        for skill_name, required_level in required_skills.items():

            importance = required_level["importance"]
            essential = required_level["essential"]

            employee_level = SkillAliasService.find_matching_employee_skill(
                db=db,
                required_skill_name=skill_name,
                employee_skills=employee_skills,
                alias_map=alias_map,
            )

            if employee_level is None:
                missing.append(
                    {
                        "skill": skill_name,
                        "required": required_level["required_level"],
                        "importance": importance,
                        "essential": essential,
                    }
                )

            elif LEVEL_ORDER[employee_level] < LEVEL_ORDER[required_level["required_level"]]:
                needs_improvement.append(
                    {
                        "skill": skill_name,
                        "current": employee_level,
                        "required": required_level["required_level"],
                        "importance": importance,
                        "essential": essential,
                    }
                )

            else:
                matched.append(
                    {
                        "skill": skill_name,
                        "level": employee_level,
                        "importance": importance,
                        "essential": essential,
                    }
                )

        missing.sort(
            key=lambda x: (
                not x["essential"],
                -x["importance"],
            )
        )

        needs_improvement.sort(
            key=lambda x: (
                not x["essential"],
                -x["importance"],
            )
        )

        return matched, missing, needs_improvement