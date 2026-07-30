import json

from agents.job_normalizer import OccupationNormalizer
from agents.skill_selector import SkillSelector
from services.esco_service import EscoService

normalizer = OccupationNormalizer()
esco = EscoService()
selector = SkillSelector()

titles = [
    "Senior Python Backend Engineer",
    "Senior dragon",
    "Wa7sh el AI",
    "Teneeen el Chemistry Science",
    "3afreet Data",
    "3anteel backend",
    "Flyer airplane"
]

for title in titles:
    result = normalizer.normalize(title)

    print(result)


req_skills = esco.get_role_skills(result['normalized_title'])

essential = [skill['title'] for skill in req_skills['skills']['essential'] if req_skills is not None] #type: ignore
optional = [skill['title'] for skill in req_skills['skills']['optional'] if req_skills is not None]    #type: ignore

skills = selector.select_skills(
    result['normalized_title'],
    essential,
    optional
)

print(json.dumps(skills, indent = 4 ))