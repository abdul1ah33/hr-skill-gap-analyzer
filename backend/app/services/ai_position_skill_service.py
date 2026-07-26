from sqlalchemy.orm import Session

from ai.position_skill_generator import PositionSkillGenerator

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
        # Generate skills using the AI model
        generated = self.generator.generate(position_title)

        # Create or get skills in the database and associate them with the position
        for skill_data in generated["skills"]:
            # Check if the skill already exists
            existing_skill = get_skill_by_name(db, skill_data["name"])

            if existing_skill:
                skill_id = existing_skill.id
            else:
                # Create a new skill
                new_skill = SkillCreate(name=skill_data["name"], category=skill_data["category"])
                created_skill = create_skill(db, new_skill)
                skill_id = created_skill.id

            # Associate the skill with the position
            add_skill_to_position(
                db,
                position_id,
                PositionSkillCreate(
                    skill_id=skill_id,
                    required_skill_level=score_to_skill_level(
                        skill_data["required_level"]
                    ),
                    importance=skill_data["importance"],
                    is_essential=skill_data["is_essential"],
                    short_description=skill_data["short_description"],
                ),
            )