from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator

from app.utils.skill_names import normalize_skill_name


class SkillBase(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return normalize_skill_name(value)


class SkillCreate(SkillBase):
    pass


class SkillUpdate(BaseModel):
    name: Optional[str] = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: Optional[str]) -> Optional[str]:
        return normalize_skill_name(value) if value is not None else None


class SkillResponse(SkillBase):
    id: int
    # The skills table has no category/description columns; kept (always
    # null) so existing API consumers don't break
    category: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
