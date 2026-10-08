import type {
  AssessmentStatus,
  GapCategory,
  NotAssessableSkill,
  ProfileAction,
} from "../types/assessment";

export const statusLabels: Record<AssessmentStatus, string> = {
  assigned: "Assigned",
  in_progress: "In progress",
  submitted: "Submitted",
  expired: "Time ran out",
  terminated: "Terminated",
  cancelled: "Cancelled",
};

export const statusClasses: Record<AssessmentStatus, string> = {
  assigned: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  submitted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  expired: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  terminated: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  cancelled: "bg-muted text-muted-foreground",
};

export const categoryLabels: Record<GapCategory, string> = {
  matched: "Matched",
  needs_improvement: "Needs improvement",
  unmatched: "Missing",
};

export const actionLabels: Record<ProfileAction, string> = {
  confirmed: "Level confirmed",
  upgraded: "Level raised",
  downgraded: "Level lowered",
  created: "Skill added",
  removed: "Skill removed",
  no_change: "No change",
  not_applied: "Not applied",
};

export const actionClasses: Record<ProfileAction, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  upgraded: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  created: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  downgraded: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  removed: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  no_change: "bg-muted text-muted-foreground",
  not_applied: "bg-muted text-muted-foreground",
};

export const notAssessableLabels: Record<NotAssessableSkill["reason"], string> = {
  no_question_bank: "No questions yet",
  insufficient_questions: "Not enough questions",
  over_limit: "Next test (limit reached)",
};

export const levelClasses: Record<string, string> = {
  Beginner: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  Intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Advanced: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};

export function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
