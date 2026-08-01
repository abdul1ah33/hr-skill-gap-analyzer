from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SkillAliasBase(BaseModel):
    alias: str


class SkillAliasCreate(SkillAliasBase):
    skill_id: int


class SkillAliasRead(SkillAliasBase):
    id: int
    skill_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
