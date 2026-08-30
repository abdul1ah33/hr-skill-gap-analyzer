import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.department import Department
from app.models.position_skill import PositionSkill
from app.models.skill import Skill
from app.schemas.position import (
    PositionCreate,
    PositionUpdate,
    PositionResponse,
)
from app.crud.position import (
    get_position,
    get_positions,
    update_position,
    delete_position,
    get_position_count,
    create_position,
)

from app.auth.dependencies import get_current_hr


logger = logging.getLogger(__name__)


router = APIRouter(
    dependencies=[Depends(get_current_hr)]
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _generate_skills_background(position_id: int, db: Session) -> None:
    """
    Called as a background task after a position is created or its title
    changes.  Generates PositionSkill records via ESCO + Gemini.
    Errors are logged but not re-raised so they don't affect the HTTP response.
    """
    try:
        from app.services.position_skill_service import PositionSkillService
        PositionSkillService().generate_position_skills(
            db=db,
            position_id=position_id,
        )
    except Exception:
        logger.exception(
            "Background skill generation failed for position_id=%s",
            position_id,
        )


def _delete_position_skills_and_orphan_skills(
    db: Session,
    position_id: int,
) -> None:
    """
    Delete all PositionSkill rows for *position_id*, then remove any Skill
    that is no longer referenced by *any* PositionSkill row.
    """
    # Collect skill IDs that are about to become unlinked
    rows = (
        db.query(PositionSkill)
        .filter(PositionSkill.position_id == position_id)
        .all()
    )
    skill_ids = [r.skill_id for r in rows]

    # Delete position-skill rows
    for row in rows:
        db.delete(row)
    db.flush()

    # Delete skills that are no longer referenced by any position skill
    for skill_id in skill_ids:
        still_used = (
            db.query(PositionSkill)
            .filter(PositionSkill.skill_id == skill_id)
            .first()
        )
        if not still_used:
            skill = db.get(Skill, skill_id)
            if skill:
                db.delete(skill)

    db.flush()


def _cleanup_orphan_skills_for_ids(db: Session, skill_ids: list[int]) -> None:
    """
    After a position (and its CASCADE-deleted skills) is removed,
    clean up any Skill records that are no longer referenced by any
    PositionSkill row.
    """
    for skill_id in skill_ids:
        still_used = (
            db.query(PositionSkill)
            .filter(PositionSkill.skill_id == skill_id)
            .first()
        )
        if not still_used:
            skill = db.get(Skill, skill_id)
            if skill:
                db.delete(skill)


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/", response_model=PositionResponse, status_code=201)
def create_position_route(
    position: PositionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    department = db.get(Department, position.department_id)
    if not department:
        raise HTTPException(
            status_code=404,
            detail="Department not found",
        )

    db_position = create_position(
        db=db,
        position_data=position,
    )

    # Auto-generate position skills in the background
    background_tasks.add_task(
        _generate_skills_background,
        position_id=db_position.id,
        db=db,
    )

    return db_position


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
    position_id: int,
    position: PositionUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
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

    # Detect title change
    old_title = db_position.title
    new_title = position.title if position.title is not None else old_title
    title_changed = new_title.strip().lower() != old_title.strip().lower()

    if title_changed:
        # Delete old position skills and clean up orphan skills
        _delete_position_skills_and_orphan_skills(db, position_id)
        db.commit()

    updated = update_position(db, position_id, position)

    if title_changed:
        # Regenerate skills for the new title in the background
        background_tasks.add_task(
            _generate_skills_background,
            position_id=position_id,
            db=db,
        )

    return updated


@router.delete("/{position_id}")
def delete_position_route(position_id: int, db: Session = Depends(get_db)):
    position = get_position(db, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    if position.employees:
        raise HTTPException(status_code=400, detail="Position has employees.")

    # Collect skill IDs before CASCADE wipes them
    skill_ids = [ps.skill_id for ps in position.position_skills]

    delete_position(db, position_id)

    # After CASCADE delete, clean up any orphan skills
    _cleanup_orphan_skills_for_ids(db, skill_ids)
    db.commit()

    return {"message": "Position deleted"}
