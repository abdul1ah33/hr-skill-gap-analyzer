from app.db.database import SessionLocal
from app.services.assessment_service import AssessmentService

db = SessionLocal()

service = AssessmentService(db)

report = service.generate_assessment(6)

print(report)