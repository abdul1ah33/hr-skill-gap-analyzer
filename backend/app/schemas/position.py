from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DepartmentSimple(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class PositionBase(BaseModel):
    title: str
    department_id: Optional[int] = None
    description: Optional[str] = None
    level: Optional[str] = None
    salary_grade: Optional[str] = None


class PositionCreate(PositionBase):
    pass


class PositionUpdate(BaseModel):
    title: Optional[str] = None
    department_id: Optional[int] = None
    description: Optional[str] = None
    level: Optional[str] = None
    salary_grade: Optional[str] = None


class PositionResponse(PositionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    department: Optional[DepartmentSimple] = None

    model_config = ConfigDict(from_attributes=True)
