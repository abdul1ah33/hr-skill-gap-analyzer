from sqlalchemy.orm import Session, selectinload

from app.crud.helpers import (
    get_position_or_raise,
    get_skill_or_raise,
)

from app.models.position_skill import PositionSkill

from app.schemas.position_skill import (
    PositionSkillCreate,
    PositionSkillUpdate,
)

from app.core.exceptions import (
    PositionSkillAlreadyExistsError,
    PositionSkillNotFoundError,
)


def add_skill_to_position(
    db: Session,
    position_id: int,
    position_skill: PositionSkillCreate,
) -> PositionSkill:
    """Assign a required skill to a position."""

    get_position_or_raise(db, position_id)
    get_skill_or_raise(db, position_skill.skill_id)

    existing = (
        db.query(PositionSkill)
        .filter(
            PositionSkill.position_id == position_id,
            PositionSkill.skill_id == position_skill.skill_id,
        )
        .first()
    )

    if existing:
        raise PositionSkillAlreadyExistsError()

    db_position_skill = PositionSkill(
        position_id=position_id,
        **position_skill.model_dump(),
    )

    db.add(db_position_skill)
    db.commit()
    db.refresh(db_position_skill)

    return (
        db.query(PositionSkill)
        .filter(PositionSkill.id == db_position_skill.id)
        .options(selectinload(PositionSkill.skill))
        .first()
    )


def get_position_skills(
    db: Session,
    position_id: int,
) -> list[PositionSkill]:
    """Retrieve all required skills for a position."""

    get_position_or_raise(db, position_id)

    return (
        db.query(PositionSkill)
        .filter(PositionSkill.position_id == position_id)
        .options(selectinload(PositionSkill.skill))
        .all()
    )


def update_position_skill(
    db: Session,
    position_id: int,
    skill_id: int,
    position_skill: PositionSkillUpdate,
) -> PositionSkill:
    """Update a required skill for a position."""

    get_position_or_raise(db, position_id)

    db_position_skill = (
        db.query(PositionSkill)
        .filter(
            PositionSkill.position_id == position_id,
            PositionSkill.skill_id == skill_id,
        )
        .first()
    )

    if not db_position_skill:
        raise PositionSkillNotFoundError()

    update_data = position_skill.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_position_skill, key, value)

    db.commit()
    db.refresh(db_position_skill)

    return (
        db.query(PositionSkill)
        .filter(PositionSkill.id == db_position_skill.id)
        .options(selectinload(PositionSkill.skill))
        .first()
    )


def remove_skill_from_position(
    db: Session,
    position_id: int,
    skill_id: int,
) -> PositionSkill:
    """Remove a required skill from a position."""

    get_position_or_raise(db, position_id)

    db_position_skill = (
        db.query(PositionSkill)
        .filter(
            PositionSkill.position_id == position_id,
            PositionSkill.skill_id == skill_id,
        )
        .first()
    )

    if not db_position_skill:
        raise PositionSkillNotFoundError()

    db.delete(db_position_skill)
    db.commit()

    return db_position_skill

# from sqlalchemy.orm import Session
# from app.models.position import Position
# from app.models.skill import Skill


# def get_position_skills(db: Session, position_id: int) -> list[Skill]:
#     position = db.query(Position).filter(Position.id == position_id).first()
#     return position.skills if position else []


# def add_skill_to_position(db: Session, position_id: int, skill_id: int) -> bool:
#     position = db.query(Position).filter(Position.id == position_id).first()
#     skill = db.query(Skill).filter(Skill.id == skill_id).first()
#     if position and skill:
#         if skill not in position.skills:
#             position.skills.append(skill)
#             db.commit()
#             return True
#     return False


# def remove_skill_from_position(
#     db: Session, position_id: int, skill_id: int
# ) -> bool:
#     position = db.query(Position).filter(Position.id == position_id).first()
#     skill = db.query(Skill).filter(Skill.id == skill_id).first()
#     if position and skill:
#         if skill in position.skills:
#             position.skills.remove(skill)
#             db.commit()
#             return True
#     return False
