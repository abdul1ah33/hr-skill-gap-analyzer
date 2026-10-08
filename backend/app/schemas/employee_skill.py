from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.models.employee_skill import SkillLevel


class SkillSimple(BaseModel):
    id: int
    name: str
    category: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EmployeeSkillBase(BaseModel):
    skill_id: int
    level: Optional[SkillLevel] = None

class EmployeeSkillCreate(EmployeeSkillBase):
    pass


class EmployeeSkillUpdate(BaseModel):
    # Verification is set only by graded assessments, not by manual edits
    level: Optional[SkillLevel] = None


class EmployeeSkillResponse(BaseModel):
    id: int
    skill_id: int
    level: Optional[SkillLevel] = None
    verified: bool = False
    last_assessed_at: Optional[datetime] = None
    last_assessment_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    skill: SkillSimple

    model_config = ConfigDict(from_attributes=True)