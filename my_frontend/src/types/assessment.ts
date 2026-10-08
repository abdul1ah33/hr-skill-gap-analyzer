// Matches backend/app/schemas/assessment.py

export type ProficiencyLevel = "Beginner" | "Intermediate" | "Advanced";

export type AssessmentStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "expired"
  | "terminated"
  | "cancelled";

export type AdministeredBy = "self" | "hr_on_behalf";

export type GapCategory = "matched" | "needs_improvement" | "unmatched";

export type ViolationReason =
  | "tab_hidden"
  | "window_blur"
  | "fullscreen_exit"
  | "copy_attempt";

export type ProfileAction =
  | "confirmed"
  | "upgraded"
  | "downgraded"
  | "created"
  | "removed"
  | "no_change"
  | "not_applied";

// ─── Taking an assessment ────────────────────────────────────────────────────

export interface AssessmentOption {
  id: number; // 1..6, position in the shown order
  text: string;
}

export interface AssessmentQuestion {
  question_id: number;
  question_text: string;
  proficiency_level: ProficiencyLevel;
  options: AssessmentOption[];
  selected_option_id: number | null;
}

export interface AssessmentSkill {
  skill_id: number;
  skill_name: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentConfig {
  seconds_per_question: number | null;
  max_violations: number | null;
  total_questions: number;
}

export interface AssessmentDetail {
  id: number;
  employee_id: number;
  status: AssessmentStatus;
  administered_by: AdministeredBy | null;
  position_title: string | null;
  assigned_at: string | null;
  due_at: string | null;
  started_at: string | null;
  expires_at: string | null;
  remaining_seconds: number | null;
  violation_count: number;
  config: AssessmentConfig;
  skills: AssessmentSkill[];
}

export interface AssessmentSession {
  session_token: string;
  assessment: AssessmentDetail;
}

export interface ViolationRecorded {
  violation_count: number;
  max_violations: number | null;
  terminated: boolean;
}

// ─── Preview ─────────────────────────────────────────────────────────────────

export interface PreviewSkill {
  skill_id: number;
  skill_name: string;
  category: GapCategory;
  is_essential: boolean;
  claimed_level: ProficiencyLevel | null;
  required_level: ProficiencyLevel;
}

export interface NotAssessableSkill {
  skill_id: number;
  skill_name: string;
  reason: "no_question_bank" | "insufficient_questions" | "over_limit";
}

export interface AssessmentPreview {
  position_title: string;
  assessable: PreviewSkill[];
  not_assessable: NotAssessableSkill[];
  total_questions: number;
  estimated_minutes: number;
  seconds_per_question: number;
  max_violations: number;
}

// ─── Results and history ─────────────────────────────────────────────────────

export interface SkillResult {
  skill_id: number;
  skill_name: string;
  category: GapCategory;
  claimed_level: ProficiencyLevel | null;
  required_level: ProficiencyLevel | null;
  assessed_level: ProficiencyLevel | null;
  correct: number;
  total: number;
  profile_action: ProfileAction | null;
}

export interface AssessmentResult {
  id: number;
  employee_id: number;
  status: AssessmentStatus;
  administered_by: AdministeredBy | null;
  position_title: string | null;
  started_at: string | null;
  submitted_at: string | null;
  applied_to_profile: boolean;
  scoring_version: string | null;
  skills: SkillResult[];
}

export interface AssessmentSummary {
  id: number;
  status: AssessmentStatus;
  administered_by: AdministeredBy | null;
  position_title: string | null;
  assigned_at: string | null;
  due_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  skill_count: number;
}

export const FINISHED_STATUSES: AssessmentStatus[] = ["submitted", "expired", "terminated"];
