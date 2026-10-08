from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

from app.utils.skill_names import normalize_skill_name


class SkillAliasBase(BaseModel):
    alias: str

    @field_validator("alias")
    @classmethod
    def normalize_alias(cls, value: str) -> str:
        return normalize_skill_name(value)


class SkillAliasCreate(SkillAliasBase):
    skill_id: int


class SkillAliasRead(SkillAliasBase):
    id: int
    skill_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
