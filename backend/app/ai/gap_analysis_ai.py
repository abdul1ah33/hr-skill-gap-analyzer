import os
import json
import logging
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ValidationError

# Modern Google GenAI SDK
from google import genai
from google.genai import types
from google.genai.errors import APIError

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s"
)
logger = logging.getLogger(__name__)

# SILENCE NOISY THIRD-PARTY LIBRARIES
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("google_genai").setLevel(logging.ERROR)

# -----------------------------------------------------------------------------
# Pydantic Schemas for Output Enforcement
# -----------------------------------------------------------------------------
class UpskillRecommendation(BaseModel):
    skill: str = Field(..., description="Name of the skill.")
    gap_type: Literal["Needs Improvement", "Unmatched"] = Field(..., description="Categorization of the gap.")
    priority: Literal["Essential", "Optional"] = Field(..., description="Priority extracted directly from the input.")
    tactical_steps: List[str] = Field(
        ..., 
        description="Exactly 3 simple, bite-sized, highly actionable steps to bridge the specific gap."
    )
    estimated_timeline: str = Field(
        ..., 
        description="Realistic time required to bridge this gap (e.g., '2-4 weeks', '3-6 months')."
    )
    suggested_resources: List[str] = Field(
        ..., 
        description="Specific types of resources or real-world platforms (e.g., 'Coursera course on X', 'Internal mentorship', 'Build a CRUD app')."
    )


class BonusSkillAnalysis(BaseModel):
    skill: str = Field(
        ..., 
        description="Name of the additional skill."
    )
    is_relevant: bool = Field(
        ..., 
        description="True if it provides cross-functional value to the target role."
    )
    leverage_evaluation: str = Field(
        ..., 
        description="1 sentence explaining how this helps or why it's irrelevant."
    )


class GapAnalysisReport(BaseModel):
    readiness_score: int = Field(
        ..., 
        ge=0, 
        le=100, 
        description="0-100 percentage score (Heavily penalize missing Essentials; slightly penalize missing Optionals; slightly boost for relevant Additional skills)."
    )
    readiness_status: Literal["Ready", "Needs Upskilling", "Not a Fit"] = Field(
        ..., 
        description="Derived from the score."
    )
    managerial_summary: str = Field(
        ..., 
        description="2-3 sentence executive summary."
    )
    upskill_pathways: List[UpskillRecommendation] = Field(
        default_factory=list,
        description="Actionable steps for upskilling."
    )
    bonus_skills_analysis: List[BonusSkillAnalysis] = Field(
        default_factory=list,
        description="Analysis of the candidate's additional skills."
    )
    core_strengths: List[str] = Field(
        default_factory=list,
        description="2-3 bullet points summarizing the candidate's strongest matching skills and how they anchor the employee in this new role."
    )

# -----------------------------------------------------------------------------
# Constants & Configuration
# -----------------------------------------------------------------------------
SYSTEM_INSTRUCTION = """You are an elite Executive HR AI and Technical Manager. Your job is to analyze a pre-computed skill gap between an employee and a target job role.
You will output a strictly structured JSON report.

CRITICAL RULES:
1. UNDERSTAND THE DELTA & KEEP IT ACTIONABLE: Moving from "Beginner" to "Intermediate" requires different steps than "Null" to "Beginner". Your `tactical_steps` MUST be a list of 3 simple, bite-sized actions. Do not use corporate fluff. Give exact, practical instructions (e.g., "Build a microservice using X", "Shadow a senior engineer on Y").
2. RESPECT PRIORITY: A gap in an "Essential" skill is a critical blocker. A gap in an "Optional" skill is a minor nice-to-have. Your `readiness_score` and `managerial_summary` MUST heavily weigh Essential gaps as red flags, while treating Optional gaps as minor considerations.
3. EXECUTIVE SUMMARY: The `managerial_summary` must be exactly 2-3 sentences. It must be objective, highlighting the biggest Essential gaps or praising a strong match. Do not fluff.
4. BONUS SKILLS: Evaluate `additional_skills`. If a backend developer has "React", that's a cross-functional bonus (Fullstack potential). Expand on how the organization could use the bonus skills to their advantage. If they have "Carpentry", it is irrelevant. Flag `is_relevant` accordingly.
5. COMPREHENSIVE READINESS SCORE RUBRIC (0-100):
   Do not use cumulative math (subtraction). Instead, determine the score by holistically evaluating the candidate's profile against these specific tier thresholds. Evaluate gap severity based on this scale: Null -> Beginner -> Intermediate -> Advanced.
   - SEVERITY OF GAPS: 
     * 1-Tier Gap (e.g., Intermediate to Advanced): Minor hurdle.
     * 2-Tier Gap (e.g., Beginner to Advanced): Moderate hurdle. Reward the employee for having foundational knowledge (Beginner) over being completely Unmatched (Null).
     * 3-Tier Gap / Unmatched Essential (Null): Major hurdle.
   - SENIORITY CONTEXT: Weigh the severity of gaps against the provided Target Job Title. A 1-tier gap in an Essential skill for a "Senior" role is a bigger risk than the same gap for a junior/mid-level role.
   - SCORE ANCHORS (Categorize first, then pick a number in the range):
     * 90-100 (Ready): All Essential skills are matched, or at most 1-2 Essential skills have only a 1-tier gap. Minor Optional gaps are allowed.
     * 75-89 (Needs Minor Upskilling): The core foundation is solid. Several Essential skills might have a 1-tier gap, or 1 Essential skill has a 2-tier gap. NO Essential skill is completely Unmatched (Null).
     * 55-74 (Needs Major Upskilling): Employee has basic capabilities but needs significant training. 1 or 2 Essential skills are Unmatched (Null), OR several have 2-tier gaps. 
     * 35-54 (High Risk): The majority of Essential skills have 2-tier gaps or are Unmatched. The employee lacks the core foundation for this role.
     * <35 (Not a Fit): Almost no matched skills. 
   - RELEVANT BONUS SKILLS: After determining the base score using the anchors above, you may add +2 to +5 points for highly relevant `additional_skills` ONLY IF the base score is >= 70. Do not use additional skills to artificially inflate a failing candidate.
6. TIMELINES & GLOBALLY RECOGNIZED RESOURCES: Be highly realistic with the `estimated_timeline`. For `suggested_resources`, you MUST recommend globally recognized, domain-specific platforms, official certifications, or industry-standard books (e.g., "AWS Certified Solutions Architect Official Study Guide", "Coursera DeepLearning.AI by Andrew Ng", "O'Reilly's Designing Data-Intensive Applications"). Avoid generic terms like "online tutorials".
7. STRENGTHS: Synthesize the employee's `matched` skills into 2-3 `core_strengths` that prove they have a solid foundation for this role.
8. UPSKILL PATHWAYS ORDERING: Output all gaps provided in the input, prioritizing "Essential" skills first, then "Optional". If there are many gaps, output a maximum of 8. NEVER hallucinate or invent skills that are not explicitly present in the `needs_improvement` or `unmatched` input arrays."""

'''RESPECT PRIORITY: A gap in an "Essential" skill is a critical blocker. A gap in an "Optional" skill is a minor nice-to-have. Your readiness_score and managerial_summary MUST heavily weigh'''
# LLM model version
TARGET_MODEL = "gemini-3.5-flash-lite"


# -----------------------------------------------------------------------------
# Core Microservice Function
# -----------------------------------------------------------------------------
def generate_gap_report(job_title: str, skill_diff: dict, api_key: str) -> Optional[dict]:
    """
    Generates a structured, actionable gap analysis report using Gemini.

    Args:
        job_title (str): The target job title being analyzed.
        skill_diff (dict): A pre-computed JSON dictionary of skill differences.
        api_key (str): The Google Generative AI API Key.

    Returns:
        Optional[dict]: A validated dictionary conforming to the GapAnalysisReport 
                        schema, or None if the process fails.
    """
    logger.info(f"Initiating gap analysis generation for target role: '{job_title}'")
    
    # Initialize the modern SDK Client
    client = genai.Client(api_key=api_key)

    # Format the Prompt payload
    prompt = (
        f"Target Job Title: {job_title}\n\n"
        f"Pre-computed Skill Diff Data:\n{json.dumps(skill_diff, indent=2)}\n\n"
        "Please generate the Gap Analysis Report based strictly on the provided schema."
    )

    # Configure the payload parameters and enforce structured output natively
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.1,  # Low temperature for analytical consistency
        response_mime_type="application/json",
        response_schema=GapAnalysisReport
    )

    try:
        # Call the API
        response = client.models.generate_content(
            model=TARGET_MODEL,
            contents=prompt,
            config=config
        )

        response_text = response.text
        if not response_text:
            logger.error("Received an empty response body from Gemini.")
            return None

        # Parse the JSON response
        parsed_data = json.loads(response_text)

        # Validate strongly typed schemas via Pydantic model_validate
        validated_report = GapAnalysisReport.model_validate(parsed_data)
        
        logger.info("Successfully generated and validated the Gap Analysis Report.")
        return validated_report.model_dump()

    except APIError as e:
        logger.error(f"Gemini API Exception occurred: {e}", exc_info=True)
        return None
    except ValidationError as e:
        logger.error(f"Pydantic Validation failed due to Schema mismatch: {e}", exc_info=True)
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Failed to decode the response as valid JSON: {e}\nRaw output: {response.text}")
        return None
    except Exception as e:
        logger.error(f"An unexpected system error occurred: {e}", exc_info=True)
        return None


# -----------------------------------------------------------------------------
# Execution & Testing Block
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    # Ensure standard, valid output without Markdown wrappers in standard output
    
    # Dummy test payload injected matching Phase B's output requirements
    dummy_job_title = "Senior Data Scientist"
    dummy_skill_diff = {
      "matched": [
        {"skill": "Python", "employee_level": "Advanced", "required_level": "Advanced", "priority": "Essential"}
      ],
      "needs_improvement": [
        {"skill": "Machine Learning", "employee_level": "Intermediate", "required_level": "Advanced", "priority": "Essential"},
        {"skill": "SQL", "employee_level": "Beginner", "required_level": "Intermediate", "priority": "Optional"}
      ],
      "unmatched": [
        {"skill": "AWS", "employee_level": None, "required_level": "Intermediate", "priority": "Optional"}
      ],
      "additional_skills": [
        {"skill": "React", "employee_level": "Advanced"},
        {"skill": "Carpentry", "employee_level": "Beginner"}
      ]
    }

    # Extract API key safely from environment variables
    test_api_key = os.environ.get("GEMINI_API_KEY")

    if not test_api_key:
        logger.warning("GEMINI_API_KEY environment variable not set. Please set it to test the live API.")
        logger.info("Printing expected structure format instead...\n")
        # Just instantiate empty mock to show structure working without an API key
        print(json.dumps({
            "error": "Missing GEMINI_API_KEY. Set environment variable to execute live test."
        }, indent=2))
    else:
        # Generate the report
        report_output = generate_gap_report(
            job_title=dummy_job_title,
            skill_diff=dummy_skill_diff,
            api_key=test_api_key
        )

        if report_output:
            # Print the clean json payload (no markdown block wrapper)
            print(json.dumps(report_output, indent=2))
        else:
            print(json.dumps({"error": "Failed to generate report. Check logs for details."}, indent=2))