I want to implement a new Skill Assessment System that integrates with the existing employee skill-gap analysis. You can tell me you suggestions too, think of it from the business view too.

IMPORTANT: For now, DO NOT modify any files or write implementation code. I only want you to analyze the existing codebase and give me a detailed implementation plan, including exactly which files need to be created, modified, or removed, what database relationships are needed, and how the whole feature should work.

Main Feature

The application already has a SkillComparisonService that compares an employee's current skills against the skills required by their position.

It produces:

matched
needs_improvement
unmatched
additional_skills

The new assessment system should assess the employee's:

unmatched skills
needs_improvement skills
matched skills

because the system will test the actual level of the employee, detect the actual levels of the employee, and change levels in the database in the employee_skills table. idk if it is better to add additional_skills for testing too or not.
I don't know if we need to test the unmatched skills or no

The eventual flow should be:

Employee
→ SkillComparisonService
→ identify skills
→ identify the corresponding question-bank skills
→ generate an assessment
→ randomly select questions from the question-bank 
→ employee answers questions
→ backend evaluates answers
→ backend calculates proficiency level for each assessed skill
→ update/record the assessment result

QUESTION BANK

A teammate has provided a question bank containing approximately 83 in skills backend/app/data/question_bank/output_question_bank.jsonl.

There are approximately 30 questions per skill.

These questions are already structured by proficiency level:

Beginner
Intermediate
Advanced

Each question has exactly 6 options.

The option types are:

correct
near_miss
misconception
plausible_wrong_1
plausible_wrong_2
plausible_wrong_3

Each option also contains:

text
type
explanation

The internal Pydantic structures currently look like:

OptionType = Literal[
    "correct", 
    "near_miss", 
    "misconception", 
    "plausible_wrong_1", 
    "plausible_wrong_2", 
    "plausible_wrong_3"
]

class Option(BaseModel):
    text: str
    type: OptionType
    explanation: str

class Question(BaseModel):
    question_text: str
    proficiency_level: Literal[
        "Beginner",
        "Intermediate",
        "Advanced"
    ]
    options: list[Option]

class QuestionChunk(BaseModel):
    questions: list[Question]

class SkillQuestionBank(BaseModel):
    skill_name: str
    questions: list[Question]

These structures are currently intended for question generation/import and internal processing.

The database should store the COMPLETE question bank.

Do NOT store only the 5 questions selected for one assessment.

For example:

Python
├── ~30 permanent questions
├── Beginner questions
├── Intermediate questions
└── Advanced questions

The same stored question can potentially be selected in different assessment attempts.

RANDOM QUESTION SELECTION

When a particular skill needs to be assessed, the system should randomly select exactly 5 questions from that skill's stored question bank:

1 Beginner
2 Intermediate
2 Advanced

The remaining questions stay in the question bank.

The selected questions should then become part of that specific assessment attempt so that:

Refreshing the page does NOT generate a different assessment.
The questions presented to the employee remain fixed.
The backend knows exactly which questions were presented.
The same question bank can be reused for future assessments.

The section itself is random.

Options may also be shuffled server-side.

SECURITY REQUIREMENTS

This is very important.

The frontend must NEVER receive the answer key.

The following information must remain backend-only:

option_type
whether an option is correct
explanation
any answer key

The frontend should only receive something equivalent to:

{
  "question_id": 123,
  "question_text": "...",
  "proficiency_level": "Intermediate",
  "options": [
    {
      "id": 1,
      "text": "..."
    },
    {
      "id": 2,
      "text": "..."
    }
  ]
}

The backend must be responsible for:

validating answers
determining correctness
calculating the final skill level
storing the result

The React frontend must NOT calculate the final proficiency level.

CURRENT DATABASE MODELS

There is already a Skill model:

class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    employee_skills: Mapped[list["EmployeeSkill"]] = relationship(
        back_populates="skill",
    )

    course_skills: Mapped[list["CourseSkill"]] = relationship(
        back_populates="skill",
    )

    assessment_skills: Mapped[list["AssessmentSkill"]] = relationship(
        back_populates="skill",
    )

    position_skills: Mapped[list["PositionSkill"]] = relationship(
        back_populates="skill",
    )

    aliases: Mapped[list["SkillAlias"]] = relationship(
        "SkillAlias",
        back_populates="skill",
        cascade="all, delete-orphan",
    )

There is also an existing AssessmentSkill model:

class AssessmentSkill(Base):
    __tablename__ = "assessment_skills"

    __table_args__ = (
        UniqueConstraint("assessment_id", "skill_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id"),
        nullable=False,
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id"),
        nullable=False,
    )

    assessment: Mapped["Assessment"] = relationship(
        back_populates="assessment_skills"
    )

    skill: Mapped["Skill"] = relationship(
        back_populates="assessment_skills"
    )

There is also an existing Assessment model:

class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True)

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(Text)

    difficulty: Mapped[str | None] = mapped_column(
        String(30)
    )

    passing_score: Mapped[int | None] = mapped_column(Integer)

    duration_minutes: Mapped[int | None] = mapped_column(Integer)

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    creator: Mapped["User | None"] = relationship(
        back_populates="created_assessments"
    )

    assessment_skills: Mapped[list["AssessmentSkill"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )

    questions: Mapped[list["AssessmentQuestion"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )

    results: Mapped[list["AssessmentResult"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )

These assessment models are considered legacy/old structure and may be redesigned substantially if necessary.

Do not preserve the old structure just for compatibility if it conflicts with the new architecture.

PROPOSED QUESTION-BANK MODEL

I am considering separating the permanent question bank from individual assessment attempts.

Conceptually:

Skill
  │
  └── AssessmentQuestion
        │
        └── AssessmentOption

Where:

AssessmentQuestion

Stores permanent question-bank questions:

id
skill_id
question_text
proficiency_level
created_at
updated_at
AssessmentOption

Stores permanent options:

id
question_id
text
option_type
explanation

The option_type and explanation must remain server-side and must never be returned to the frontend.

Please evaluate whether these model names and relationships are appropriate or whether better names/structure should be used.

ASSESSMENT ATTEMPT

We need to distinguish between:

The permanent question bank.
A specific employee's assessment attempt.

For example:

Question Bank
    Python
      ├── Q1
      ├── Q2
      ├── ...
      └── Q30

Employee starts assessment

Assessment Attempt #123
    Python
      ├── Q4
      ├── Q11
      ├── Q17
      ├── Q23
      └── Q29

The assessment attempt must remember exactly which questions were selected.

It should also eventually store the employee's selected answers and correctness.

Please design the appropriate database model(s) for this.

Potentially this could involve something like:

Assessment
AssessmentAttempt
AssessmentSkill
AssessmentQuestionInstance

But DO NOT assume this exact structure is correct. Analyze the existing project and recommend the best structure.

SCORING RULES

For each skill, exactly 5 questions are presented:

1 Beginner
2 Intermediate
2 Advanced

The intended scoring rules are:

0–1 correct → None
Beginner correct + 0–1 Intermediate correct → Beginner
Beginner correct + both Intermediate correct → Intermediate
4–5 total correct → Advanced

There may be an edge case where these rules overlap or don't completely define a result.

DO NOT silently invent a scoring rule for ambiguous cases.

Instead, identify the ambiguity in the implementation plan and tell me where a final decision is needed.

EXISTING SKILL COMPARISON

The current SkillComparisonService works roughly as follows:

Employee
   ↓
employee skills
   ↓
position required skills
   ↓
compare levels
   ↓
matched
needs_improvement
unmatched
additional_skills

For the assessment system:

these skill types

should become the target assessment skills to test whether there levels are real or the employee faked them

For example:

Employee skills:

Python = Beginner
SQL = Intermediate

Position requirements:

Python = Advanced
SQL = Advanced
Docker = Intermediate

The assessment system should then create questions for:

Python
SQL
Docker

Please inspect the existing SkillComparisonService and determine the cleanest integration point.

API REQUIREMENTS

Eventually we will need APIs similar to:

POST /assessments/start
GET  /assessments/{assessment_id}
POST /assessments/{assessment_id}/answers
POST /assessments/{assessment_id}/submit

But these are NOT necessarily the final endpoint names.

Please inspect the existing router/service/schema conventions in the project and recommend the appropriate endpoints.

Authentication already exists using FastAPI dependencies and JWT.

The assessment must be tied to the authenticated employee/user.

QUESTION BANK IMPORT

The teammate's question bank will need to be imported into the database.

We need to consider:

how the 83 skills map to existing Skill records
how to handle skills that already exist
how to validate the question structure
how to validate exactly 6 options per question
how to validate exactly one correct option
how to validate the required option types
how to validate Beginner/Intermediate/Advanced counts
what happens if a skill has fewer than the required questions
whether importing should be idempotent
whether a separate seed/import script should be created

Please recommend the best approach.

IMPORTANT DESIGN CONSTRAINT

The question bank contains approximately 30 questions per skill.

We do NOT want to generate new questions every time an employee starts an assessment.

The questions should be imported/stored once and reused.

The randomization happens only when creating a specific assessment attempt.

WHAT I WANT FROM YOU

Again: DO NOT modify files yet.

First inspect the entire existing project relevant to this feature.

Then give me a detailed implementation plan containing:

1. Architecture

Explain the final recommended architecture and data flow.

2. Database design

List every model/table we should create, modify, or remove.

For every model explain:

purpose
important fields
relationships
foreign keys
constraints
indexes
cascade behavior
3. Existing files

Identify exactly which existing files need modification.

Use the actual project paths.

4. New files

Identify every new file we should create.

Use the actual project paths.

5. Legacy code

Identify which existing assessment code is obsolete and should be replaced or removed.

Do not assume we need backward compatibility because this feature is still being developed.

6. Question-bank import

Explain how the 83 skills / ~30 questions per skill should be loaded into the database.

7. Assessment generation

Explain exactly how the system should:

identify target skills
find their question bank
select 1 Beginner
select 2 Intermediate
select 2 Advanced
randomize the selected questions
persist the selected questions
return safe data to the frontend
8. Security

Explain how the backend prevents:

exposing correct answers
exposing explanations
cheating through API manipulation
submitting answers to another employee's assessment
submitting an option belonging to another question
changing the selected question set after assessment creation
9. Scoring

Explain how the scoring service should work and explicitly identify any ambiguity in the scoring rules.

10. API design

Recommend:

endpoints
request schemas
response schemas
authentication/authorization
validation
11. Frontend

Identify which React files/components will eventually need changes, but do NOT implement them yet.

12. Implementation order

Give me a step-by-step implementation order.

For example:

Phase 1 — Database models
Phase 2 — Question bank schemas/validation
Phase 3 — Question bank importer
Phase 4 — Assessment generation
Phase 5 — Assessment attempt persistence
Phase 6 — API
Phase 7 — Scoring
Phase 8 — SkillComparisonService integration
Phase 9 — React integration
Phase 10 — Testing

Adjust this based on your analysis of the actual codebase.

13. Testing

Recommend unit/integration tests for:

question-bank validation
importing
random question selection
assessment persistence
authorization
answer validation
scoring
skill-gap integration
14. Migration considerations

Explain what database migrations will be needed and what happens to the current legacy assessment tables/data.

 take into considration that I want to return and save the type of answer the employee do like correct, near_miss, misconception but I will only use correct and miss for calculating the score as the other two options will be used in other future features later.
Technical Positions:
these are all technical position, these skills are covering for now
Software Engineer (Python/Backend)
Cloud/DevOps Engineer
Data Scientist / Machine Learning Engineer
Mechanical / CAD Engineer
Civil Engineer / Construction Manager
Non-Technical Positions:
Accounting / Finance Manager
Human Resources / Recruitment Manager
Digital Marketing Specialist
Hospitality / Restaurant Manager
17. Final file tree

At the end, provide the expected final assessment-related file structure.

Do not implement anything yet.

I want the plan first so I can review it before we start changing the code.
also save the implementation plan of everything in plans/tasks folder