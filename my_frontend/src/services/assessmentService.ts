import axios from "axios";

import api from "./api";
import type {
  AssessmentDetail,
  AssessmentPreview,
  AssessmentResult,
  AssessmentSession,
  AssessmentSummary,
  ViolationReason,
  ViolationRecorded,
} from "../types/assessment";

const SESSION_HEADER = "X-Assessment-Session";

function sessionHeaders(sessionToken: string | null) {
  return sessionToken ? { [SESSION_HEADER]: sessionToken } : {};
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export interface AssessmentApiError {
  status: number | null;
  code: string | null;
  message: string;
  heldBy: "employee" | "hr" | null;
  retryAfterSeconds: number;
}

/** Normalise an axios error from the assessment API. */
export function toAssessmentError(error: unknown): AssessmentApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data ?? {};
    const detail = typeof data.detail === "string" ? data.detail : "Something went wrong.";
    return {
      status: error.response?.status ?? null,
      code: data.code ?? null,
      message: detail,
      heldBy: data.held_by ?? null,
      retryAfterSeconds: data.retry_after_seconds ?? 0,
    };
  }
  return { status: null, code: null, message: "Something went wrong.", heldBy: null, retryAfterSeconds: 0 };
}

// ─── Employee (self) ─────────────────────────────────────────────────────────

export async function getMyPreview(): Promise<AssessmentPreview> {
  const response = await api.get<AssessmentPreview>("/assessments/preview");
  return response.data;
}

export async function startMyAssessment(sessionToken: string | null = null): Promise<AssessmentSession> {
  const response = await api.post<AssessmentSession>("/assessments", null, {
    headers: sessionHeaders(sessionToken),
  });
  return response.data;
}

export async function listMyAssessments(): Promise<AssessmentSummary[]> {
  const response = await api.get<AssessmentSummary[]>("/assessments");
  return response.data;
}

// ─── One assessment (owner or HR) ────────────────────────────────────────────

export async function openSession(
  assessmentId: number,
  sessionToken: string | null
): Promise<AssessmentSession> {
  const response = await api.post<AssessmentSession>(
    `/assessments/${assessmentId}/session`,
    null,
    { headers: sessionHeaders(sessionToken) }
  );
  return response.data;
}

export async function getAssessment(
  assessmentId: number,
  sessionToken: string | null
): Promise<AssessmentDetail> {
  const response = await api.get<AssessmentDetail>(`/assessments/${assessmentId}`, {
    headers: sessionHeaders(sessionToken),
  });
  return response.data;
}

export async function sendHeartbeat(
  assessmentId: number,
  sessionToken: string
): Promise<{ remaining_seconds: number }> {
  const response = await api.post(`/assessments/${assessmentId}/heartbeat`, null, {
    headers: sessionHeaders(sessionToken),
  });
  return response.data;
}

export async function saveAnswer(
  assessmentId: number,
  questionId: number,
  optionId: number,
  sessionToken: string
): Promise<void> {
  await api.put(
    `/assessments/${assessmentId}/questions/${questionId}/answer`,
    { option_id: optionId },
    { headers: sessionHeaders(sessionToken) }
  );
}

export async function reportViolation(
  assessmentId: number,
  reason: ViolationReason,
  sessionToken: string
): Promise<ViolationRecorded> {
  const response = await api.post<ViolationRecorded>(
    `/assessments/${assessmentId}/violations`,
    { reason },
    { headers: sessionHeaders(sessionToken) }
  );
  return response.data;
}

export async function submitAssessment(
  assessmentId: number,
  sessionToken: string
): Promise<AssessmentResult> {
  const response = await api.post<AssessmentResult>(`/assessments/${assessmentId}/submit`, null, {
    headers: sessionHeaders(sessionToken),
  });
  return response.data;
}

export async function getResult(assessmentId: number): Promise<AssessmentResult> {
  const response = await api.get<AssessmentResult>(`/assessments/${assessmentId}/result`);
  return response.data;
}

// ─── HR ──────────────────────────────────────────────────────────────────────

export async function getEmployeePreview(employeeId: number): Promise<AssessmentPreview> {
  const response = await api.get<AssessmentPreview>(`/employees/${employeeId}/assessments/preview`);
  return response.data;
}

export async function listEmployeeAssessments(employeeId: number): Promise<AssessmentSummary[]> {
  const response = await api.get<AssessmentSummary[]>(`/employees/${employeeId}/assessments`);
  return response.data;
}

export async function assignAssessment(
  employeeId: number,
  dueAt: string | null = null
): Promise<AssessmentSummary> {
  const response = await api.post<AssessmentSummary>(
    `/employees/${employeeId}/assessments`,
    { due_at: dueAt }
  );
  return response.data;
}

export async function cancelAssessment(
  employeeId: number,
  assessmentId: number
): Promise<AssessmentSummary> {
  const response = await api.delete<AssessmentSummary>(
    `/employees/${employeeId}/assessments/${assessmentId}`
  );
  return response.data;
}

/**
 * HR "Start test": start (or resume) the employee's assessment on their
 * behalf. Uses the assigned or running one if there is one, otherwise
 * assigns a new one first.
 */
export async function startOnBehalf(
  employeeId: number,
  sessionToken: string | null = null
): Promise<AssessmentSession> {
  const assessments = await listEmployeeAssessments(employeeId);
  let active = assessments.find((a) => a.status === "assigned" || a.status === "in_progress");

  if (!active) {
    active = await assignAssessment(employeeId);
  }

  const response = await api.post<AssessmentSession>(
    `/employees/${employeeId}/assessments/${active.id}/start`,
    null,
    { headers: sessionHeaders(sessionToken) }
  );
  return response.data;
}
