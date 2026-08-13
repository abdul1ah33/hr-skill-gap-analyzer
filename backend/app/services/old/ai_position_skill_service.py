import logging
from sqlalchemy.orm import Session
from ai.position_skill_generator import PositionSkillGenerator
from app.core.exceptions import PositionSkillAlreadyExistsError
from app.crud.skill import get_skill_by_name, create_skill
from app.crud.position_skill import add_skill_to_position
from app.schemas.skill import SkillCreate
from app.schemas.position_skill import PositionSkillCreate
from app.models.employee_skill import SkillLevel

logger = logging.getLogger(__name__)


def score_to_skill_level(score: int) -> SkillLevel:
    if score >= 80:
        return SkillLevel.EXPERT
    elif score >= 60:
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
        try:
            generated = self.generator.generate(position_title)
        except Exception as e:
            logger.error(f"Error calling PositionSkillGenerator: {e}")
            generated = None

        if not generated or not isinstance(generated, dict):
            logger.warning(f"No skills generated for position '{position_title}' (id={position_id})")
            return []

        skills = generated.get("skills", [])

        for skill_data in skills:
            skill_name = skill_data.get("name")
            if not skill_name:
                continue

            # Check if the skill already exists in DB
            existing_skill = get_skill_by_name(db, skill_name)

            if existing_skill:
                skill_id = existing_skill.id
            else:
                # Create a new canonical skill
                new_skill = SkillCreate(
                    name=skill_name,
                    category=skill_data.get("category", "Technical")
                )
                created_skill = create_skill(db, new_skill)
                skill_id = created_skill.id

            # Determine level
            raw_level = skill_data.get("required_level", 50)
            if isinstance(raw_level, str):
                level_str = raw_level.capitalize()
                if level_str in SkillLevel.__members__.values():
                    level = SkillLevel(level_str)
                else:
                    level = SkillLevel.INTERMEDIATE
            else:
                level = score_to_skill_level(int(raw_level))

            # Associate skill with position
            try:
                position_skill = add_skill_to_position(
                    db,
                    position_id,
                    PositionSkillCreate(
                        skill_id=skill_id,
                        required_skill_level=level,
                        importance=skill_data.get("importance", 5),
                        is_essential=skill_data.get("is_essential", True),
                        short_description=skill_data.get("short_description"),
                    ),
                )
                created_position_skills.append(position_skill)
            except PositionSkillAlreadyExistsError:
                continue
            except Exception as e:
                logger.error(f"Error adding skill '{skill_name}' to position {position_id}: {e}")

        return created_position_skills