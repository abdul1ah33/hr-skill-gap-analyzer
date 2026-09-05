import os
import tempfile

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.services.resume_service import ResumeService
from backend.app.auth.dependencies import get_current_hr


router = APIRouter(
    dependencies=[Depends(get_current_hr)]
)


@router.post("/extract")
async def extract_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Extract a resume and create the employee in the database.
    """

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file was provided.",
        )

    extension = os.path.splitext(file.filename)[1].lower()

    if extension not in {".pdf", ".docx"}:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported.",
        )

    temp_path = None

    try:

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
        ) as temp_file:

            temp_path = temp_file.name

            contents = await file.read()
            temp_file.write(contents)

        service = ResumeService()

        # AI extraction
        candidate = service.extract_candidate(temp_path)

        # Save everything to database
        employee = service.create_employee_from_resume(
            db=db,
            candidate=candidate,
        )

        return {
            "message": "Employee created successfully",
            "employee_id": employee.id,
            "employee_number": employee.employee_number,
            "candidate": candidate,
        }

    except ValueError as exc:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to process resume: {str(exc)}",
        )

    finally:

        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)