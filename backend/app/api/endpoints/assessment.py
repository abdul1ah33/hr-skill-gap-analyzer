from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.dependencies import get_db
from backend.app.services.old.assessment_service import AssessmentService
from app.auth.dependencies import get_current_hr


router = APIRouter(
    dependencies=[Depends(get_current_hr)]
)


def format_skill_item(item: dict) -> dict:
    """Ensure Enum values and keys are standardized for frontend consumption."""
    skill_name = item.get("skill", "")
    level_raw = item.get("level") or item.get("current") or item.get("employeeLevel")
    req_raw = item.get("required") or item.get("requiredLevel")
    
    emp_level = str(level_raw.value) if hasattr(level_raw, "value") else str(level_raw or "None")
    req_level = str(req_raw.value) if hasattr(req_raw, "value") else str(req_raw or "None")

    return {
        "skill": str(skill_name),
        "employeeLevel": emp_level,
        "requiredLevel": req_level,
        "essential": bool(item.get("essential", True)),
        "importance": int(item.get("importance", 5)),
        "aliasMatched": item.get("aliasMatched"),
    }


@router.post("/employee/{employee_id}/assess")
def assess_employee(
    employee_id: int,
    position_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Generate an AI assessment for an employee based on their skills vs position requirements.
    """
    try:
        assessment_service = AssessmentService(db)
        employee = assessment_service.get_employee(employee_id)

        # Get skill comparison data
        employee_data, raw_matched, raw_missing, raw_needs_improvement = assessment_service.compare_employee_skills(
            employee, target_position_id=position_id
        )

        matched = [format_skill_item(m) for m in raw_matched]
        missing = [format_skill_item(m) for m in raw_missing]
        needs_improvement = [format_skill_item(m) for m in raw_needs_improvement]

        # Calculate weighted match percentage:
        # Fully matched skills = 100% weight, Needs improvement = 60% weight (skill exists but needs upskill)
        total_skills = len(matched) + len(missing) + len(needs_improvement)
        if total_skills > 0:
            weighted_score = (len(matched) * 1.0 + len(needs_improvement) * 0.6) / total_skills * 100
            match_percentage = round(weighted_score, 1)
        else:
            match_percentage = 0.0

        # Generate AI report safely
        try:
            report = assessment_service.assessor.assess(
                raw_matched,
                raw_missing,
                raw_needs_improvement,
                employee_data,
            )
        except Exception as ai_err:
            print(f"AI Assessor error: {ai_err}")
            report = {
                "Skill Assessment": "Employee competency evaluated against position taxonomy.",
                "Strengths": f"Employee possesses {len(matched) + len(needs_improvement)} relevant skills.",
                "Skill Gaps": f"Identified {len(missing)} missing core requirements.",
                "Development Areas": f"{len(needs_improvement)} skills require higher proficiency.",
                "Training Priorities": [m["skill"] for m in missing[:3]],
                "Recommended Learning Plan": [
                    {
                        "Suggested training": f"Advanced {m['skill']} Course",
                        "Estimated duration": "4 weeks",
                        "Expected outcome": f"Attain required {m['requiredLevel']} level"
                    }
                    for m in missing[:2]
                ],
                "Final Recommendation": "Target high-priority skill gaps through structured training."
            }

        return {
            "matched": matched,
            "missing": missing,
            "needs_improvement": needs_improvement,
            "match_percentage": match_percentage,
            "ai_report": report,
            "employee_data": employee_data,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assessment generation failed: {str(e)}")
