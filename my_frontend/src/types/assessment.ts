export type AssessmentStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "terminated"
  | "expired";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface AssessmentQuestion {
  id: number;
  question: string;
  options: QuestionOption[];
  order: number;
}

export interface AssessmentConfig {
  timePerQuestion: number;
  maxViolations: number;
  requireFullscreen: boolean;
  preventCopy: boolean;
  detectTabSwitch: boolean;
}

export interface Assessment {
  id: number;
  title: string;
  description?: string;
  questions: AssessmentQuestion[];
  config: AssessmentConfig;
}

export interface AssessmentAnswer {
  questionId: number;
  selectedOptionId: string | null;
}

export interface AssessmentAttempt {
  id: number;
  assessmentId: number;
  employeeId: number;
  status: AssessmentStatus;
  currentQuestionIndex: number;
  answers: AssessmentAnswer[];
  violations: number;
  startedAt?: string;
  completedAt?: string;
  score?: number;
}