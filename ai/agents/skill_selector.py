import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)
import json
import re

from ai.agents.ollama_model import OllamaModel


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
You are an expert HR consultant and occupational competency specialist.

Your task is to convert ESCO occupation skills into a practical hiring skill profile.

Occupation:
{occupation}

Essential ESCO Skills:
{json.dumps(essential_skills, indent=2)}

Optional ESCO Skills:
{json.dumps(optional_skills, indent=2)}

The ESCO skills are reference material only.

Do NOT simply copy ESCO skill names.

Instead, translate them into concrete, resume-friendly skills, tools, software, technologies, equipment, certifications, methods, or professional competencies that employers actually expect candidates to possess for this occupation.

The generated skills should be the kinds of skills a candidate would realistically list on a CV or resume.

Preserve the meaning of the original ESCO skills while making them more practical and industry-recognized.

Do NOT invent unrelated skills that are not relevant to the occupation.

Merge duplicate or overlapping skills.

Avoid vague or generic competencies unless they are essential to the occupation.

Prefer specific, industry-recognized names whenever possible.

Examples:

"computer programming"
→ Python
→ Java
→ C#

"office software"
→ Microsoft Excel
→ Microsoft Word

"financial management"
→ Financial Analysis
→ Budgeting
→ SAP FICO

"recruit personnel"
→ Talent Acquisition
→ Interviewing
→ Applicant Tracking Systems (ATS)

"design engineering components"
→ AutoCAD
→ SolidWorks

Rules:

- Return between 10 and 15 skills.
- Every skill must be directly relevant to the occupation.
- Every skill must have:
    - name
    - category
    - importance (1-10)
    - required_level (0-100)
    - is_essential
    - short_description
- Higher importance means the skill is more critical to performing the job.
- Higher required_level means greater proficiency is expected.
- Preserve whether the selected skill originated from an essential or optional ESCO skill.
- Return ONLY one valid JSON object.
- Do NOT include markdown.
- Do NOT include explanations.
- Do NOT include comments.
- Do NOT include any text before or after the JSON.

Return exactly this format:

{{
  "skills": [
    {{
      "name": "",
      "category": "",
      "importance": 10,
      "required_level": 90,
      "is_essential": true,
      "short_description": ""
    }}
  ]
}}
"""

        response = self.llm.generate(prompt)

        print("\n================ RAW RESPONSE ================\n")
        print(response)
        print("\n==============================================\n")

        return self._extract_json(response)