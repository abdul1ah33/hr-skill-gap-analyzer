from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.auth.dependencies import get_current_hr
from app.schemas.skill_alias import SkillAliasCreate, SkillAliasRead
from app.crud.skill import get_skill
from app.crud.skill_alias import (
    create_skill_alias,
    get_skill_alias,
    get_skill_aliases,
    delete_skill_alias,
    get_alias_by_name,
    get_aliases_for_skill,
)

router = APIRouter(dependencies=[Depends(get_current_hr)])


@router.post("/", response_model=SkillAliasRead, status_code=status.HTTP_201_CREATED)
def create_skill_alias_route(
    skill_alias: SkillAliasCreate,
    db: Session = Depends(get_db),
):
    skill = get_skill(db, skill_alias.skill_id)
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found",
        )

    existing = get_alias_by_name(db, skill_alias.alias)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill alias already exists",
        )

    return create_skill_alias(db, skill_alias)


@router.get("/", response_model=list[SkillAliasRead])
def list_skill_aliases_route(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return get_skill_aliases(db, skip=skip, limit=limit)


@router.get("/{alias_id}", response_model=SkillAliasRead)
def get_skill_alias_route(
    alias_id: int,
    db: Session = Depends(get_db),
):
    db_alias = get_skill_alias(db, alias_id)
    if not db_alias:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill alias not found",
        )
    return db_alias


@router.delete("/{alias_id}")
def delete_skill_alias_route(
    alias_id: int,
    db: Session = Depends(get_db),
):
    deleted = delete_skill_alias(db, alias_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill alias not found",
        )
    return {"message": "Skill alias deleted"}


@router.get("/skill/{skill_id}", response_model=list[SkillAliasRead])
def get_aliases_for_skill_route(
    skill_id: int,
    db: Session = Depends(get_db),
):
    skill = get_skill(db, skill_id)
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found",
        )
    return get_aliases_for_skill(db, skill_id)
