export type UserRole = "HR" | "Employee";

const TOKEN_KEY = "access_token";
const ASSESSMENT_SESSION_PREFIX = "assessment-session:";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Role from the JWT payload (not verified here; the backend checks it). */
export function getRole(): UserRole | null {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(atob(payload)) as { role?: string; exp?: number };

    if (data.exp && data.exp * 1000 < Date.now()) {
      return null;
    }
    return data.role === "HR" || data.role === "Employee" ? data.role : null;
  } catch {
    return null;
  }
}

/** Where a user lands after login. */
export function homePathFor(role: UserRole | null): string {
  return role === "Employee" ? "/my/assessments" : "/dashboard";
}

// ─── Assessment session tokens (per browser tab) ─────────────────────────────

export function getAssessmentSession(assessmentId: number): string | null {
  return sessionStorage.getItem(`${ASSESSMENT_SESSION_PREFIX}${assessmentId}`);
}

export function setAssessmentSession(assessmentId: number, token: string): void {
  sessionStorage.setItem(`${ASSESSMENT_SESSION_PREFIX}${assessmentId}`, token);
}

export function clearAssessmentSession(assessmentId: number): void {
  sessionStorage.removeItem(`${ASSESSMENT_SESSION_PREFIX}${assessmentId}`);
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);

  // Don't let the next account on this tab reuse an open assessment session
  Object.keys(sessionStorage)
    .filter((key) => key.startsWith(ASSESSMENT_SESSION_PREFIX))
    .forEach((key) => sessionStorage.removeItem(key));
}
