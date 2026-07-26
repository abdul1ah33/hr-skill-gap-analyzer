from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.department import Department
from app.schemas.position import (
    PositionCreate,
    PositionUpdate,
    PositionResponse,
)
from app.crud.position import (
    get_position,
    get_positions,
    update_position,
    delete_position,
    get_position_count,
)

from app.services.position_service import PositionService

from app.auth.dependencies import get_current_hr


router = APIRouter(
    dependencies=[Depends(get_current_hr)]
)

position_service = PositionService()


@router.post("/", response_model=PositionResponse, status_code=201)
def create_position_route(
    position: PositionCreate,
    db: Session = Depends(get_db),
):
    department = db.get(Department, position.department_id)
    if not department:
        raise HTTPException(
            status_code=404,
            detail="Department not found",
        )

    return position_service.create_position(
        db=db,
        position_data=position,
    )


@router.get("/count")
def position_count_route(db: Session = Depends(get_db)):
    return {"count": get_position_count(db)}


@router.get("/", response_model=list[PositionResponse])
def get_positions_route(db: Session = Depends(get_db)):
    return get_positions(db)


@router.get("/{position_id}", response_model=PositionResponse)
def get_position_route(position_id: int, db: Session = Depends(get_db)):
    position = get_position(db, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    return position


@router.put("/{position_id}", response_model=PositionResponse)
def update_position_route(
    position_id: int, position: PositionUpdate, db: Session = Depends(get_db)
):
    # Check that position exists first
    db_position = get_position(db, position_id)
    if not db_position:
        raise HTTPException(status_code=404, detail="Position not found")

    # If updating department_id, check it exists
    if position.department_id is not None:
        department = db.get(Department, position.department_id)
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")

    return update_position(db, position_id, position)


@router.delete("/{position_id}")
def delete_position_route(position_id: int, db: Session = Depends(get_db)):
    position = get_position(db, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    if position.employees:
        raise HTTPException(status_code=400, detail="Position has employees.")

    delete_position(db, position_id)
    return {"message": "Position deleted"}