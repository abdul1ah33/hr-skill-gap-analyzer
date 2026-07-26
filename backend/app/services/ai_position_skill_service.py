from sqlalchemy.orm import Session

from ai.position_skill_generator import PositionSkillGenerator

from app.core.exceptions import PositionSkillAlreadyExistsError

from app.crud.skill import (
    get_skill_by_name,
    create_skill,
)

from app.crud.position_skill import (
    add_skill_to_position,
)

from app.schemas.skill import SkillCreate
from app.schemas.position_skill import PositionSkillCreate

from app.models.employee_skill import SkillLevel


def score_to_skill_level(score: int) -> SkillLevel:
    if score >= 90:
        return SkillLevel.EXPERT
    elif score >= 70:
        return SkillLevel.ADVANCED
    elif score >= 40:
        return SkillLevel.INTERMEDIATE
    return SkillLevel.BEGINNER


class AIPositionSkillService:

    def __init__(self):
        self.generator = PositionSkillGenerator()

    def generate_for_position(
        self,
        db: Session,
        position_id: int,
        position_title: str,
    ):
        created_position_skills = []
        # Generate skills using the AI model
        generated = self.generator.generate(position_title)

        # Create or get skills in the database and associate them with the position
        skills = generated.get("skills", [])

        for skill_data in skills:
            # Check if the skill already exists
            existing_skill = get_skill_by_name(db, skill_data["name"])

            if existing_skill:
                skill_id = existing_skill.id
            else:
                # Create a new skill
                new_skill = SkillCreate(name=skill_data["name"], category=skill_data.get("category"))
                created_skill = create_skill(db, new_skill)
                skill_id = created_skill.id

            # Associate the skill with the position
            try:
                position_skill = add_skill_to_position(
                    db,
                    position_id,
                    PositionSkillCreate(
                        skill_id=skill_id,
                        required_skill_level=score_to_skill_level(
                            skill_data.get("required_level", 50)
                        ),
                        importance=skill_data.get("importance", 5),
                        is_essential=skill_data.get("is_essential", True),
                        short_description=skill_data.get("short_description"),
                    ),
                )
                created_position_skills.append(position_skill)

            except PositionSkillAlreadyExistsError:
                continue

        return created_position_skills