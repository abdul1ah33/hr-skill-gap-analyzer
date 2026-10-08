from collections import defaultdict

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.employee_skill import SkillLevel
from app.models.skill_question import SkillQuestion


def count_active_questions(
    db: Session,
    skill_ids: list[int],
) -> dict[int, dict[SkillLevel, int]]:
    """Active bank questions per skill and level; skills without any are left out."""
    if not skill_ids:
        return {}

    rows = (
        db.query(
            SkillQuestion.skill_id,
            SkillQuestion.proficiency_level,
            func.count(SkillQuestion.id),
        )
        .filter(
            SkillQuestion.skill_id.in_(skill_ids),
            SkillQuestion.is_active.is_(True),
        )
        .group_by(SkillQuestion.skill_id, SkillQuestion.proficiency_level)
        .all()
    )

    counts: dict[int, dict[SkillLevel, int]] = defaultdict(dict)
    for skill_id, level, count in rows:
        counts[skill_id][level] = count
    return dict(counts)
