import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)
import json
from ai.agents.ollama_model import OllamaModel

class ResumeExtractor:
    def __init__(self, llm: OllamaModel):
        self.llm = llm

    def extract(self, resume_text: str):
        prompt = """
        You are an expert HR resume parser. Extract the following information from the resume and return ONLY valid JSON.

        CRITICAL - You MUST return ALL these fields in your JSON response:
        - first_name (extract from the name at the top of resume)
        - last_name (extract from the name at the top of resume)
        - email (extract email address)
        - phone (extract phone number)
        - position (extract exact job title/position from resume - look for terms like "Student", "Engineer", "Manager", "Developer", "Analyst", etc. in the resume text)
        - skills (array of skill names as strings)
        - years_experience (number or null)
        - education (array)
        - certifications (array)

        IMPORTANT for position field:
        - Look at the first few lines of the resume for job titles
        - Look for phrases like "Software Engineer", "Student", "Manager", "Developer"
        - If the person is a student, extract "Student" or their field of study as position
        - If no explicit job title is found, use the most relevant role mentioned

        If a field is not found in the resume, return empty string "" or null, but YOU MUST INCLUDE THE FIELD.

        Example format:
        {{
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "position": "Software Engineer",
            "skills": ["Python", "JavaScript"],
            "years_experience": 5,
            "education": ["BS Computer Science"],
            "certifications": ["AWS"]
        }}

        Resume text:
        {resume_text}
        """.format(resume_text=resume_text)

        response = self.llm.generate(prompt)

        return json.loads(response)