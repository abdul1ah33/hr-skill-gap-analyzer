from sqlalchemy.orm import Session

from app.crud.position import create_position
from app.schemas.position import PositionCreate
from app.services.ai_position_skill_service import AIPositionSkillService


class PositionService:

    def __init__(self):
        self.ai = AIPositionSkillService()

    def create_position(
        self,
        db: Session,
        position_data: PositionCreate,
    ):
        # Create the position
        position = create_position(db, position_data)

        # Generate AI skills
        try:
            self.ai.generate_for_position(
                db=db,
                position_id=position.id,
                position_title=position.title,
            )
        except Exception as e:
            # TODO: replace with proper logging
            print(f"AI skill generation failed: {e}")

        return position