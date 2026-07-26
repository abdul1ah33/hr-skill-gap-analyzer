import app.core.paths

from app.services.ai_position_service import generate_position_skills


result = generate_position_skills(
    "Senior Python Backend Engineer"
)

print(result)