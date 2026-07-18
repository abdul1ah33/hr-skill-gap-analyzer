from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


# ─── Nested / related schemas ───────────────────────────────────────────────

class DepartmentSimple(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class PositionSimple(BaseModel):
    id: int
    title: str

    model_config = ConfigDict(from_attributes=True)


class RoleSimple(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


# ─── Base schema (fields shared by Create and Response) ─────────────────────

class EmployeeBase(BaseModel):
    employee_number: str
    first_name: str
    last_name: str
    work_email: EmailStr
    personal_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[date] = None
    hire_date: Optional[date] = None
    employment_type: Optional[str] = None
    employment_status: Optional[str] = None
    salary: Optional[Decimal] = None
    department_id: int
    position_id: int
    profile_picture: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    national_id: Optional[str] = None
    notes: Optional[str] = None


# ─── Create schema ───────────────────────────────────────────────────────────

class EmployeeCreate(EmployeeBase):
    """All fields from EmployeeBase are required unless marked Optional."""
    pass


# ─── Update schema (partial update — every field optional) ───────────────────

class EmployeeUpdate(BaseModel):
    """
    Every field is Optional so the client can send only the fields they want
    to change.  The CRUD layer skips any field that is None.

    Example:
        PUT /employees/1
        {"first_name": "Abdullah"}
    This works without sending every other field.
    """
    employee_number: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    work_email: Optional[EmailStr] = None
    personal_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[date] = None
    hire_date: Optional[date] = None
    employment_type: Optional[str] = None
    employment_status: Optional[str] = None
    salary: Optional[Decimal] = None
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    profile_picture: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    national_id: Optional[str] = None
    notes: Optional[str] = None


# ─── Response schema ─────────────────────────────────────────────────────────

class EmployeeResponse(EmployeeBase):
    id: int
    created_at: datetime
    updated_at: datetime

    # Nested relationships
    department: Optional[DepartmentSimple] = None
    position: Optional[PositionSimple] = None
    role: Optional[RoleSimple] = None

    model_config = ConfigDict(from_attributes=True)
