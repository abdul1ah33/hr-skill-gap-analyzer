import re
from typing import Optional, Any, Tuple
from sqlalchemy.orm import Session
from app.models.skill import Skill
from app.models.skill_alias import SkillAlias
from app.models.employee_skill import SkillLevel


FILLER_WORDS = {
    "with", "for", "and", "in", "of", "to", "the", "a", "an",
    "systems", "system", "practices", "tools", "tool", "software",
    "programming", "development", "developer", "management", "manager",
    "engineering", "engineer", "testing", "test", "services", "service"
}

def clean_skill_string(name: str) -> str:
    """Normalize string: lowercase, strip punctuation and extra spaces."""
    cleaned = re.sub(r'[^\w\s]', ' ', name.lower())
    return " ".join(cleaned.split())

def extract_keywords(name: str) -> set[str]:
    """Extract core meaningful keyword tokens from a skill string."""
    tokens = clean_skill_string(name).split()
    meaningful = {t for t in tokens if t not in FILLER_WORDS and len(t) > 1}
    return meaningful if meaningful else set(tokens)


class SkillAliasService:

    @staticmethod
    def build_alias_map(db: Optional[Session]) -> dict[str, Any]:
        """
        Loads all Skills and SkillAliases from DB and builds an in-memory
        canonical mapping.
        """
        if db is None:
            return {"name_to_canonical": {}, "canonical_to_name": {}, "alias_to_canonical": {}}

        skills = db.query(Skill).all()
        aliases = db.query(SkillAlias).all()

        name_to_canonical = {}
        canonical_to_name = {}
        alias_to_canonical = {}

        for skill in skills:
            canonical_to_name[skill.id] = skill.name
            clean = clean_skill_string(skill.name)
            name_to_canonical[clean] = skill.id

        for alias in aliases:
            clean = clean_skill_string(alias.alias)
            alias_to_canonical[clean] = alias.skill_id

        return {
            "name_to_canonical": name_to_canonical,
            "canonical_to_name": canonical_to_name,
            "alias_to_canonical": alias_to_canonical,
        }

    @classmethod
    def find_matching_employee_skill_with_info(
        cls,
        db: Optional[Session],
        required_skill_name: str,
        employee_skills: dict[str, SkillLevel],
        alias_map: Optional[dict[str, Any]] = None,
    ) -> Tuple[Optional[SkillLevel], Optional[str]]:
        """
        Finds employee skill level and matching detail string for required_skill_name.

        Returns (SkillLevel, matched_via_str) or (None, None).
        """
        if not employee_skills:
            return None, None

        req_clean = clean_skill_string(required_skill_name)
        req_keywords = extract_keywords(required_skill_name)

        # ─── 1. Exact Match (case-insensitive) ──────────────────────────────────
        for emp_skill, level in employee_skills.items():
            if clean_skill_string(emp_skill) == req_clean:
                return level, emp_skill

        # ─── 2. Canonical Alias ID Resolution ─────────────────────────────────────
        if alias_map is None and db is not None:
            alias_map = cls.build_alias_map(db)

        if alias_map:
            name_to_canonical = alias_map.get("name_to_canonical", {})
            alias_to_canonical = alias_map.get("alias_to_canonical", {})

            # Check if required_skill maps to a canonical skill ID
            req_canonical_id = name_to_canonical.get(req_clean) or alias_to_canonical.get(req_clean)

            if req_canonical_id is not None:
                for emp_skill, level in employee_skills.items():
                    emp_clean = clean_skill_string(emp_skill)
                    emp_canonical_id = name_to_canonical.get(emp_clean) or alias_to_canonical.get(emp_clean)
                    if emp_canonical_id is not None and emp_canonical_id == req_canonical_id:
                        return level, emp_skill

        # ─── 3. Containment & Substring Matching ──────────────────────────────────
        # Handles "Git" <-> "Version control with Git", "Python" <-> "Python Programming"
        for emp_skill, level in employee_skills.items():
            emp_clean = clean_skill_string(emp_skill)

            # Ignore very short strings like "a", "c" for substring matching
            if len(emp_clean) >= 3 and len(req_clean) >= 3:
                if emp_clean in req_clean or req_clean in emp_clean:
                    return level, emp_skill

        # ─── 4. Keyword Token Overlap Matching ───────────────────────────────────
        # Handles "Version Control Systems" <-> "Version control with Git" (share "version", "control")
        for emp_skill, level in employee_skills.items():
            emp_keywords = extract_keywords(emp_skill)
            common = req_keywords.intersection(emp_keywords)

            # If there's a strong keyword match (at least 1 unique keyword like 'git', 'docker', 'python', 'aws', 'mysql', 'junit')
            if common:
                # Require that common tokens contain a non-generic technical keyword
                for token in common:
                    if len(token) >= 3 and token not in FILLER_WORDS:
                        return level, emp_skill

        return None, None

    @classmethod
    def find_matching_employee_skill(
        cls,
        db: Optional[Session],
        required_skill_name: str,
        employee_skills: dict[str, SkillLevel],
        alias_map: Optional[dict[str, Any]] = None,
    ) -> Optional[SkillLevel]:
        level, _ = cls.find_matching_employee_skill_with_info(db, required_skill_name, employee_skills, alias_map)
        return level
