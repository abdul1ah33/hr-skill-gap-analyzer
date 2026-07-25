from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.schemas.skill import SkillCreate, SkillUpdate, SkillResponse
from app.crud.skill import (
    create_skill,
    get_skill,
    get_skills,
    update_skill,
    delete_skill,
    get_skill_count,
)

from app.auth.dependencies import get_current_hr


router = APIRouter(
    dependencies=[Depends(get_current_hr)]
)


@router.post("/", response_model=SkillResponse, status_code=201)
def create_skill_route(skill: SkillCreate, db: Session = Depends(get_db)):
    # Check uniqueness of name
    existing = db.query(SkillResponse.model_config.get("model") or None).filter_name_check_needed = False
    # Let's query by name
    from app.models.skill import Skill
    db_skill = db.query(Skill).filter(Skill.name == skill.name).first()
    if db_skill:
        raise HTTPException(status_code=400, detail="Skill name already exists.")
    return create_skill(db, skill)


@router.get("/count")
def skill_count_route(db: Session = Depends(get_db)):
    return {"count": get_skill_count(db)}


@router.get("/", response_model=list[SkillResponse])
def get_skills_route(db: Session = Depends(get_db)):
    return get_skills(db)


@router.get("/{skill_id}", response_model=SkillResponse)
def get_skill_route(skill_id: int, db: Session = Depends(get_db)):
    skill = get_skill(db, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


@router.put("/{skill_id}", response_model=SkillResponse)
def update_skill_route(
    skill_id: int, skill: SkillUpdate, db: Session = Depends(get_db)
):
    db_skill = get_skill(db, skill_id)
    if not db_skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return update_skill(db, skill_id, skill)


@router.delete("/{skill_id}")
def delete_skill_route(skill_id: int, db: Session = Depends(get_db)):
    skill = get_skill(db, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    if skill.employee_skills or skill.positions:
        raise HTTPException(
            status_code=400, detail="Skill is assigned to employees or positions."
        )
    delete_skill(db, skill_id)
    return {"message": "Skill deleted"}
