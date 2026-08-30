from __future__ import annotations

import os
import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models.position import Position
from app.models.skill import Skill
from app.models.position_skill import PositionSkill
from app.models.employee_skill import SkillLevel

from app.services.esco_skills_extractor import EscoService

from app.ai.perfect_profile import generate_perfect_profile


# ==========================================
# Logging
# ==========================================

logger = logging.getLogger("PositionSkillService")


# ==========================================
# Service
# ==========================================

class PositionSkillService:
    """
    Generates and stores the required skills for a Position.

    Flow:

        Position
            ↓
        Check database
            ↓
        ESCO
            ↓
        Gemini
            ↓
        Skill + PositionSkill
            ↓
        Database

    Existing PositionSkill records are treated as the
    cached/generated result for that position.
    """

    def __init__(self):
        self.esco_service = EscoService()

    # ==================================================
    # Public Method
    # ==================================================

    def generate_position_skills(
        self,
        db: Session,
        position_id: int,
    ) -> list[PositionSkill]:
        """
        Generate the required skills for a position.

        If the position already has PositionSkill records,
        those records are returned immediately.

        Otherwise:

            1. Get position from DB
            2. Fetch skills from ESCO
            3. Send ESCO skills to Gemini
            4. Find/create Skill records
            5. Create PositionSkill records
            6. Commit to DB

        Args:
            db:
                SQLAlchemy database session.

            position_id:
                ID of the Position.

        Returns:
            List of PositionSkill records.

        Raises:
            ValueError:
                If the position doesn't exist, ESCO fails,
                or Gemini fails.
        """

        logger.info(
            f"Starting Phase 2 for position_id={position_id}"
        )

        # ------------------------------------------
        # 1. Get Position
        # ------------------------------------------

        position = (
            db.query(Position)
            .filter(Position.id == position_id)
            .first()
        )

        if not position:
            raise ValueError(
                f"Position with id={position_id} was not found."
            )

        logger.info(
            f"Found position: '{position.title}'"
        )

        # ------------------------------------------
        # 2. Check Database Cache
        # ------------------------------------------
        #
        # If this position already has generated
        # PositionSkill records, don't call ESCO
        # or Gemini again.
        #

        existing_position_skills = (
            db.query(PositionSkill)
            .filter(
                PositionSkill.position_id == position_id
            )
            .all()
        )

        if existing_position_skills:

            logger.info(
                f"Position {position_id} already has "
                f"{len(existing_position_skills)} required skills."
            )

            logger.info(
                "Returning existing PositionSkill records "
                "without calling ESCO or Gemini."
            )

            return existing_position_skills

        # ------------------------------------------
        # 3. Get Gemini API Key
        # ------------------------------------------

        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY environment variable is not configured."
            )

        # ------------------------------------------
        # 4. Fetch Raw Skills from ESCO
        # ------------------------------------------

        logger.info(
            f"Fetching ESCO skills for '{position.title}'"
        )

        esco_result = self.esco_service.get_role_skills(
            position.title
        )

        if not esco_result:
            raise ValueError(
                f"Could not retrieve ESCO data for "
                f"position '{position.title}'."
            )

        esco_skills = esco_result.get("skills")

        print(esco_skills)

        if not esco_skills:
            raise ValueError(
                f"ESCO returned no skills for "
                f"position '{position.title}'."
            )

        logger.info(
            f"ESCO returned "
            f"{len(esco_skills.get('essential', []))} essential "
            f"and "
            f"{len(esco_skills.get('optional', []))} optional skills."
        )

        # ------------------------------------------
        # 5. Send ESCO Skills to Gemini
        # ------------------------------------------

        logger.info(
            "Sending ESCO skills to Gemini for "
            "filtering and normalization."
        )

        perfect_profile = generate_perfect_profile(
            job_title=position.title,
            esco_skills=esco_skills,
            api_key=api_key,
        )

        if not perfect_profile:
            raise ValueError(
                f"Gemini failed to generate a perfect profile "
                f"for position '{position.title}'."
            )

        logger.info(
            f"Gemini generated "
            f"{len(perfect_profile.skills)} required skills."
        )

        # ------------------------------------------
        # 6. Convert Gemini Output → Database
        # ------------------------------------------

        created_position_skills = []

        for target_skill in perfect_profile.skills:

            skill_name = target_skill.name.strip()

            if not skill_name:
                continue

            # --------------------------------------
            # Find existing Skill
            # --------------------------------------

            skill = (
                db.query(Skill)
                .filter(
                    Skill.name.ilike(skill_name)
                )
                .first()
            )

            # --------------------------------------
            # Create Skill if it doesn't exist
            # --------------------------------------

            if not skill:

                logger.info(
                    f"Creating new Skill: '{skill_name}'"
                )

                skill = Skill(
                    name=skill_name
                )

                db.add(skill)
                db.flush()

            else:

                logger.info(
                    f"Using existing Skill: '{skill.name}'"
                )

            # --------------------------------------
            # Convert proficiency
            # --------------------------------------

            try:
                required_level = SkillLevel(
                    target_skill.target_proficiency
                )

            except ValueError:
                raise ValueError(
                    f"Invalid proficiency "
                    f"'{target_skill.target_proficiency}' "
                    f"for skill '{skill_name}'."
                )

            # --------------------------------------
            # Convert priority
            # --------------------------------------

            is_essential = (
                target_skill.priority == "Essential"
            )

            # --------------------------------------
            # Safety check against duplicates
            # --------------------------------------

            existing_position_skill = (
                db.query(PositionSkill)
                .filter(
                    PositionSkill.position_id == position_id,
                    PositionSkill.skill_id == skill.id,
                )
                .first()
            )

            if existing_position_skill:

                logger.warning(
                    f"PositionSkill already exists for "
                    f"position={position_id}, "
                    f"skill={skill.id}. Skipping."
                )

                continue

            # --------------------------------------
            # Create PositionSkill
            # --------------------------------------

            position_skill = PositionSkill(
                position_id=position_id,
                skill_id=skill.id,
                required_skill_level=required_level,
                is_essential=is_essential,
            )

            db.add(position_skill)

            created_position_skills.append(
                position_skill
            )

        # ------------------------------------------
        # 7. Make sure something was generated
        # ------------------------------------------

        if not created_position_skills:
            db.rollback()

            raise ValueError(
                f"Gemini did not produce any valid skills "
                f"for position '{position.title}'."
            )

        # ------------------------------------------
        # 8. Commit
        # ------------------------------------------

        try:

            db.commit()

        except Exception:

            db.rollback()

            logger.exception(
                "Failed to save PositionSkill records."
            )

            raise

        # ------------------------------------------
        # 9. Refresh records
        # ------------------------------------------

        for position_skill in created_position_skills:
            db.refresh(position_skill)

        logger.info(
            f"Successfully generated and saved "
            f"{len(created_position_skills)} skills "
            f"for position '{position.title}'."
        )

        return created_position_skills
