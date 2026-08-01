from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.skill import Skill
from app.models.skill_alias import SkillAlias
from app.models.employee_skill import SkillLevel


class SkillAliasService:

    @staticmethod
    def build_alias_map(db: Optional[Session]) -> dict[str, Any]:
        """
        Loads all Skills and SkillAliases from DB and builds an in-memory
        canonical mapping to eliminate duplicate DB queries during batch matching.

        Returns a dictionary with:
          - 'name_to_canonical': { lower_name_or_alias: canonical_skill_id }
          - 'canonical_to_name': { canonical_skill_id: canonical_skill_name }
        """
        if db is None:
            return {"name_to_canonical": {}, "canonical_to_name": {}}

        skills = db.query(Skill).all()
        aliases = db.query(SkillAlias).all()

        name_to_canonical = {}
        canonical_to_name = {}

        for skill in skills:
            canonical_to_name[skill.id] = skill.name
            name_to_canonical[skill.name.strip().lower()] = skill.id

        for alias in aliases:
            name_to_canonical[alias.alias.strip().lower()] = alias.skill_id

        return {
            "name_to_canonical": name_to_canonical,
            "canonical_to_name": canonical_to_name,
        }

    @classmethod
    def find_matching_employee_skill(
        cls,
        db: Optional[Session],
        required_skill_name: str,
        employee_skills: dict[str, SkillLevel],
        alias_map: Optional[dict[str, Any]] = None,
    ) -> Optional[SkillLevel]:
        """
        Finds employee skill level matching required_skill_name.

        Matching Order:
        1. Exact match (case-insensitive key lookup).
        2. Alias & Canonical skill resolution (bidirectional).
        3. Returns None if no alias match is found (ready for future AI semantic matching).
        """
        if not employee_skills:
            return None

        # Step 1: Exact Match (case-insensitive)
        req_clean = required_skill_name.strip().lower()
        for emp_skill, level in employee_skills.items():
            if emp_skill.strip().lower() == req_clean:
                return level

        # Step 2: Alias & Canonical Match
        if alias_map is None and db is not None:
            alias_map = cls.build_alias_map(db)

        if alias_map and alias_map.get("name_to_canonical"):
            name_to_canonical = alias_map["name_to_canonical"]

            req_canonical_id = name_to_canonical.get(req_clean)

            if req_canonical_id is not None:
                for emp_skill, level in employee_skills.items():
                    emp_clean = emp_skill.strip().lower()
                    emp_canonical_id = name_to_canonical.get(emp_clean)
                    if emp_canonical_id is not None and emp_canonical_id == req_canonical_id:
                        return level

        # Step 3: Fallback query if alias_map wasn't passed or pre-built, check DB directly
        elif db is not None:
            # Check if required_skill_name is an alias or canonical skill in DB
            db_alias = (
                db.query(SkillAlias)
                .filter(SkillAlias.alias.ilike(required_skill_name.strip()))
                .first()
            )
            req_skill_obj = None
            if db_alias:
                req_skill_obj = db_alias.skill
            else:
                req_skill_obj = (
                    db.query(Skill)
                    .filter(Skill.name.ilike(required_skill_name.strip()))
                    .first()
                )

            if req_skill_obj:
                # Gather all equivalent skill names (canonical name + aliases)
                equivalent_names = {req_skill_obj.name.strip().lower()}
                for a in req_skill_obj.aliases:
                    equivalent_names.add(a.alias.strip().lower())

                for emp_skill, level in employee_skills.items():
                    emp_clean = emp_skill.strip().lower()
                    if emp_clean in equivalent_names:
                        return level

                    # Also check if emp_skill maps to same canonical skill
                    emp_alias = (
                        db.query(SkillAlias)
                        .filter(SkillAlias.alias.ilike(emp_skill.strip()))
                        .first()
                    )
                    if emp_alias and emp_alias.skill_id == req_skill_obj.id:
                        return level

        # Future AI Semantic Match layer can hook in here when introduced.
        return None
