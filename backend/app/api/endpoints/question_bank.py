"""HR: which skills the question bank covers."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_hr
from app.dependencies import get_db
from app.schemas.assessment import SkillCoverage
from app.services.assessment_service import AssessmentService

router = APIRouter(dependencies=[Depends(get_current_hr)])

service = AssessmentService()


@router.get("/skills", response_model=list[SkillCoverage], summary="Question bank coverage per skill")
def question_bank_coverage(db: Session = Depends(get_db)):
    return service.coverage(db)
