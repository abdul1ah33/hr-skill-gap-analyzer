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
# Deployment (one backend per client)
# ==========================================
# Frontend origins allowed to call the API, comma-separated
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

# Log every SQL query (development only)
DB_ECHO = os.getenv("DB_ECHO", "false").lower() == "true"

# Kept small so many client backends fit within PostgreSQL's
# max_connections (plan §3.4)
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "2"))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "3"))

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

# A session not seen for this long (no heartbeat or answer) can be taken over
# by another device or user (plan §A.5)
ASSESSMENT_SESSION_TIMEOUT_SECONDS = int(os.getenv("ASSESSMENT_SESSION_TIMEOUT_SECONDS", "60"))
