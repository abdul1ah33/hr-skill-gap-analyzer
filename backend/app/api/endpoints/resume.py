from fastapi import (
    APIRouter,
    Depends,
    File,
    UploadFile,
    HTTPException,
)
from sqlalchemy.orm import Session
import tempfile
import os

from app.dependencies import get_db
from app.services.resume_import_service import ResumeImportService


router = APIRouter()


@router.post("/import")
async def import_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    service = ResumeImportService()

    suffix = os.path.splitext(file.filename)[1]

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix,
    ) as temp:

        temp.write(await file.read())
        temp_path = temp.name

    try:
        employee = service.import_resume(
            db,
            temp_path,
        )

        return {
            "message": "Resume imported successfully",
            "employee_id": employee.id,
        }

    finally:
        os.remove(temp_path)