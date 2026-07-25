from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.auth.dependencies import get_current_hr

from app.crud.position_skill import (
    add_skill_to_position,
    get_position_skills,
    update_position_skill,
    remove_skill_from_position,
)

from app.schemas.position_skill import (
    PositionSkillCreate,
    PositionSkillUpdate,
    PositionSkillResponse,
)

router = APIRouter(
    dependencies=[Depends(get_current_hr)],
)


@router.get(
    "",
    response_model=list[PositionSkillResponse],
)
def get_position_skills_endpoint(
    position_id: int,
    db: Session = Depends(get_db),
):
    return get_position_skills(
        db=db,
        position_id=position_id,
    )


@router.post(
    "",
    response_model=PositionSkillResponse,
)
def add_position_skill_endpoint(
    position_id: int,
    position_skill: PositionSkillCreate,
    db: Session = Depends(get_db),
):
    return add_skill_to_position(
        db=db,
        position_id=position_id,
        position_skill=position_skill,
    )


@router.put(
    "/{skill_id}",
    response_model=PositionSkillResponse,
)
def update_position_skill_endpoint(
    position_id: int,
    skill_id: int,
    position_skill: PositionSkillUpdate,
    db: Session = Depends(get_db),
):
    return update_position_skill(
        db=db,
        position_id=position_id,
        skill_id=skill_id,
        position_skill=position_skill,
    )


@router.delete(
    "/{skill_id}",
    status_code=204,
)
def remove_position_skill_endpoint(
    position_id: int,
    skill_id: int,
    db: Session = Depends(get_db),
):
    remove_skill_from_position(
        db=db,
        position_id=position_id,
        skill_id=skill_id,
    )