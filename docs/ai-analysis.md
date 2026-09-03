---
# AI Analysis Pipeline

This document explains the AI and data pipelines that power the core features of the AI-Based HR Assisting App.

---

## 1. Automatic Position Skill Generation

When a new position is created, the system must determine what skills are required for that job. This runs as a background task.

### Pipeline Flow

1. **Trigger:** `POST /positions` or `PUT /positions` (if title changes).
2. **ESCO Occupation Search:** 
   - Backend queries `https://ec.europa.eu/esco/api/search?text={title}&type=occupation`
   - Retrieves the closest matching occupation URI.
3. **ESCO Skill Retrieval:**
   - Queries `https://ec.europa.eu/esco/api/resource/occupation?uri={uri}`
   - Extracts two lists: `hasEssentialSkill` and `hasOptionalSkill`.
4. **Gemini Refinement (`perfect_profile.py`):**
   - ESCO skills are often verbose, academic, or contain generic noise (e.g., "use internet").
   - The raw ESCO lists + Job Title are sent to Gemini 3.5 Flash-Lite.
   - **System Prompt Instructions:**
     - Filter out generic noise.
     - Normalize skill names to industry standard ("NodeJS" -> "Node.js").
     - Infer required proficiency (`Beginner`, `Intermediate`, `Advanced`) based on the job title's seniority.
     - Add missing modern industry-standard skills that ESCO might lack.
   - **Output:** A strict JSON schema (`PerfectProfile`) containing normalized `TargetSkill` objects.
5. **Database Storage:**
   - For each skill, the system finds an existing `Skill` or creates a new one.
   - Creates `PositionSkill` records linked to the position.

---

## 2. Deterministic Skill Comparison

Before AI analyzes a skill gap, the system performs a deterministic comparison to ground the AI in hard data.

### Pipeline Flow

1. **Trigger:** `GET /employees/{id}/skill-gap` (Phase C).
2. **Data Loading:** Loads employee skills and position required skills.
3. **Alias Resolution (Implicit):** Because skills are normalized at creation time, the database `Skill` names should already align. 
4. **Comparison Rules:**
   - Skills are matched by **exact string match** (case-insensitive).
   - Proficiency levels are mapped to integers: `Beginner (1)`, `Intermediate (2)`, `Advanced (3)`, `Expert (4)`.
5. **Categorization:**
   - **Matched:** Employee has the skill at `employee_level >= required_level`.
   - **Needs Improvement:** Employee has the skill, but `employee_level < required_level`.
   - **Unmatched:** Employee lacks the skill entirely.
   - **Additional Skills:** Employee has a skill not required by the position.
6. **Output:** A JSON dictionary (`skill_diff`) containing these four lists.

---

## 3. AI Skill Gap Report Generation

Once the deterministic comparison is complete, Gemini generates a human-readable, actionable HR report.

### Pipeline Flow

1. **Trigger:** `GET /employees/{id}/skill-gap` (Phase D).
2. **Input Preparation:** The job title and the `skill_diff` dictionary are serialized to JSON.
3. **Gemini Analysis (`gap_analysis_ai.py`):**
   - The data is sent to Gemini 3.5 Flash-Lite.
   - **System Prompt Instructions:**
     - Act as an expert HR analyst.
     - Calculate a `readiness_score` (0-100) heavily weighted by essential unmatched skills.
     - Determine `readiness_status` ("Ready", "Needs Upskilling", "Not a Fit").
     - Generate tactical `upskill_pathways` with timelines and resources.
     - Provide a `managerial_summary`.
   - **Output:** A strict JSON schema (`GapAnalysisReport`).
4. **Delivery:** The structured report is returned to the frontend and rendered in the `AIAssessmentPage`.

---

## 4. Resume Parsing

When HR uploads a candidate's resume, AI extracts the data to automatically create an employee record.

### Pipeline Flow

1. **Trigger:** `POST /resume/extract`.
2. **Text Extraction:** `PyMuPDF` (fitz) or `PyPDF2` extracts raw text from the uploaded PDF/DOCX.
3. **Gemini Extraction (`resume_parser.py`):**
   - The raw text is sent to Gemini 3.5 Flash-Lite.
   - **System Prompt Instructions:**
     - Extract name, contact info, total years of experience, education, and certifications.
     - Extract explicit and implicit skills.
     - Normalize skill names.
     - Assign a proficiency level (`Beginner`, `Intermediate`, `Advanced`) based on context (academic vs. professional experience).
   - **Output:** A strict JSON schema (`CandidateProfile`).
4. **Database Storage:**
   - The backend creates the `Employee` record, `Education`, `Certification`, and `EmployeeSkill` records.
   - If a new position title is detected, it creates the `Position` and triggers the Position Skill Generation background task.
