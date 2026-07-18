from sqlalchemy.orm import Session
from app.models.position import Position
from app.models.skill import Skill


def get_position_skills(db: Session, position_id: int) -> list[Skill]:
    position = db.query(Position).filter(Position.id == position_id).first()
    return position.skills if position else []


def add_skill_to_position(db: Session, position_id: int, skill_id: int) -> bool:
    position = db.query(Position).filter(Position.id == position_id).first()
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if position and skill:
        if skill not in position.skills:
            position.skills.append(skill)
            db.commit()
            return True
    return False


def remove_skill_from_position(
    db: Session, position_id: int, skill_id: int
) -> bool:
    position = db.query(Position).filter(Position.id == position_id).first()
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if position and skill:
        if skill in position.skills:
            position.skills.remove(skill)
            db.commit()
            return True
    return False
