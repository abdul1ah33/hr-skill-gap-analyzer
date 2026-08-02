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
            req_lvl = required_level["required_level"]

            employee_level, matched_alias = SkillAliasService.find_matching_employee_skill_with_info(
                db=db,
                required_skill_name=skill_name,
                employee_skills=employee_skills,
                alias_map=alias_map,
            )

            if employee_level is None:
                missing.append(
                    {
                        "skill": skill_name,
                        "required": req_lvl,
                        "importance": importance,
                        "essential": essential,
                    }
                )
            else:
                emp_rank = LEVEL_ORDER.get(employee_level, 0)
                req_rank = LEVEL_ORDER.get(req_lvl, 0)

                # Tolerance: If difference is <= 1 level (e.g. Intermediate vs Advanced), count as MATCHED!
                if req_rank - emp_rank <= 1:
                    item = {
                        "skill": skill_name,
                        "level": employee_level,
                        "required": req_lvl,
                        "importance": importance,
                        "essential": essential,
                    }
                    if matched_alias and matched_alias.lower() != skill_name.lower():
                        item["aliasMatched"] = matched_alias
                    matched.append(item)
                else:
                    # 2+ level gap (e.g. Beginner vs Expert or Beginner vs Advanced)
                    item = {
                        "skill": skill_name,
                        "current": employee_level,
                        "required": req_lvl,
                        "importance": importance,
                        "essential": essential,
                    }
                    if matched_alias and matched_alias.lower() != skill_name.lower():
                        item["aliasMatched"] = matched_alias
                    needs_improvement.append(item)

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