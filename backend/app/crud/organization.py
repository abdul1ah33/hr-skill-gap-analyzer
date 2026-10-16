from sqlalchemy.orm import Session

from app.models.organization_settings import OrganizationSettings
from app.schemas.organization import OrganizationUpdate


def get_organization(db: Session) -> OrganizationSettings | None:
    return db.get(OrganizationSettings, 1)


def save_organization(db: Session, data: OrganizationUpdate) -> OrganizationSettings:
    """Create the single settings row, or update it."""
    organization = get_organization(db)
    if organization is None:
        organization = OrganizationSettings(id=1, name=data.name)
        db.add(organization)

    organization.name = data.name
    organization.industry = data.industry

    db.commit()
    db.refresh(organization)
    return organization
