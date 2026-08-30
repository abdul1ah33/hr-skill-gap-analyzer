from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.employee_skill import SkillLevel


class SkillSimple(BaseModel):
    id: int
    name: str
    category: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PositionSkillBase(BaseModel):
    skill_id: int
    required_skill_level: SkillLevel
    is_essential: bool = True
    short_description: Optional[str] = None


class PositionSkillCreate(PositionSkillBase):
    pass


class PositionSkillUpdate(BaseModel):
    required_skill_level: Optional[SkillLevel] = None
    is_essential: Optional[bool] = None
    short_description: Optional[str] = None


class PositionSkillResponse(BaseModel):
    id: int
    position_id: int
    skill_id: int

    required_skill_level: SkillLevel
    is_essential: bool
    short_description: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    skill: SkillSimple

    model_config = ConfigDict(from_attributes=True)