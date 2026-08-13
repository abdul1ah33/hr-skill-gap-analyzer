from app.db.database import SessionLocal
from backend.app.services.old.assessment_service import AssessmentService

db = SessionLocal()

service = AssessmentService(db)

report = service.generate_assessment(6)

print(report)