import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)
import json
import re

from agents.ollama_model import OllamaModel


class SkillSelector:

    def __init__(self):
        self.llm = OllamaModel()

    def _extract_json(self, text: str):
        """
        Extract the first valid JSON object from the model response.
        """

        # Try parsing directly first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Otherwise extract the JSON block
        match = re.search(r"\{.*\}", text, re.DOTALL)

        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        print("\n========== INVALID MODEL RESPONSE ==========\n")
        print(text)
        print("\n============================================\n")

        return {"skills": []}

    def select_skills(
        self,
        occupation,
        essential_skills,
        optional_skills
    ):

        prompt = f"""
You are an expert HR competency specialist.

Your task is to build a competency profile for the occupation below.

Occupation:
{occupation}

Essential Skills:
{json.dumps(essential_skills, indent=2)}

Optional Skills:
{json.dumps(optional_skills, indent=2)}

Rules:

- Choose ONLY the most important skills.
- Merge duplicate or very similar skills.
- Remove generic, vague, or administrative skills.
- Remove skills that are too niche.
- Return between 10 and 15 skills.
- Prioritize technical and business-critical competencies.

For EACH skill include:

- name
- category
- importance (1-10)
- required_level (0-100)
- is_essential (true if selected from Essential Skills, false if selected from Optional Skills)
- short_description

Return ONLY ONE valid JSON object.

DO NOT include:

- Markdown
- ```json
- explanations
- comments
- notes
- text before the JSON
- text after the JSON

The first character MUST be {{
The last character MUST be }}

Example:

{{
  "skills": [
    {{
        "name": "Python",
        "category": "Programming",
        "importance": 10,
        "required_level": 90,
        "is_essential": true,
        "short_description": "Develop backend software using Python."
    }},
    {{
        "name": "Docker",
        "category": "DevOps",
        "importance": 6,
        "required_level": 60,
        "is_essential": false,
        "short_description": "..."
    }}
  ]
}}
"""

        response = self.llm.generate(prompt)

        print("\n================ RAW RESPONSE ================\n")
        print(response)
        print("\n==============================================\n")

        return self._extract_json(response)