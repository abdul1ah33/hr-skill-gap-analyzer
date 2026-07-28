from ai.agents.job_normalizer import OccupationNormalizer
from ai.agents.skill_selector import SkillSelector
from ai.services.esco_service import EscoService


class PositionSkillGenerator:
    def __init__(self):
        self.normalizer = OccupationNormalizer()
        self.esco = EscoService()
        self.selector = SkillSelector()

    def generate(self, position_title: str):
        normalized = self.normalizer.normalize(position_title)

        role = self.esco.get_role_skills(
            normalized["normalized_title"]
        )

        if role is None:
            return None

        essential = [
            skill["title"]
            for skill in role["skills"]["essential"]
        ]

        optional = [
            skill["title"]
            for skill in role["skills"]["optional"]
        ]

        skills = self.selector.select_skills(
            normalized["normalized_title"],
            essential,
            optional,
        )

        return {
            "normalized_title": normalized["normalized_title"],
            "skills": skills["skills"],
        }