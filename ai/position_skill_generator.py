# import logging
# from ai.agents.job_normalizer import OccupationNormalizer
# from ai.agents.skill_selector import SkillSelector
# from ai.services.esco_service import EscoService

# logger = logging.getLogger(__name__)

# # List of generic/fluff non-skills to explicitly reject
# GENERIC_NOISE_TERMS = {
#     "ict debugging tools", "computer-aided software engineering tools",
#     "technical drawings", "object-oriented modelling", "engineering processes",
#     "use office systems", "manage personal professional development",
#     "work in teams", "adapt to change", "collaboration tools", "collaboration tools with slack",
#     "collaboration and communication", "adaptability and continuous learning",
#     "leadership and team management", "project management", "project management tools",
#     "integrated development environment software", "computer programming", "debug software",
#     "programming languages", "software development methodologies", "software design patterns"
# }


# class PositionSkillGenerator:
#     def __init__(self):
#         self.normalizer = OccupationNormalizer()
#         self.esco = EscoService()
#         self.selector = SkillSelector()

#     def generate(self, position_title: str):
#         title_lower = position_title.lower()

#         # Direct domain-specific high quality skill sets for tech & business roles
#         if "backend" in title_lower or "software" in title_lower or "developer" in title_lower or "engineer" in title_lower:
#             return {
#                 "normalized_title": position_title,
#                 "skills": [
#                     {"name": "Python Programming", "category": "Technical", "required_level": 70, "importance": 9, "is_essential": True, "short_description": "Backend API development with Python/FastAPI/Django"},
#                     {"name": "Database Management", "category": "Technical", "required_level": 70, "importance": 8, "is_essential": True, "short_description": "SQL databases like PostgreSQL and MySQL"},
#                     {"name": "Version Control Systems", "category": "Technical", "required_level": 70, "importance": 8, "is_essential": True, "short_description": "Version control with Git and GitHub"},
#                     {"name": "DevOps Practices", "category": "Technical", "required_level": 60, "importance": 7, "is_essential": True, "short_description": "Containerization with Docker & CI/CD"},
#                     {"name": "Cloud Computing", "category": "Technical", "required_level": 60, "importance": 7, "is_essential": True, "short_description": "Cloud infrastructure with AWS"},
#                 ],
#             }

#         if "hr" in title_lower or "human resource" in title_lower or "recruiter" in title_lower:
#             return {
#                 "normalized_title": position_title,
#                 "skills": [
#                     {"name": "Talent Acquisition", "category": "HR", "required_level": 75, "importance": 9, "is_essential": True, "short_description": "Sourcing and interviewing candidates"},
#                     {"name": "Employee Relations", "category": "HR", "required_level": 70, "importance": 8, "is_essential": True, "short_description": "Workplace conflict & compliance"},
#                     {"name": "HR Strategy & Planning", "category": "HR", "required_level": 65, "importance": 7, "is_essential": True, "short_description": "Workforce planning and policies"},
#                 ],
#             }

#         # Try ESCO search for other roles
#         try:
#             role = self.esco.get_role_skills(position_title)
#             if role is not None:
#                 essential_raw = [skill["title"] for skill in role["skills"].get("essential", [])]
#                 filtered = [
#                     s for s in essential_raw if s.lower() not in GENERIC_NOISE_TERMS
#                 ][:5]
#                 if filtered:
#                     esco_skills = [
#                         {
#                             "name": s,
#                             "category": "Technical",
#                             "required_level": 70,
#                             "importance": 8,
#                             "is_essential": True,
#                             "short_description": f"Core requirement for {position_title}"
#                         }
#                         for s in filtered
#                     ]
#                     return {"normalized_title": position_title, "skills": esco_skills}
#         except Exception as e:
#             logger.warning(f"ESCO lookup failed: {e}")

#         # Fallback default
#         return {
#             "normalized_title": position_title,
#             "skills": [
#                 {"name": f"{position_title} Core Skills", "category": "Core", "required_level": 70, "importance": 8, "is_essential": True, "short_description": f"Core skills for {position_title}"},
#             ],
#         }