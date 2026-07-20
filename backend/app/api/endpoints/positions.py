from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.department import Department
from app.schemas.position import (
    PositionCreate,
    PositionUpdate,
    PositionResponse,
)
from app.crud.position import (
    create_position,
    get_position,
    get_positions,
    update_position,
    delete_position,
    get_position_count,
)
from app.schemas.position_skill import PositionSkillAdd
from app.schemas.skill import SkillResponse
from app.crud.position_skill import (
    get_position_skills,
    add_skill_to_position,
    remove_skill_from_position,
)
from app.crud.skill import get_skill

from backend.app.auth.dependencies import get_current_hr


router = APIRouter(
    dependencies=[Depends(get_current_hr)]
)


@router.post("/", response_model=PositionResponse, status_code=201)
def create_position_route(
    position: PositionCreate, db: Session = Depends(get_db)
):
    department = db.get(Department, position.department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return create_position(db, position)


@router.get("/count")
def position_count_route(db: Session = Depends(get_db)):
    return {"count": get_position_count(db)}


@router.get("/", response_model=list[PositionResponse])
def get_positions_route(db: Session = Depends(get_db)):
    return get_positions(db)


@router.get("/{position_id}", response_model=PositionResponse)
def get_position_route(position_id: int, db: Session = Depends(get_db)):
    position = get_position(db, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    return position


@router.put("/{position_id}", response_model=PositionResponse)
def update_position_route(
    position_id: int, position: PositionUpdate, db: Session = Depends(get_db)
):
    # Check that position exists first
    db_position = get_position(db, position_id)
    if not db_position:
        raise HTTPException(status_code=404, detail="Position not found")

    # If updating department_id, check it exists
    if position.department_id is not None:
        department = db.get(Department, position.department_id)
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")

    return update_position(db, position_id, position)


@router.delete("/{position_id}")
def delete_position_route(position_id: int, db: Session = Depends(get_db)):
    position = get_position(db, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    if position.employees:
        raise HTTPException(status_code=400, detail="Position has employees.")

    delete_position(db, position_id)
    return {"message": "Position deleted"}


# ─── NESTED POSITION SKILLS ENDPOINTS ──────────────────────────────────────────

@router.get("/{position_id}/skills", response_model=list[SkillResponse])
def get_position_skills_route(position_id: int, db: Session = Depends(get_db)):
    position = get_position(db, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    return get_position_skills(db, position_id)


@router.post("/{position_id}/skills")
def add_position_skill_route(
    position_id: int,
    pos_skill: PositionSkillAdd,
    db: Session = Depends(get_db),
):
    position = get_position(db, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    skill = get_skill(db, pos_skill.skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    added = add_skill_to_position(db, position_id, pos_skill.skill_id)
    if not added:
        raise HTTPException(status_code=400, detail="Skill already linked to this position.")

    return {"message": "Skill added to position"}


@router.delete("/{position_id}/skills/{skill_id}")
def remove_position_skill_route(
    position_id: int,
    skill_id: int,
    db: Session = Depends(get_db),
):
    position = get_position(db, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    removed = remove_skill_from_position(db, position_id, skill_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Skill link not found")

    return {"message": "Skill removed from position"}
