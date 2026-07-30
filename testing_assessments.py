from ai.agents.assessment import Assess
from ai.agents.ollama_model import OllamaModel

model = OllamaModel()
assessor = Assess(model)

employee_ex = {
    "Name" : "Ahmed",
    "Position" : "Pilot",
    "Skills" : {"perform risk analysis" : "Advanced",
                "operate cockpit control panels" : "Beginner",
                "visual flight rules" : "Beginner",
                "follow airport safety procedures" : "Beginner"}
}

required_ex = {
    "Skills" : {"follow airport safety procedures" : "Advanced",
        "visual flight rules" : "Intermediate",
        "operate cockpit control panels": "Advanced",
        "perform risk analysis" : "Intermediate",
        "perform take off and landing" : "Advanced"}
}

levels = {
    "Beginner": 0,
    "Intermediate": 1,
    "Advanced": 2
}

matched = []
missing = []
needs_improvement = []

for skill, req_level in required_ex["Skills"].items():
    emp_level = employee_ex["Skills"].get(skill)

    if emp_level is None:
        missing.append({
            "skill": skill,
            "required": req_level
        })
    elif levels[emp_level] < levels[req_level]:
        needs_improvement.append({
            "skill": skill,
            "current": emp_level,
            "required": req_level
        })
    else:
        matched.append({
            "skill": skill,
            "level": emp_level
        })
# print(result)
# result_levels = set(required_ex["Skills"].items()) - set(employee_ex['Skills'].items())
# print(result_levels)
# print(list(set(employee_ex["Skills"].items()) - set(required_ex['Skills'].items()))[::-1])


import json

report = assessor.assess(matched, missing, needs_improvement, employee_ex)
print(json.dumps(report, indent=4))