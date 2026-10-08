"""
Generates assessment questions for one skill and one proficiency level with
Gemini. Output follows the question-bank format (see
app/schemas/question_bank.py) and is validated strictly; invalid questions
are dropped and the missing ones are requested again.
"""
import logging
import time
from typing import List, Literal

from pydantic import BaseModel, Field, ValidationError

from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.schemas.question_bank import BankQuestion, normalize_text

logger = logging.getLogger(__name__)

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("google_genai").setLevel(logging.ERROR)

DEFAULT_MODEL = "gemini-3.5-flash-lite"

# Reject questions whose correct option is clearly longer than every other
# option; test-takers learn to pick the longest answer
MAX_CORRECT_LENGTH_RATIO = 1.15


# ==========================================
# Response schema (loose; strict checks happen in BankQuestion)
# ==========================================
class GeneratedOption(BaseModel):
    text: str
    type: Literal[
        "correct",
        "near_miss",
        "misconception",
        "plausible_wrong_1",
        "plausible_wrong_2",
        "plausible_wrong_3",
    ]
    explanation: str


class GeneratedQuestion(BaseModel):
    question_text: str
    options: List[GeneratedOption] = Field(
        ..., description="Exactly 6 options, one of each type."
    )


class GeneratedQuestionSet(BaseModel):
    questions: List[GeneratedQuestion]


# ==========================================
# Errors
# ==========================================
class QuotaExhaustedError(Exception):
    """Gemini refused the request because a rate or daily quota was reached."""


# ==========================================
# Prompt
# ==========================================
SYSTEM_INSTRUCTION = """
You are an expert assessment designer writing multiple-choice questions that measure an employee's real proficiency in a workplace skill.

Proficiency levels:
- Beginner: core concepts, terminology and basic everyday tasks.
- Intermediate: applying the skill to realistic work situations, choosing between approaches, common pitfalls.
- Advanced: complex scenarios, trade-offs, optimisation, edge cases, and decisions an experienced practitioner makes.

Every question MUST:
- Be self-contained and answerable without external material. Prefer short realistic scenarios over pure definitions.
- Match the requested proficiency level.
- Have exactly 6 options, one of EACH type:
  * correct: the single best answer. It must be unambiguously correct.
  * near_miss: almost right but wrong in one important detail.
  * misconception: reflects a common misunderstanding of the skill.
  * plausible_wrong_1, plausible_wrong_2, plausible_wrong_3: believable but wrong.
- Have options of similar length and style, so the correct one is not obvious from its form. The correct option must NOT be the longest; make the near_miss and misconception options at least as long and as detailed.
- Never use "all of the above", "none of the above", or refer to option letters or positions.
- Give every option a one- or two-sentence explanation of why it is right or wrong.
- Be different from every other question in the set and from the questions listed as already used.
"""


def _build_prompt(skill_name: str, level: str, count: int, avoid: list[str]) -> str:
    prompt = (
        f"Skill: {skill_name}\n"
        f"Proficiency level: {level}\n"
        f"Write exactly {count} distinct questions for this skill at this level."
    )
    if avoid:
        listed = "\n".join(f"- {text}" for text in avoid)
        prompt += f"\n\nQuestions already used (do not repeat or paraphrase them):\n{listed}"
    return prompt


def _correct_is_obviously_longest(question: BankQuestion) -> bool:
    correct = next(len(o.text) for o in question.options if o.type == "correct")
    longest_other = max(len(o.text) for o in question.options if o.type != "correct")
    return correct > longest_other * MAX_CORRECT_LENGTH_RATIO


def _is_quota_error(err: APIError) -> bool:
    return getattr(err, "code", None) == 429 or "RESOURCE_EXHAUSTED" in str(err)


# ==========================================
# Main function
# ==========================================
def generate_level_questions(
    client: genai.Client,
    skill_name: str,
    level: Literal["Beginner", "Intermediate", "Advanced"],
    count: int,
    avoid_texts: list[str] | None = None,
    model_name: str = DEFAULT_MODEL,
    max_attempts: int = 3,
    rate_limit_wait_seconds: int = 60,
) -> tuple[list[dict], list[str]]:
    """
    Returns (valid_questions, rejection_reasons).

    valid_questions are dicts in the question-bank format, at most `count`.
    Raises QuotaExhaustedError when Gemini keeps refusing because of quota.
    """
    accepted: list[dict] = []
    rejections: list[str] = []
    seen = {normalize_text(t) for t in (avoid_texts or [])}
    rate_limit_retries = 0

    attempt = 0
    while len(accepted) < count and attempt < max_attempts:
        attempt += 1
        missing = count - len(accepted)
        avoid = list(avoid_texts or []) + [q["question_text"] for q in accepted]

        try:
            response = client.models.generate_content(
                model=model_name,
                contents=_build_prompt(skill_name, level, missing, avoid),
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    response_mime_type="application/json",
                    response_schema=GeneratedQuestionSet,
                    system_instruction=SYSTEM_INSTRUCTION,
                ),
            )
        except APIError as err:
            if not _is_quota_error(err):
                raise
            # Per-minute limits recover; a daily limit keeps failing.
            if rate_limit_retries >= 2:
                raise QuotaExhaustedError(str(err)) from err
            rate_limit_retries += 1
            attempt -= 1
            logger.warning(
                "Rate limited; waiting %ss before retrying (%s)",
                rate_limit_wait_seconds,
                err,
            )
            time.sleep(rate_limit_wait_seconds)
            continue

        try:
            generated = GeneratedQuestionSet.model_validate_json(response.text or "")
        except (ValidationError, ValueError) as err:
            rejections.append(f"attempt {attempt}: unparseable response ({err})")
            continue

        for item in generated.questions:
            if len(accepted) >= count:
                break
            try:
                question = BankQuestion(
                    question_text=item.question_text,
                    proficiency_level=level,
                    options=[option.model_dump() for option in item.options],
                )
            except ValidationError as err:
                rejections.append(
                    f"{item.question_text[:80]!r}: {err.errors()[0]['msg']}"
                )
                continue

            if _correct_is_obviously_longest(question):
                rejections.append(f"{item.question_text[:80]!r}: correct option is much longer than the others")
                continue

            key = normalize_text(question.question_text)
            if key in seen:
                rejections.append(f"{item.question_text[:80]!r}: duplicate question")
                continue

            seen.add(key)
            accepted.append(question.model_dump())

    return accepted, rejections
