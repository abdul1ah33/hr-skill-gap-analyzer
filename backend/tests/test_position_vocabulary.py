"""Position skill generation prefers names the question bank covers (plan D17, Phase 10)."""
import pytest

from app.ai.perfect_profile import PerfectProfile, TargetSkill, build_prompt
from app.crud.question_bank import skill_names_with_questions
from app.models.position_skill import PositionSkill
from app.services import position_skill_service
from app.services.position_skill_service import PositionSkillService

ESCO = {"essential": ["use python programming"], "optional": ["manage databases"]}


@pytest.mark.unit
def test_prompt_lists_preferred_names_sorted():
    prompt = build_prompt("Backend Engineer", ESCO, ["sql", "docker"])

    assert "Preferred Skill Names:\n- docker\n- sql\n" in prompt
    assert prompt.index("Raw ESCO Skills") < prompt.index("Preferred Skill Names")


@pytest.mark.unit
@pytest.mark.parametrize("names", [None, []])
def test_prompt_without_preferred_names(names):
    assert "Preferred Skill Names" not in build_prompt("Backend Engineer", ESCO, names)


@pytest.mark.integration
def test_only_skills_with_active_questions_are_preferred(db, factory):
    factory.bank_questions(factory.skill("sql"))
    factory.bank_questions(factory.skill("retired"), is_active=False)
    factory.skill("no questions")

    assert skill_names_with_questions(db) == ["sql"]


@pytest.mark.integration
def test_generation_passes_bank_names_and_reuses_the_skill(db, factory, monkeypatch):
    sql = factory.skill("sql")
    factory.bank_questions(sql)
    position = factory.position("Backend Engineer")
    received = {}

    def fake_profile(job_title, esco_skills, api_key, preferred_skill_names=None, **kwargs):
        received["names"] = preferred_skill_names
        return PerfectProfile(
            position=job_title,
            skills=[TargetSkill(name="SQL", target_proficiency="Intermediate", priority="Essential")],
        )

    monkeypatch.setenv("GEMINI_API_KEY", "test")
    monkeypatch.setattr(position_skill_service, "generate_perfect_profile", fake_profile)
    service = PositionSkillService()
    monkeypatch.setattr(service.esco_service, "get_role_skills", lambda title: {"skills": ESCO})

    created = service.generate_position_skills(db, position.id)

    assert received["names"] == ["sql"]
    assert [(ps.skill_id, ps.is_essential) for ps in created] == [(sql.id, True)]
    assert db.query(PositionSkill).filter_by(position_id=position.id).count() == 1
