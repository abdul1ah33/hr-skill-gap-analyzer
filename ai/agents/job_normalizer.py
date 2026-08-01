import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

import json
from ai.agents.ollama_model import OllamaModel


class OccupationNormalizer:

    def __init__(self):
        self.llm = OllamaModel()

    def normalize(self, role: str):

        prompt = f"""
You are an expert in international occupation classification.

Your task is ONLY to normalize job titles.

Convert the following company job title into the closest internationally recognized occupation.

Return ONLY JSON.

Example:

{{
    "original_title":"Senior Backend Python Engineer",
    "normalized_title":"Software Developer",
    "confidence":0.95
}}

Job Title:

{role}
"""

        response = self.llm.generate(prompt)

        return json.loads(response)