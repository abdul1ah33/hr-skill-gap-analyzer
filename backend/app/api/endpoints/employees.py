from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
)
from app.crud.employee import (
    create_employee,
    get_employee,
    get_employees,
    update_employee,
    delete_employee,
    get_employee_count,
)
# from app.schemas.employee_skill import (
#     EmployeeSkillCreate,
#     EmployeeSkillUpdate,
#     EmployeeSkillResponse,
# )
# from app.crud.employee_skill import (
#     get_employee_skills,
#     add_skill_to_employee,
#     update_employee_skill,
#     remove_skill_from_employee,
#     get_employee_skills,
# )
# from app.crud.skill import get_skill

from app.auth.dependencies import get_current_hr


router = APIRouter(
    dependencies=[Depends(get_current_hr)]
)


# ─── POST /employees ─────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=EmployeeResponse,
    status_code=201,
    summary="Create a new employee",
)
def create_employee_route(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
):
    return create_employee(db, employee)


# ─── GET /employees/count ────────────────────────────────────────────────────
# IMPORTANT: This must be registered BEFORE /{employee_id} so that FastAPI
# does not try to parse the string "count" as an integer.

@router.get(
    "/count",
    summary="Get total number of employees",
)
def employee_count_route(
    db: Session = Depends(get_db),
):
    return {"count": get_employee_count(db) if get_employee_count(db) is not None else 0}


# ─── GET /employees ───────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[EmployeeResponse],
    summary="List all employees",
)
def get_employees_route(
    db: Session = Depends(get_db),
):
    return get_employees(db)


# ─── GET /employees/{employee_id} ─────────────────────────────────────────────

@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Get a single employee by ID",
)
def get_employee_route(
    employee_id: int,
    db: Session = Depends(get_db),
):
    employee = get_employee(db, employee_id)

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return employee


# ─── PUT /employees/{employee_id} ─────────────────────────────────────────────

@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Partially update an employee (only provided fields are changed)",
)
def update_employee_route(
    employee_id: int,
    employee: EmployeeUpdate,
    db: Session = Depends(get_db),
):
    updated = update_employee(db, employee_id, employee)

    if not updated:
        raise HTTPException(status_code=404, detail="Employee not found")

    return updated


# ─── DELETE /employees/{employee_id} ──────────────────────────────────────────

@router.delete(
    "/{employee_id}",
    summary="Delete an employee by ID",
)
def delete_employee_route(
    employee_id: int,
    db: Session = Depends(get_db),
):
    employee = delete_employee(db, employee_id)

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return {"message": "Employee deleted"}


# ─── NESTED EMPLOYEE SKILLS ENDPOINTS ──────────────────────────────────────────

# @router.get("/{employee_id}/skills", response_model=list[EmployeeSkillResponse])
# def get_employee_skills_route(employee_id: int, db: Session = Depends(get_db)):
#     employee = get_employee(db, employee_id)
#     if not employee:
#         raise HTTPException(status_code=404, detail="Employee not found")
#     return get_employee_skills(db, employee_id)


# @router.post("/{employee_id}/skills", response_model=EmployeeSkillResponse, status_code=201)
# def add_employee_skill_route(
#     employee_id: int,
#     employee_skill: EmployeeSkillCreate,
#     db: Session = Depends(get_db),
# ):
#     employee = get_employee(db, employee_id)
#     if not employee:
#         raise HTTPException(status_code=404, detail="Employee not found")
    
#     skill = get_skill(db, employee_skill.skill_id)
#     if not skill:
#         raise HTTPException(status_code=404, detail="Skill not found")
        
#     existing = get_employee_skill(db, employee_id, employee_skill.skill_id)
#     if existing:
#         raise HTTPException(status_code=400, detail="Employee already has this skill.")
        
#     return add_skill_to_employee(db, employee_id, employee_skill)


# @router.put("/{employee_id}/skills/{skill_id}", response_model=EmployeeSkillResponse)
# def update_employee_skill_route(
#     employee_id: int,
#     skill_id: int,
#     employee_skill: EmployeeSkillUpdate,
#     db: Session = Depends(get_db),
# ):
#     employee = get_employee(db, employee_id)
#     if not employee:
#         raise HTTPException(status_code=404, detail="Employee not found")
        
#     existing = get_employee_skill(db, employee_id, skill_id)
#     if not existing:
#         raise HTTPException(status_code=404, detail="Employee skill association not found")
        
#     if employee_skill.skill_id is not None and employee_skill.skill_id != skill_id:
#         # Check if the new skill exists
#         skill = get_skill(db, employee_skill.skill_id)
#         if not skill:
#             raise HTTPException(status_code=404, detail="New skill not found")
#         # Check uniqueness for the new pair
#         duplicate_check = get_employee_skill(db, employee_id, employee_skill.skill_id)
#         if duplicate_check:
#             raise HTTPException(status_code=400, detail="Employee already has this skill.")
            
#     updated = update_employee_skill(db, employee_id, skill_id, employee_skill)
#     return updated


# @router.delete("/{employee_id}/skills/{skill_id}")
# def remove_employee_skill_route(
#     employee_id: int,
#     skill_id: int,
#     db: Session = Depends(get_db),
# ):
#     employee = get_employee(db, employee_id)
#     if not employee:
#         raise HTTPException(status_code=404, detail="Employee not found")
        
#     removed = remove_skill_from_employee(db, employee_id, skill_id)
#     if not removed:
#         raise HTTPException(status_code=404, detail="Employee skill association not found")
        
#     return {"message": "Skill removed from employee"}
