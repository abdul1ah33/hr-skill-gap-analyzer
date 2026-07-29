import json
from ai.agents.ollama_model import OllamaModel

class ResumeExtractor:
    def __init__(self, llm: OllamaModel):
        self.llm = llm

    def extract(self, resume_text: str):
        prompt = f"""
        You are an expert HR resume parser.

        Rules:

        - The candidate's full name is usually at the top of the resume.
        - Split the full name into first_name and last_name.
        - Example:
            "Ahmed Hassan"
            ->
            first_name = "Ahmed"
            last_name = "Hassan"

        - If there are more than two names:
            "Ahmed Mohamed Hassan"
            ->
            first_name = "Ahmed"
            last_name = "Hassan"

        - Never leave first_name null if a person's name exists.

        {resume_text}

        Return ONLY valid JSON.

        {{
            "first_name": "",
            "last_name": "",
            "email": "",
            "phone": "",
            "department": "",
            "position_title": "",

            "years_experience": 0,

            "skills": [
                {{
                    "name": "",
                    "level": "Beginner | Intermediate | Advanced | Expert"
                }}
            ],

            "education": [
                {{
                    "degree": "",
                    "institution": "",
                    "graduation_year": null
                }}
            ],

            "certifications": [
                {{
                    "name": "",
                    "issuer": ""
                }}
            ]
        }}

        If the department is not explicitly mentioned, infer it from the candidate's job title (e.g. HR Specialist → Human Resources).

        If information is missing, use null or an empty list.

        Return ONLY valid JSON.

        Rules:

        - Do not wrap JSON in markdown.
        - Do not explain anything.
        - Missing values must be null.
        - Skills level must be one of:
            Beginner
            Intermediate
            Advanced
            Expert
        """

        response = self.llm.generate(prompt)

        return json.loads(response)