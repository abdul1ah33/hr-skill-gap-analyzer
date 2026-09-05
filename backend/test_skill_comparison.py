import json

from app.db.database import SessionLocal
from app.services.skill_comparison_service import SkillComparisonService


def main():
    employee_id = 13
    db = SessionLocal()

    try:

        # ==========================================
        # Create comparison service
        # ==========================================

        service = SkillComparisonService()

        result = service.compare_employee_to_position(
            db=db,
            employee_id=employee_id,
        )

        # ===========================s===============
        print("\n" + "=" * 60)
        print("PHASE C - SKILL COMPARISON RESULT")
        print("=" * 60)

        print(
            json.dumps(
                result,
                indent=4,
                ensure_ascii=False,
            )
        )

        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    main()