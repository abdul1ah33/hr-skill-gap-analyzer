from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
)
from app.crud.department import (
    create_department,
    get_department,
    get_departments,
    update_department,
    delete_department,
    get_department_count,
)

router = APIRouter()


@router.post("/", response_model=DepartmentResponse, status_code=201)
def create_department_route(
    department: DepartmentCreate, db: Session = Depends(get_db)
):
    return create_department(db, department)


@router.get("/count")
def department_count_route(db: Session = Depends(get_db)):
    return {"count": get_department_count(db)}


@router.get("/", response_model=list[DepartmentResponse])
def get_departments_route(db: Session = Depends(get_db)):
    return get_departments(db)


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department_route(department_id: int, db: Session = Depends(get_db)):
    department = get_department(db, department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department_route(
    department_id: int,
    department: DepartmentUpdate,
    db: Session = Depends(get_db),
):
    updated = update_department(db, department_id, department)
    if not updated:
        raise HTTPException(status_code=404, detail="Department not found")
    return updated


@router.delete("/{department_id}")
def delete_department_route(department_id: int, db: Session = Depends(get_db)):
    department = get_department(db, department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    if department.positions:
        raise HTTPException(
            status_code=400, detail="Department has positions."
        )
    delete_department(db, department_id)
    return {"message": "Department deleted"}
