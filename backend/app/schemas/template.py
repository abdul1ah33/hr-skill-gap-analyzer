"""
Industry template format (docs/templates.md).

A template is a folder of JSON files:

    template.json      TemplateInfo
    skills.json        [TemplateSkill]
    departments.json   [TemplateDepartment]
    positions.json     [TemplatePosition]
    courses.json       [TemplateCourse]          (optional)
    question_bank/     *.jsonl, question-bank format (optional)

Each file is validated on its own here; IndustryTemplate.check_references()
validates the references between files.
"""
from typing import Annotated, Optional

from pydantic import AfterValidator, BaseModel, Field

from app.models.employee_skill import SkillLevel
from app.utils.skill_names import normalize_skill_name


def _strip(value: str) -> str:
    value = " ".join(value.split())
    if not value:
        raise ValueError("must not be empty")
    return value


def _strip_optional(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    return value or None


def _skill_name(value: str) -> str:
    value = normalize_skill_name(value)
    if not value:
        raise ValueError("must not be empty")
    if len(value) > 100:
        raise ValueError("must be at most 100 characters")
    return value


Text = Annotated[str, AfterValidator(_strip)]
OptionalText = Annotated[Optional[str], AfterValidator(_strip_optional)]
SkillName = Annotated[str, AfterValidator(_skill_name)]
Industry = Annotated[str, AfterValidator(lambda value: _strip(value).lower())]


class TemplateInfo(BaseModel):
    key: str = Field(pattern=r"^[a-z][a-z0-9_-]{1,49}$")
    name: Text
    industry: Industry
    version: int = Field(ge=1)
    # Set to true once a domain expert has reviewed skills, levels and questions
    reviewed: bool = False
    description: OptionalText = None


class TemplateSkill(BaseModel):
    name: SkillName
    description: OptionalText = None
    esco_uri: OptionalText = None
    aliases: list[SkillName] = []


class TemplateDepartment(BaseModel):
    name: Text
    description: OptionalText = None


class TemplatePositionSkill(BaseModel):
    skill: SkillName
    required_level: SkillLevel
    is_essential: bool = True
    short_description: OptionalText = None


class TemplatePosition(BaseModel):
    title: Text
    department: OptionalText = None
    level: OptionalText = None
    description: OptionalText = None
    skills: list[TemplatePositionSkill] = []


class TemplateCourse(BaseModel):
    title: Text
    provider: OptionalText = None
    url: OptionalText = None
    difficulty: OptionalText = None
    estimated_hours: Optional[int] = Field(default=None, ge=1)
    description: OptionalText = None
    skills: list[SkillName] = []


class IndustryTemplate(BaseModel):
    info: TemplateInfo
    skills: list[TemplateSkill]
    departments: list[TemplateDepartment]
    positions: list[TemplatePosition]
    courses: list[TemplateCourse] = []
    # Skill names used in question_bank/*.jsonl (normalized)
    question_skill_names: set[str] = set()

    @property
    def source(self) -> str:
        """Value stored in positions.source / position_skills.source."""
        return f"template:{self.info.key}@{self.info.version}"

    @property
    def question_source(self) -> str:
        """Value stored in skill_questions.source (not versioned: a re-import replaces it)."""
        return f"template:{self.info.key}"

    def check_references(self) -> list[str]:
        """Problems between files; an empty list means the template is consistent."""
        errors: list[str] = []

        skill_names: set[str] = set()
        for skill in self.skills:
            if skill.name in skill_names:
                errors.append(f"skills.json: skill '{skill.name}' is listed twice")
            skill_names.add(skill.name)

        alias_owner: dict[str, str] = {}
        for skill in self.skills:
            for alias in skill.aliases:
                if alias in skill_names:
                    errors.append(f"skills.json: alias '{alias}' of '{skill.name}' is also a skill name")
                elif alias in alias_owner and alias_owner[alias] != skill.name:
                    errors.append(
                        f"skills.json: alias '{alias}' belongs to both '{alias_owner[alias]}' and '{skill.name}'"
                    )
                alias_owner[alias] = skill.name

        esco_owner: dict[str, str] = {}
        for skill in self.skills:
            if skill.esco_uri and skill.esco_uri in esco_owner:
                errors.append(
                    f"skills.json: ESCO URI {skill.esco_uri} is used by both "
                    f"'{esco_owner[skill.esco_uri]}' and '{skill.name}'"
                )
            if skill.esco_uri:
                esco_owner[skill.esco_uri] = skill.name

        department_names: set[str] = set()
        for department in self.departments:
            key = department.name.lower()
            if key in department_names:
                errors.append(f"departments.json: department '{department.name}' is listed twice")
            department_names.add(key)

        position_keys: set[tuple[str, str]] = set()
        for position in self.positions:
            where = f"positions.json: '{position.title}'"
            department_key = (position.department or "").lower()
            if position.department and department_key not in department_names:
                errors.append(f"{where}: department '{position.department}' is not in departments.json")
            if (position.title.lower(), department_key) in position_keys:
                errors.append(f"{where} is listed twice in the same department")
            position_keys.add((position.title.lower(), department_key))

            seen: set[str] = set()
            for requirement in position.skills:
                if requirement.skill not in skill_names:
                    errors.append(f"{where}: skill '{requirement.skill}' is not in skills.json")
                if requirement.skill in seen:
                    errors.append(f"{where}: skill '{requirement.skill}' is listed twice")
                seen.add(requirement.skill)

        course_titles: set[str] = set()
        for course in self.courses:
            where = f"courses.json: '{course.title}'"
            if course.title.lower() in course_titles:
                errors.append(f"{where} is listed twice")
            course_titles.add(course.title.lower())
            for skill in course.skills:
                if skill not in skill_names:
                    errors.append(f"{where}: skill '{skill}' is not in skills.json")

        for name in sorted(self.question_skill_names - skill_names):
            errors.append(f"question_bank: skill '{name}' is not in skills.json")

        return errors
