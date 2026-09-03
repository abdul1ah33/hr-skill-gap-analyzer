// ─── Skill Diff ───────────────────────────────────────────────────────────────

export interface MatchedSkill {
  skill: string;
  employee_level: string;
  required_level: string;
  priority: "Essential" | "Optional";
}

export interface NeedsImprovementSkill {
  skill: string;
  employee_level: string;
  required_level: string;
  priority: "Essential" | "Optional";
}

export interface UnmatchedSkill {
  skill: string;
  employee_level: null;
  required_level: string;
  priority: "Essential" | "Optional";
}

export interface AdditionalSkill {
  skill: string;
  employee_level: string;
}

export interface SkillDiff {
  matched: MatchedSkill[];
  needs_improvement: NeedsImprovementSkill[];
  unmatched: UnmatchedSkill[];
  additional_skills: AdditionalSkill[];
}

// ─── Gap Analysis Report ──────────────────────────────────────────────────────

export interface UpskillRecommendation {
  skill: string;
  gap_type: "Needs Improvement" | "Unmatched";
  priority: "Essential" | "Optional";
  tactical_steps: string[];
  estimated_timeline: string;
  suggested_resources: string[];
}

export interface BonusSkillAnalysis {
  skill: string;
  is_relevant: boolean;
  leverage_evaluation: string;
}

export interface GapAnalysisReport {
  readiness_score: number;
  readiness_status: "Ready" | "Needs Upskilling" | "Not a Fit";
  managerial_summary: string;
  upskill_pathways: UpskillRecommendation[];
  bonus_skills_analysis: BonusSkillAnalysis[];
  core_strengths: string[];
}

// ─── Full API Response ────────────────────────────────────────────────────────

export interface SkillGapResult {
  employee_id: number;
  job_title: string;
  skill_diff: SkillDiff;
  gap_analysis: GapAnalysisReport;
}
