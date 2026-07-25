from sqlalchemy.orm import Session
from app.models.skill import Skill
from app.schemas.skill import SkillCreate, SkillUpdate


def create_skill(db: Session, skill: SkillCreate) -> Skill:
    db_skill = Skill(**skill.model_dump())
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill


def get_skills(db: Session) -> list[Skill]:
    return db.query(Skill).all()


def get_skill(db: Session, skill_id: int) -> Skill | None:
    return db.query(Skill).filter(Skill.id == skill_id).first()


def update_skill(db: Session, skill_id: int, skill: SkillUpdate) -> Skill | None:
    db_skill = get_skill(db, skill_id)
    if not db_skill:
        return None

    update_data = skill.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_skill, key, value)

    db.commit()
    db.refresh(db_skill)
    return db_skill


def delete_skill(db: Session, skill_id: int) -> Skill | None:
    db_skill = get_skill(db, skill_id)
    if not db_skill:
        return None

    db.delete(db_skill)
    db.commit()
    return db_skill


def get_skill_count(db: Session) -> int:
    return db.query(Skill).count()
