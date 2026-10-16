from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class OrganizationUpdate(BaseModel):
    name: str
    industry: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name must not be empty.")
        return value

    @field_validator("industry")
    @classmethod
    def normalize_industry(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip().lower()
        return value or None


class OrganizationResponse(BaseModel):
    name: str
    industry: Optional[str] = None
    # Set by the template applier, read-only here
    template_key: Optional[str] = None
    template_version: Optional[int] = None
    template_applied_at: Optional[datetime] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
