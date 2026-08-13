import app.core.paths

from backend.app.services.old.resume_import_service import ResumeImportService

service = ResumeImportService()

result = service.import_resume("OmarOssamaCV.docx")

print(result)