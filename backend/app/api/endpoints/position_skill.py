from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.auth.dependencies import get_current_hr
from app.services.position_skill_service import PositionSkillService
from app.models.position_skill import PositionSkill
from app.models.position import Position
from app.models.skill import Skill
from app.schemas.position_skill import (
    PositionSkillCreate,
    PositionSkillUpdate,
    PositionSkillResponse,
)


router = APIRouter(
    dependencies=[Depends(get_current_hr)],
)


# Create the service once.
position_skill_service = PositionSkillService()


# ─── GET: list all skills for a position ─────────────────────────────────────

@router.get(
    "/{position_id}/skills",
    response_model=list[PositionSkillResponse],
)
def get_position_skills(
    position_id: int,
    db: Session = Depends(get_db),
):
    """Return all PositionSkill records for a given position."""

    position = db.get(Position, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    return (
        db.query(PositionSkill)
        .filter(PositionSkill.position_id == position_id)
        .all()
    )


# ─── POST: generate skills (AI) ──────────────────────────────────────────────

@router.post("/{position_id}/generate-skills")
def generate_position_skills(
    position_id: int,
    db: Session = Depends(get_db),
):
    """
    Generate the required skills for a position.

    If the position already has generated PositionSkill
    records, the existing records are returned.

    Otherwise:
        Position
            ↓
        ESCO
            ↓
        Gemini
            ↓
        Database
    """

    try:
        position_skills = (
            position_skill_service.generate_position_skills(
                db=db,
                position_id=position_id,
            )
        )

        return {
            "position_id": position_id,
            "skills": [
                {
                    "id": position_skill.id,
                    "skill_id": position_skill.skill_id,
                    "skill_name": position_skill.skill.name,
                    "required_skill_level": (
                        position_skill.required_skill_level.value
                    ),
                    "priority": (
                        "Essential"
                        if position_skill.is_essential
                        else "Optional"
                    ),
                }
                for position_skill in position_skills
            ],
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate required position skills.",
        )


# ─── POST: manually add a skill to a position ────────────────────────────────

@router.post(
    "/{position_id}/skills",
    response_model=PositionSkillResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_position_skill(
    position_id: int,
    data: PositionSkillCreate,
    db: Session = Depends(get_db),
):
    """Manually add a skill requirement to a position."""

    position = db.get(Position, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    skill = db.get(Skill, data.skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    # Guard against duplicates
    existing = (
        db.query(PositionSkill)
        .filter(
            PositionSkill.position_id == position_id,
            PositionSkill.skill_id == data.skill_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This skill is already assigned to the position.",
        )

    position_skill = PositionSkill(
        position_id=position_id,
        skill_id=data.skill_id,
        required_skill_level=data.required_skill_level,
        is_essential=data.is_essential,
        short_description=data.short_description,
    )

    db.add(position_skill)
    db.commit()
    db.refresh(position_skill)

    return position_skill


# ─── PUT: update a position skill ────────────────────────────────────────────

@router.put(
    "/{position_id}/skills/{ps_id}",
    response_model=PositionSkillResponse,
)
def update_position_skill(
    position_id: int,
    ps_id: int,
    data: PositionSkillUpdate,
    db: Session = Depends(get_db),
):
    """Update the level, priority, or description of a position skill."""

    position_skill = (
        db.query(PositionSkill)
        .filter(
            PositionSkill.id == ps_id,
            PositionSkill.position_id == position_id,
        )
        .first()
    )

    if not position_skill:
        raise HTTPException(status_code=404, detail="Position skill not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(position_skill, key, value)

    db.commit()
    db.refresh(position_skill)

    return position_skill


# ─── DELETE: remove a single position skill ──────────────────────────────────

@router.delete(
    "/{position_id}/skills/{ps_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_position_skill(
    position_id: int,
    ps_id: int,
    db: Session = Depends(get_db),
):
    """Remove a single skill requirement from a position."""

    position_skill = (
        db.query(PositionSkill)
        .filter(
            PositionSkill.id == ps_id,
            PositionSkill.position_id == position_id,
        )
        .first()
    )

    if not position_skill:
        raise HTTPException(status_code=404, detail="Position skill not found")

    db.delete(position_skill)
    db.commit()
