from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.employee_skill import SkillLevel


class SkillSimple(BaseModel):
    id: int
    name: str
    category: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EmployeeSkillBase(BaseModel):
    skill_id: int
    level: Optional[SkillLevel] = None
    years_experience: Optional[int] = Field(default=None, ge=0)
    verified: bool = False

class EmployeeSkillCreate(EmployeeSkillBase):
    pass


class EmployeeSkillUpdate(BaseModel):
    level: Optional[SkillLevel] = None
    years_experience: Optional[int] = Field(default=None, ge=0)
    verified: Optional[bool] = None


class EmployeeSkillResponse(BaseModel):
    id: int
    skill_id: int
    level: Optional[SkillLevel] = None
    years_experience: Optional[int] = None
    verified: bool = False
    last_assessed: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    skill: SkillSimple

    model_config = ConfigDict(from_attributes=True)