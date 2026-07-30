import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)
import json
from ollama_model import OllamaModel

class Assess():
    def __init__(self, llm: OllamaModel):
            self.llm = llm

    def assess(self, matched, missing, needs_improvement, employee_skills):
        prompt = f"""
            You are a senior HR consultant.

            The skill comparison has ALREADY been completed.
            Do NOT recalculate, infer, or modify any of the analysis.
            Use ONLY the information below.

            Employee:
            Name: {employee_skills["Name"]}
            Position: {employee_skills["Position"]}

            Matched Skills:
            {matched}

            Missing Skills:
            {missing}

            Skills Needing Improvement:
            {needs_improvement}

            Write a professional employee assessment.

            Use the following sections exactly:

            ## Skill Assessment
            Provide a brief summary of the employee's readiness.

            ## Strengths
            Mention the matched skills.

            ## Skill Gaps
            Discuss the missing skills and why they matter.

            ## Development Areas
            Discuss the skills needing improvement, mentioning the current and required levels.

            ## Training Priorities
            Rank the top priorities.

            ## Recommended Learning Plan
            For each priority include:
            - Suggested training
            - Estimated duration
            - Expected outcome

            ## Final Recommendation
            Provide a concise HR recommendation.

            Return ONLY valid JSON in the following format:

            {{
                "Skill Assessment": "",
                "Strengths": "",
                "Skill Gaps": "",
                "Development Areas": "",
                "Training Priorities": [],
                "Recommended Learning Plan": [
                    {{
                        "Suggested training": "",
                        "Estimated duration": "",
                        "Expected outcome": ""
                    }}
                ],
                "Final Recommendation": ""
            }}
            """

        response = self.llm.generate(prompt)

        return json.loads(response)