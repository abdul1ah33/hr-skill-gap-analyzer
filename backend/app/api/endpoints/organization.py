from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_hr, get_current_user
from app.crud.organization import get_organization, save_organization
from app.dependencies import get_db
from app.schemas.organization import OrganizationResponse, OrganizationUpdate


router = APIRouter()


@router.get(
    "",
    response_model=OrganizationResponse,
    dependencies=[Depends(get_current_user)],
)
def get_organization_route(db: Session = Depends(get_db)):
    organization = get_organization(db)
    if organization is None:
        raise HTTPException(status_code=404, detail="Organization is not configured yet.")
    return organization


@router.put(
    "",
    response_model=OrganizationResponse,
    dependencies=[Depends(get_current_hr)],
)
def update_organization_route(
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
):
    return save_organization(db, data)
