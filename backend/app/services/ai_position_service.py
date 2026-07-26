from ai.position_skill_generator import PositionSkillGenerator


generator = PositionSkillGenerator()


def generate_position_skills(position_title: str):
    return generator.generate(position_title)