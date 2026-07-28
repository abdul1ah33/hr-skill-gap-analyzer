import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)
import json
from ollama_model import OllamaModel

class ResumeExtractor:
    def __init__(self, llm: OllamaModel):
        self.llm = llm

    def extract(self, resume_text: str):
        prompt = """
        You are an expert HR resume parser.

        Extract ONLY the following fields.

        Return VALID JSON.

        {{
            "first_name": "",
            "last_name": "",
            "email": "",
            "phone": "",
            "position": "",
            "skills": [],
            "years_experience": null,
            "education": [],
            "certifications": []
        }}

        Resume:

        {resume_text}
        """.format(resume_text=resume_text)

        response = self.llm.generate(prompt)

        return json.loads(response)