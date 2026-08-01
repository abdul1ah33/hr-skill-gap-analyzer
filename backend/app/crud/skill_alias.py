from sqlalchemy.orm import Session
from app.models.skill_alias import SkillAlias
from app.schemas.skill_alias import SkillAliasCreate


def create_skill_alias(db: Session, skill_alias: SkillAliasCreate) -> SkillAlias:
    db_alias = SkillAlias(**skill_alias.model_dump())
    db.add(db_alias)
    db.commit()
    db.refresh(db_alias)
    return db_alias


def get_skill_alias(db: Session, alias_id: int) -> SkillAlias | None:
    return db.query(SkillAlias).filter(SkillAlias.id == alias_id).first()


def get_skill_aliases(
    db: Session,
    skip: int = 0,
    limit: int = 100,
) -> list[SkillAlias]:
    return db.query(SkillAlias).offset(skip).limit(limit).all()


def delete_skill_alias(db: Session, alias_id: int) -> SkillAlias | None:
    db_alias = get_skill_alias(db, alias_id)
    if not db_alias:
        return None

    db.delete(db_alias)
    db.commit()
    return db_alias


def get_alias_by_name(db: Session, alias_name: str) -> SkillAlias | None:
    return (
        db.query(SkillAlias)
        .filter(SkillAlias.alias.ilike(alias_name.strip()))
        .first()
    )


def get_aliases_for_skill(db: Session, skill_id: int) -> list[SkillAlias]:
    return (
        db.query(SkillAlias)
        .filter(SkillAlias.skill_id == skill_id)
        .all()
    )
