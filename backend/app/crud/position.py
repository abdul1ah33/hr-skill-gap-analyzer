from sqlalchemy.orm import Session, selectinload
from app.models.position import Position
from app.schemas.position import PositionCreate, PositionUpdate


def _base_query(db: Session):
    return db.query(Position).options(selectinload(Position.department))


def create_position(db: Session, position: PositionCreate) -> Position:
    db_position = Position(**position.model_dump())
    db.add(db_position)
    db.commit()
    db.refresh(db_position)
    return _base_query(db).filter(Position.id == db_position.id).first()


def get_positions(db: Session) -> list[Position]:
    return _base_query(db).all()


def get_position(db: Session, position_id: int) -> Position | None:
    return _base_query(db).filter(Position.id == position_id).first()


def update_position(
    db: Session, position_id: int, position: PositionUpdate
) -> Position | None:
    db_position = get_position(db, position_id)
    if not db_position:
        return None

    update_data = position.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_position, key, value)

    db.commit()
    db.refresh(db_position)
    return _base_query(db).filter(Position.id == db_position.id).first()


def delete_position(db: Session, position_id: int) -> Position | None:
    db_position = get_position(db, position_id)
    if not db_position:
        return None

    db.delete(db_position)
    db.commit()
    return db_position


def get_position_count(db: Session) -> int:
    return db.query(Position).count()
