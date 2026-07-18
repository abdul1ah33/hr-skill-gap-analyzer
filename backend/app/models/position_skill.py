from sqlalchemy import Table, Column, Integer, ForeignKey
from app.db.database import Base

position_skills = Table(
    "position_skills",
    Base.metadata,
    Column(
        "position_id",
        Integer,
        ForeignKey("positions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "skill_id",
        Integer,
        ForeignKey("skills.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
