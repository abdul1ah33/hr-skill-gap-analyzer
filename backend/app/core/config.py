from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

SECRET_KEY = os.getenv("SECRET_KEY")

ALGORITHM = os.getenv("ALGORITHM")

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ==========================================
# Skill assessments
# ==========================================
# Maximum number of skills tested in one assessment (5 questions each)
ASSESSMENT_MAX_SKILLS = int(os.getenv("ASSESSMENT_MAX_SKILLS", "8"))

# Time allowed per question; the server deadline is
# questions x seconds + grace (plan D15)
ASSESSMENT_SECONDS_PER_QUESTION = int(os.getenv("ASSESSMENT_SECONDS_PER_QUESTION", "60"))
ASSESSMENT_GRACE_SECONDS = int(os.getenv("ASSESSMENT_GRACE_SECONDS", "120"))

# Tab switches / fullscreen exits allowed before the attempt is terminated
ASSESSMENT_MAX_VIOLATIONS = int(os.getenv("ASSESSMENT_MAX_VIOLATIONS", "3"))
