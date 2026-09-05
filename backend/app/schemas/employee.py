from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr



class DepartmentSimple(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class PositionSimple(BaseModel):
    id: int
    title: str
    department: Optional[DepartmentSimple] = None

    model_config = ConfigDict(from_attributes=True)


class RoleSimple(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class SkillSimple(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class EmployeeSkillSimple(BaseModel):
    id: int
    skill: SkillSimple
    level: str

    model_config = ConfigDict(from_attributes=True)


class EducationSimple(BaseModel):
    id: int
    description: str

    model_config = ConfigDict(from_attributes=True)


class CertificationSimple(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    gender: Optional[str] = None
    years_experience: Optional[int] = None
    department_id: Optional[int] = None
    position_id: int
    notes: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    employee_number: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    years_experience: Optional[int] = None
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    notes: Optional[str] = None


class EmployeeResponse(EmployeeBase):
    id: int
    employee_number: str
    created_at: datetime
    updated_at: datetime

    department: Optional[DepartmentSimple] = None
    position: Optional[PositionSimple] = None
    role: Optional[RoleSimple] = None

    employee_skills: list[EmployeeSkillSimple] = []
    education: list[EducationSimple] = []
    certifications: list[CertificationSimple] = []

    model_config = ConfigDict(from_attributes=True)