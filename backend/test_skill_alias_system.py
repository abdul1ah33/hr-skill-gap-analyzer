from app.db.database import SessionLocal
from app.models.employee_skill import SkillLevel
from app.schemas.skill_alias import SkillAliasCreate
from app.crud.skill_alias import (
    create_skill_alias,
    get_skill_alias,
    get_skill_aliases,
    delete_skill_alias,
    get_alias_by_name,
    get_aliases_for_skill,
)
from app.services.skill_alias_service import SkillAliasService
from app.services.skill_gap_service import SkillGapService


def test_alias_system():
    db = SessionLocal()
    try:
        print("--- Testing Skill Alias System ---")

        # 1. Test CRUD operations
        alias_by_name = get_alias_by_name(db, "Python")
        assert alias_by_name is not None, "Seed alias 'Python' should exist"
        print(f"[OK] get_alias_by_name('Python'): skill_id={alias_by_name.skill_id}")

        aliases_for_skill = get_aliases_for_skill(db, alias_by_name.skill_id)
        assert len(aliases_for_skill) > 0, "Aliases for skill should not be empty"
        print(f"[OK] get_aliases_for_skill({alias_by_name.skill_id}): count={len(aliases_for_skill)}")

        all_aliases = get_skill_aliases(db, limit=5)
        assert len(all_aliases) == 5, "get_skill_aliases limit=5 should return 5"
        print("[OK] get_skill_aliases limit test passed")

        # 2. Test Bidirectional Matching Logic
        employee_skills = {
            "Python": SkillLevel.ADVANCED,
            "Docker": SkillLevel.INTERMEDIATE,
            "PostgreSQL": SkillLevel.EXPERT,
            "Git": SkillLevel.BEGINNER,
            "CPR": SkillLevel.ADVANCED,
        }

        # Case A: Exact Match
        level = SkillAliasService.find_matching_employee_skill(db, "Python", employee_skills)
        assert level == SkillLevel.ADVANCED, f"Expected ADVANCED, got {level}"
        print("[OK] Case A: Exact match passed")

        # Case B: Required is Canonical ("Computer Programming"), Employee has Alias ("Python")
        level = SkillAliasService.find_matching_employee_skill(db, "Computer Programming", employee_skills)
        assert level == SkillLevel.ADVANCED, f"Expected ADVANCED for Computer Programming, got {level}"
        print("[OK] Case B: Required canonical -> Employee alias passed")

        # Case C: Required is Alias ("Java"), Employee has Sibling Alias ("Python") -> both map to "Computer Programming"
        level = SkillAliasService.find_matching_employee_skill(db, "Java", employee_skills)
        assert level == SkillLevel.ADVANCED, f"Expected ADVANCED for Java, got {level}"
        print("[OK] Case C: Sibling alias matching passed")

        # Case D: Reverse Direction: Required is Alias ("Container Management"), Employee has Alias ("Docker")
        level = SkillAliasService.find_matching_employee_skill(db, "Container Management", employee_skills)
        assert level == SkillLevel.INTERMEDIATE, f"Expected INTERMEDIATE for Container Management, got {level}"
        print("[OK] Case D: Reverse/Cross alias matching passed")

        # Case E: Multi-domain (Healthcare: Required "Patient Care", Employee has "CPR")
        level = SkillAliasService.find_matching_employee_skill(db, "Patient Care", employee_skills)
        assert level == SkillLevel.ADVANCED, f"Expected ADVANCED for Patient Care, got {level}"
        print("[OK] Case E: Multi-domain (Healthcare) matching passed")

        # 3. Test SkillGapService comparison
        required_skills = {
            "Computer Programming": {
                "required_level": SkillLevel.INTERMEDIATE,
                "importance": 5,
                "essential": True,
            },
            "Version Control": {
                "required_level": SkillLevel.ADVANCED,
                "importance": 4,
                "essential": True,
            },
            "Machine Learning": {
                "required_level": SkillLevel.INTERMEDIATE,
                "importance": 3,
                "essential": False,
            },
        }

        matched, missing, needs_improvement = SkillGapService.compare_skills(
            employee_skills, required_skills, db=db
        )

        # Computer Programming (ADVANCED vs required INTERMEDIATE) -> matched
        # Version Control (Git = BEGINNER vs required ADVANCED) -> needs_improvement
        # Machine Learning (Not present and no alias) -> missing

        assert any(item["skill"] == "Computer Programming" for item in matched), "Computer Programming should be matched"
        assert any(item["skill"] == "Version Control" for item in needs_improvement), "Version Control should be in needs_improvement"
        assert any(item["skill"] == "Machine Learning" for item in missing), "Machine Learning should be missing"

        print("[OK] SkillGapService comparison passed successfully!")
        print("\nAll skill alias system tests passed!")

    finally:
        db.close()


if __name__ == "__main__":
    test_alias_system()
