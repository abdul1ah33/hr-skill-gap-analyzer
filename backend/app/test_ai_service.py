from __future__ import annotations

from services.esco_skills_extractor import EscoService

from ai.perfect_profile import generate_perfect_profile
import os


def btngan():

    # ------------------------------------------
    # 4. Fetch Raw Skills from ESCO
    # ------------------------------------------

    esco_service = EscoService()

    esco_result = esco_service.get_role_skills(
        "Backend Software Engineer"
    )

    if not esco_result:
        raise ValueError(
            f"Could not retrieve ESCO data for "
        )

    esco_skills = esco_result.get("skills")

    print(esco_skills)
    print("#" * 30)

    if not esco_skills:
        raise ValueError(
            f"ESCO returned no skills for "
        )


    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is not configured."
        )

    perfect_profile = generate_perfect_profile(
        job_title="Backend Software Engineer",
        esco_skills=esco_skills,
        api_key=api_key,
    )

    print(perfect_profile)


btngan()
