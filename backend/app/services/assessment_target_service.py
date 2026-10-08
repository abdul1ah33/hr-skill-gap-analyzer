"""
Chooses which skills an assessment tests (plan §7.1, §A.6).

Every skill the employee's position requires is a candidate: matched,
needs_improvement and unmatched (D2); additional skills are not tested.
Candidates are ordered matched → needs_improvement → unmatched, essential
before optional inside each group, then by name (D3). Skills without enough
active bank questions (1 Beginner / 2 Intermediate / 2 Advanced) are
reported as not assessable. Only the first max_skills are tested; the rest
are reported as over_limit.

Read-only: nothing is written to the database.
"""
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.core.config import ASSESSMENT_MAX_SKILLS
from app.core.exceptions import (
    EmployeeNotFoundError,
    NoAssessableSkillsError,
    PositionHasNoSkillsError,
)
from app.crud.question_bank import count_active_questions
from app.models.assessment_enums import SkillGapCategory
from app.models.employee import Employee
from app.models.employee_skill import SkillLevel
from app.services.assessment_scoring_service import QUESTIONS_PER_LEVEL
from app.services.skill_comparison_service import SkillComparisonService

CATEGORY_ORDER = (
    SkillGapCategory.MATCHED,
    SkillGapCategory.NEEDS_IMPROVEMENT,
    SkillGapCategory.UNMATCHED,
)

# Reasons a required skill is not tested
NO_QUESTION_BANK = "no_question_bank"
INSUFFICIENT_QUESTIONS = "insufficient_questions"
OVER_LIMIT = "over_limit"


@dataclass(frozen=True)
class CandidateSkill:
    skill_id: int
    skill_name: str
    category: SkillGapCategory
    is_essential: bool
    claimed_level: SkillLevel | None   # None when the employee doesn't have it
    required_level: SkillLevel


@dataclass(frozen=True)
class SkippedSkill:
    skill: CandidateSkill
    reason: str


@dataclass
class TargetSelection:
    targets: list[CandidateSkill] = field(default_factory=list)
    skipped: list[SkippedSkill] = field(default_factory=list)

    @property
    def not_assessable(self) -> list[SkippedSkill]:
        return [s for s in self.skipped if s.reason != OVER_LIMIT]

    @property
    def over_limit(self) -> list[SkippedSkill]:
        return [s for s in self.skipped if s.reason == OVER_LIMIT]


def _sort_key(candidate: CandidateSkill) -> tuple:
    return (
        CATEGORY_ORDER.index(candidate.category),
        not candidate.is_essential,
        candidate.skill_name,
    )


def _level_or_none(value: str) -> SkillLevel | None:
    return None if value == "None" else SkillLevel(value)


class AssessmentTargetService:
    def __init__(self, comparison_service: SkillComparisonService | None = None):
        self.comparison_service = comparison_service or SkillComparisonService()

    def candidates(self, db: Session, employee_id: int) -> list[CandidateSkill]:
        """Every required skill of the employee's position, in test order."""
        employee = db.get(Employee, employee_id)
        if employee is None:
            raise EmployeeNotFoundError()

        comparison = self.comparison_service.compare_employee_to_position(db, employee_id)

        candidates = [
            CandidateSkill(
                skill_id=entry["skill_id"],
                skill_name=entry["skill"],
                category=category,
                is_essential=entry["priority"] == "Essential",
                claimed_level=_level_or_none(entry["employee_level"]),
                required_level=SkillLevel(entry["required_level"]),
            )
            for category in CATEGORY_ORDER
            for entry in comparison[category.value]
        ]
        if not candidates:
            raise PositionHasNoSkillsError()

        return sorted(candidates, key=_sort_key)

    def select_targets(
        self,
        db: Session,
        employee_id: int,
        max_skills: int = ASSESSMENT_MAX_SKILLS,
    ) -> TargetSelection:
        """
        Split the candidates into the skills to test and the skipped ones.
        Raises NoAssessableSkillsError when nothing can be tested.
        """
        candidates = self.candidates(db, employee_id)
        counts = count_active_questions(db, [c.skill_id for c in candidates])

        selection = TargetSelection()
        for candidate in candidates:
            per_level = counts.get(candidate.skill_id)
            if not per_level:
                selection.skipped.append(SkippedSkill(candidate, NO_QUESTION_BANK))
            elif any(per_level.get(level, 0) < quota for level, quota in QUESTIONS_PER_LEVEL.items()):
                selection.skipped.append(SkippedSkill(candidate, INSUFFICIENT_QUESTIONS))
            elif len(selection.targets) >= max_skills:
                selection.skipped.append(SkippedSkill(candidate, OVER_LIMIT))
            else:
                selection.targets.append(candidate)

        if not selection.targets:
            raise NoAssessableSkillsError(selection.not_assessable)

        return selection
