import app.core.paths

from app.services.resume_import_service import ResumeImportService

service = ResumeImportService()

result = service.import_resume("OmarOssamaCV.docx")

print(result)