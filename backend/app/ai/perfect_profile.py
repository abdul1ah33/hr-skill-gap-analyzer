import os
import json
import logging
from typing import List, Dict, Literal, Optional
from pydantic import BaseModel, Field, ValidationError

# Depending on your environment, you might use python-dotenv
# Silently load .env if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from google import genai
from google.genai import types
from google.genai.errors import APIError

# ==========================================
# Logging Configuration
# ==========================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("PhaseB_PerfectProfile")

# SILENCE NOISY THIRD-PARTY LIBRARIES
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("google_genai").setLevel(logging.ERROR)

# ==========================================
# Pydantic Schemas for Strict JSON Output
# ==========================================
class TargetSkill(BaseModel):
    """Represents a normalized, filtered skill with inferred proficiency and priority."""
    name: str = Field(
        ..., 
        description="The normalized industry-standard name of the skill (e.g., 'Python', 'AWS', 'Node.js')."
    )
    target_proficiency: Literal["Beginner", "Intermediate", "Advanced"] = Field(
        ..., 
        description="The inferred required proficiency based strictly on the job title's seniority."
    )
    priority: Literal["Essential", "Optional"] = Field(
        ..., 
        description="Mapped from the input ESCO lists ('Essential' or 'Optional')."
    )


class PerfectProfile(BaseModel):
    """The root schema for the generated Perfect Candidate Profile."""
    position: str = Field(
        ..., 
        description="The normalized standard job title."
    )
    skills: List[TargetSkill] = Field(
        ..., 
        description="The aggressively filtered and normalized list of target skills."
    )


# ==========================================
# Core System Instruction Prompt
# ==========================================
SYSTEM_INSTRUCTION = """
You are an expert Staff AI Engineer and HR Data Specialist. Your objective is to process a list of raw ESCO skills and a job title, then output a strictly structured JSON representing the "Perfect Candidate Profile".

1. AGGRESSIVE FILTERING (NOISE REDUCTION)
   - ESCO data contains highly generic, non-differentiating skills (e.g., "use internet", "work in teams", "use computers", "communicate effectively").
   - REMOVE these generic skills immediately. Keep ONLY distinct hard skills, core technical tools, and high-value/domain-specific soft skills.

2. REDUNDANCY REMOVAL & NORMALIZATION
   - Translate academic or awkward ESCO phrasing into standard industry terms. (e.g., "use python programming" -> "Python", "manage databases" -> "SQL", "cloud computer services" -> "Cloud Computing").
   - Merge duplicate or highly similar skills into a single standardized name.
   - Standardize ALL skill names to industry norms. 
   - Examples: "NodeJS" -> "Node.js", "ReactJS" -> "React", "python3" -> "Python", "k8s" -> "Kubernetes".

3. PROFICIENCY INFERENCE (STRICT ENFORCEMENT)
   - Analyze the provided job_title (especially seniority markers like Junior, Mid, Senior, Lead, Staff).
   - Assign exactly ONE required proficiency level ("Beginner", "Intermediate", "Advanced") to each filtered skill.
   - Example: A "Senior Backend Engineer" requires "Advanced" System Design, but might only require "Beginner" AWS if AWS is an optional skill.

4. PRIORITY ASSIGNMENT
   - Look at the input JSON. Maintain the priority of the skill ("Essential" or "Optional") based on which list it originated from.

5. SKILL AUGMENTATION (ADD MISSING ESSENTIALS)
   - ESCO data is often incomplete. Identify if any absolute, industry-standard core skills are missing for the provided job_title.
   - ADD these missing mandatory skills to the output.
   - Assign them a priority of "Essential" and infer the correct target_proficiency based on the role's seniority.
"""


# ==========================================
# Main Processing Function
# ==========================================
def generate_perfect_profile(
    job_title: str,
    esco_skills: Dict[str, List[str]],
    api_key: str,
    model_name: str = "gemini-3.5-flash-lite"
) -> Optional[PerfectProfile]:
    """
    Takes a raw list of ESCO skills and a job title, filters out noise, normalizes terms,
    infers required proficiencies, and returns a strictly validated PerfectProfile.

    Args:
        job_title (str): The target job title (e.g., "Senior Machine Learning Engineer").
        esco_skills (Dict[str, List[str]]): Dictionary with 'essential' and 'optional' keys containing lists of skills.
        api_key (str): The Google Gemini API key.
        model_name (str): The specific Gemini model to use. Default is 'gemini-2.0-flash'.

    Returns:
        Optional[PerfectProfile]: A Pydantic model containing the parsed profile or None if processing fails.
    """
    logger.info(f"Initiating Perfect Profile generation for job title: '{job_title}'")
    
    # Validate the structure of the input dictionary defensively
    if not isinstance(esco_skills, dict) or "essential" not in esco_skills or "optional" not in esco_skills:
        logger.error("Invalid 'esco_skills' format. Expected a dictionary with 'essential' and 'optional' keys.")
        return None

    try:
        # Initialize Google Generative AI Client via the new architecture
        client = genai.Client(api_key=api_key)

        # Construct the user payload
        prompt = (
            f"Job Title: {job_title}\n\n"
            f"Raw ESCO Skills: {json.dumps(esco_skills, indent=2)}\n\n"
            f"Please generate the perfect candidate profile JSON following the system instructions."
        )

        logger.debug(f"Sending prompt to {model_name}...")
        
        # Initialize the Generative Model with our system instruction and execute LLM call
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1, # Low temperature for highly analytical/deterministic extraction
                response_mime_type="application/json",
                response_schema=PerfectProfile, # Forcing the model to map outputs exactly to our schema
                system_instruction=SYSTEM_INSTRUCTION
            )
        )

        # Verify if a response was successfully returned (handles safety filter blocks for better logging)
        try:
            if not response.text:
                logger.error("Received an empty response from the Gemini API.")
                return None
        except ValueError:
            logger.error("Response blocked by API safety filters or no candidates returned.")
            return None

        logger.info("Successfully received LLM response. Validating against Pydantic schema...")

        # Parse again and strictly validate the JSON response into our Pydantic model
        perfect_profile = PerfectProfile.model_validate_json(response.text)
        
        logger.info(f"Validation successful. Extracted {len(perfect_profile.skills)} normalized skills.")
        return perfect_profile

    # Exception handling for API errors specifically 
    except APIError as api_err:
        logger.error(f"Google API Error occurred during generation: {str(api_err)}")
        return None


    except ValidationError as val_err:
        logger.error(f"Pydantic Validation Error (LLM deviated from schema): {str(val_err)}")
        # Log the raw text to debug why it failed validation
        if 'response' in locals() and hasattr(response, 'text'):
            logger.debug(f"Raw LLM output prior to crash: {response.text}")
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred: {str(e)}")
        return None


# ==========================================
# Testing Execution Block
# ==========================================
if __name__ == "__main__":
    # Fetch API Key
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    if not GEMINI_API_KEY:
        logger.critical("GEMINI_API_KEY environment variable is not set. Please set it in your .env file.")
        exit(1)

    # 1. Define inputs representing realistic, noisy ESCO API outputs
    # target_job = "Senior Machine Learning Engineer"
    
    # raw_esco_data = {
    #     "essential": [
    #         "use internet", 
    #         "use python programming", 
    #         "work in teams", 
    #         "machine learning algorithms", 
    #         "deep learning frameworks",
    #         "communicate effectively",
    #         "mathematical modelling"
    #     ],
    #     "optional": [
    #         "use computers", 
    #         "cloud computer services", 
    #         "basic database management",
    #         "read documents",
    #         "containerization orchestration"
    #     ]
    # }

    target_job = 'Backend Software Engineer'

    raw_esco_data = {'essential': ['technical drawings', 'ICT debugging tools', 'interpret technical requirements', 'define technical requirements', 'project management', 'integrated development environment software', 'manage engineering project', 'engineering principles', 'use software libraries', 'create flowchart diagram', 'debug software', 'engineering processes', 'analyse software specifications', 'use software design patterns', 'provide technical documentation', 'tools for software configuration management', 'use technical drawing software', 'computer programming', 'perform scientific research', 'develop automated migration methods', 'identify customer requirements', 'develop software prototype', 'utilise computer-aided software engineering tools'], 'optional': ['Ruby (computer programming)', 'Scratch (computer programming)', 'design user interface', 'STAF', 'Java (computer programming)', 'Python (computer programming)', 'adapt to changes in technological development plans', 'Pascal (computer programming)', 'COBOL', 'Jenkins (tools for software configuration management)', 'migrate existing data', 'Lisp', 'Groovy', 'CoffeeScript', 'Ansible', 'Microsoft Visual C++', 'ASP.NET', 'PHP', 'utilise machine learning', 'Apache Maven', 'C#', 'Swift (computer programming)', 'Haskell', 'C++', 'use automatic programming', 'Visual Studio .NET', 'Xcode', 'Erlang', 'Assembly (computer programming)', 'use concurrent programming', 'Salt (tools for software configuration management)', 'AJAX', 'use functional programming', 'KDevelop', 'Eclipse (integrated development environment software)', 'use object-oriented programming', 'Scala', 'JavaScript', 'ICT security legislation', 'SAS language', 'Prolog (computer programming)', 'Common Lisp', 'ABAP', 'MATLAB', 'object-oriented modelling', 'R', 'integrate system components', 'ML (computer programming)', 'Objective-C', 'TypeScript', 'Smalltalk (computer programming)', 'use logic programming', 'software anomalies', 'APL', 'VBScript', 'OpenEdge Advanced Business Language', 'develop creative ideas', 'SAP R3', 'Puppet (tools for software configuration management)', 'World Wide Web Consortium standards', 'Internet of Things', 'Perl', 'collect customer feedback on applications']}

    # 2. Execute the function
    profile = generate_perfect_profile(
        job_title=target_job,
        esco_skills=raw_esco_data,
        api_key=GEMINI_API_KEY
    )

    # 3. Output results
    if profile:
        print("\n" + "="*50)
        print("🎉 SUCCESS! Generated Perfect Candidate Profile")
        print("="*50)
        # Use model_dump_json for beautifully formatted, schema-validated JSON printing
        print(profile.model_dump_json(indent=4))
    else:
        print("\n❌ Failed to generate the perfect profile. Check logs for details.")