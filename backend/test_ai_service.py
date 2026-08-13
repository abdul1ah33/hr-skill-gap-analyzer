import app.core.paths

from app.db.database import SessionLocal
from app.models.position import Position
from backend.app.services.old.ai_position_skill_service import AIPositionSkillService

db = SessionLocal()

position = db.get(Position, 6)

service = AIPositionSkillService()

service.generate_for_position(
    db=db,
    position_id=position.id,
    position_title=position.title,
)

print("Done!")