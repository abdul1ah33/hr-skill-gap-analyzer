import os
import json
import logging
# import google.generativeai as genai
# from google.api_core.exceptions import GoogleAPIError
from google import genai
from pydantic import BaseModel, Field, ValidationError
from typing import Literal, Optional, List

# -------------------------------------------------------------------------
# Logging Setup
# -------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO, 
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# -------------------------------------------------------------------------
# Pydantic Schema Definition
# -------------------------------------------------------------------------
class Skill(BaseModel):
    """Schema for individual skills to enforce strict normalization and grading."""
    name: str = Field(description="The normalized name of the skill (e.g., 'Node.js', 'Python').")
    proficiency: Literal["Beginner", "Intermediate", "Advanced"] = Field(
        description="Strictly graded proficiency level based on the rubric."
    )

class CandidateProfile(BaseModel):
    """
    Strict schema enforcement for the Candidate Profile.
    Defaults are intentionally OMITTED because the Gemini API schema 
    translation does not support 'default' or 'default_factory'.
    """
    first_name: Optional[str] = Field(description="Candidate's first name, or null if missing")
    last_name: Optional[str] = Field(description="Candidate's last name, or null if missing")
    email: Optional[str] = Field(description="Candidate's email address, or null if missing")
    phone: Optional[str] = Field(description="Candidate's phone number, or null if missing")
    position: Optional[str] = Field(description="Inferred current or target job title, or null if missing")
    years_experience: Optional[int] = Field(description="Calculated total years of professional experience, or null")
    education: List[str] = Field(description="List of education degrees and institutions. Empty list if none.")
    certifications: List[str] = Field(description="List of certifications. Empty list if none.")
    skills: List[Skill] = Field(
        description="List of extracted skills, containing their normalized names and proficiency levels."
    )

# -------------------------------------------------------------------------
# Core Logic
# -------------------------------------------------------------------------
def parse_resume(raw_text: str, api_key: str, model_name: str = "gemini-3.5-flash-lite") -> dict:
    """
    Parses raw resume text using Gemini Pro, extracts and normalizes skills, 
    and rates them against a strict proficiency rubric for consistency.
    
    Args:
        raw_text (str): The raw text extracted from the candidate's resume.
        api_key (str): Google Gemini API Key.
        model_name (str): The Gemini model to use.
        
    Returns:
        dict: A strictly formatted dictionary matching the CandidateProfile schema.
    """
    # 1. Initialize API Client
    client = genai.Client(api_key=api_key)
    # genai.configure(api_key=api_key, transport="rest")


    # 2. Craft the System Instruction 
    system_instruction = """
    You are an expert Staff AI Engineer and HR Data Specialist. 
    Your objective is to parse raw resume text and output a strictly structured JSON object profiling the candidate.

    # 1. SKILL EXTRACTION (CRITICAL)
    - Extract EXPLICIT skills directly mentioned (both Hard/Technical and Soft Skills).
    - Infer IMPLICIT skills. For example, if the resume mentions "Built backend with Express", you MUST infer and list "Express.js", "Node.js", and "REST APIs".
    - Extract BOTH Technical Skills (e.g., Python, Docker) and Soft Skills (e.g., Leadership, Agile, Communication).

    # 2. SKILL NORMALIZATION
    - Standardize ALL skill names to industry norms. 
    - Examples: "NodeJS" -> "Node.js", "ReactJS" -> "React", "python3" -> "Python", "k8s" -> "Kubernetes".
    - Do not output duplicate skills. Combine them under the normalized name.

    # 3. PROFICIENCY RUBRIC (STRICT ENFORCEMENT)
    You MUST assign exactly ONE of the following proficiency levels to every extracted skill. 
    Do not guess. Look at the context of the resume:
    - "Beginner": The skill is mentioned academically, listed without project context, or candidate has < 1 year of applied experience.
    - "Intermediate": The skill was applied in professional projects with hands-on experience for 1 to 3 years.
    - "Advanced": The candidate led projects using this skill, designed architecture, mentored others, or has > 3 years of continuous applied experience.

    # 4. EXPERIENCE & POSITION
    - `years_experience`: Calculate the absolute total years of professional experience by analyzing all work history date ranges.
    - `position`: Infer the candidate's overarching current or target job title based on their most recent role or summary.

    OUTPUT FORMAT REQUIREMENTS:
    - You must output strictly valid JSON matching the requested schema. 
    - ALL fields are required in the final JSON. If data is missing for a field, output `null` for strings/integers, or an empty array `[]` for lists. DO NOT omit the key entirely.
    - Absolutely no markdown formatting, no conversational text, and no explanations.
    """

    # 3. Instantiate the Model
    # try:
    #     model = genai.GenerativeModel(
    #         model_name=model_name,
    #         system_instruction=system_instruction
    #     )
    # except Exception as e:
    #     logger.error(f"Failed to instantiate Gemini model: {e}")
    #     raise

    # 4. Define Generation Configuration for JSON Enforcement
    # generation_config = genai.GenerationConfig(
    #     response_mime_type="application/json",
    #     response_schema=CandidateProfile,
    #     temperature=0.1,  # Low temperature for highly analytical/deterministic extraction so we don't face mismatching issues in later phases
    #     top_p=0.8
    # )

    generation_config = {
        "response_mime_type": "application/json",
        "response_schema": CandidateProfile,
        "temperature": 0.1,
        "top_p": 0.8,
    }

    # 5. Execute API Call
    try:
        logger.info(
            f"Sending raw resume text ({len(raw_text)} chars) to {model_name}..."
        )

        response = client.models.generate_content(
            model=model_name,
            contents=raw_text,
            config={
                "system_instruction": system_instruction,
                **generation_config,
            },
        )

        raw_json_output = response.text

        if not raw_json_output:
            raise ValueError("Received empty response from the Gemini API.")

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise

    # 6. Parse and Validate Output via Pydantic
    try:
        # We validate the raw JSON string directly against our strict Pydantic model.
        # This guarantees the structure before it reaches downstream components.
        validated_profile = CandidateProfile.model_validate_json(raw_json_output)

        # Return as a native Python dictionary
        return validated_profile.model_dump()
        
    except ValidationError as val_err:
        logger.error("The LLM output violated the strict JSON schema requirements.")
        logger.error(f"Raw Output: {raw_json_output}")
        raise ValueError(f"Schema Validation Error: {val_err}")
    except json.JSONDecodeError as json_err:
        logger.error(f"Failed to decode LLM output as JSON. Raw Output: {raw_json_output}")
        raise ValueError(f"JSON Decode Error: {json_err}")


# -------------------------------------------------------------------------
# Execution / Testing Block
# -------------------------------------------------------------------------
if __name__ == "__main__":
    # SECURITY WARNING: I have the key in a separate .env file and not hardcoded here. Do not hardcode it in production code.
    # If you want to test you can uncomment the line below and set your API key directly here for testing purposes but I don't think you would need to.
    # You will be using the same .env file in your backend logic so you can just set the environment variable there and it will work seamlessly.
    # API_KEY = ""
    # We are pulling this from the environment variable. 
    API_KEY = os.getenv("GEMINI_API_KEY") 
    
    # Example Dummy Resume (Simulating a raw text dump from a PDF) 
    # Replace this with actual resumes text if you want to test yourself with different input. Even try your own CV 😂👌. I tried mine and worked perfectly! Just dont leave in weird characters!
    ######  You Don't need to modify the code here as this only runs if this file is the main entry point but you will be using it as a microservice or a module inside your backend logic ######
    dummy_resume = """
    John Doe
    john.doe@email.com | 555-123-4567
    
    Professional Summary:
    Passionate engineer with a strong track record of leading teams and designing robust cloud architectures.
    
    Education: 
    B.S. Computer Science, University of Technology (2018)
    
    Certifications: 
    AWS Certified Solutions Architect (2022)
    
    Experience:
    Backend Engineering Lead - TechCorp (Jan 2020 - Present)
    - Built highly scalable backend microservices with Express.
    - Led a team of 4 engineers to rebuild the payments gateway.
    - Designed scalable infrastructure using AWS and Kubernetes.
    - Maintained legacy data processing pipelines written in python3.
    
    Junior Web Developer - StartUp Inc (Jun 2018 - Dec 2019)
    - Wrote functional frontend components using ReactJS and Redux.
    - Assisted senior engineers in migrating the database to PostgreSQL.
    - Mentioned Agile methodologies during daily standups.
    """

    if not API_KEY:
        logger.error("GEMINI_API_KEY environment variable not found. Please set it before running.")
    else:
        logger.info("Starting extraction process...")
        try:
            result = parse_resume(raw_text=dummy_resume, api_key=API_KEY)
            
            logger.info("Extraction successful! Parsed Output:")
            print(json.dumps(result, indent=2))
        except Exception as e:
            logger.error(f"Process failed: {e}")