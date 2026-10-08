from collections import defaultdict

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.employee_skill import SkillLevel
from app.models.skill import Skill
from app.models.skill_question import SkillQuestion, SkillQuestionOption


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


def active_question_pools(
    db: Session,
    skill_ids: list[int],
) -> dict[tuple[int, SkillLevel], list[int]]:
    """Active bank question ids grouped by (skill_id, level), sorted by id."""
    if not skill_ids:
        return {}

    rows = (
        db.query(SkillQuestion.id, SkillQuestion.skill_id, SkillQuestion.proficiency_level)
        .filter(
            SkillQuestion.skill_id.in_(skill_ids),
            SkillQuestion.is_active.is_(True),
        )
        .order_by(SkillQuestion.id)
        .all()
    )

    pools: dict[tuple[int, SkillLevel], list[int]] = defaultdict(list)
    for question_id, skill_id, level in rows:
        pools[(skill_id, level)].append(question_id)
    return dict(pools)


def option_ids_by_question(db: Session, question_ids: list[int]) -> dict[int, list[int]]:
    """Option ids of each bank question, sorted by id."""
    if not question_ids:
        return {}

    rows = (
        db.query(SkillQuestionOption.question_id, SkillQuestionOption.id)
        .filter(SkillQuestionOption.question_id.in_(question_ids))
        .order_by(SkillQuestionOption.id)
        .all()
    )

    options: dict[int, list[int]] = defaultdict(list)
    for question_id, option_id in rows:
        options[question_id].append(option_id)
    return dict(options)


def skill_names_with_questions(db: Session) -> list[str]:
    """Names of skills that have active bank questions, sorted."""
    rows = (
        db.query(Skill.name)
        .join(SkillQuestion, SkillQuestion.skill_id == Skill.id)
        .filter(SkillQuestion.is_active.is_(True))
        .distinct()
        .order_by(Skill.name)
        .all()
    )
    return [name for (name,) in rows]
