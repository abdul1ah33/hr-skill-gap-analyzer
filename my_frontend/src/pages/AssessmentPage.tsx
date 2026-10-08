import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Clock, MonitorSmartphone, ShieldAlert } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { useAssessmentSecurity } from "../hooks/assessment/useAssessmentSecurity";
import { useAssessmentTimer } from "../hooks/assessment/useAssessmentTimer";
import { clearAssessmentSession, getAssessmentSession, setAssessmentSession } from "../lib/auth";
import { formatClock, levelClasses } from "../lib/assessmentLabels";
import {
  openSession,
  reportViolation,
  saveAnswer,
  sendHeartbeat,
  submitAssessment,
  toAssessmentError,
  type AssessmentApiError,
} from "../services/assessmentService";
import type { AssessmentDetail, AssessmentQuestion, ViolationReason } from "../types/assessment";

const HEARTBEAT_MS = 20_000;
const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

interface FlatQuestion {
  skillName: string;
  question: AssessmentQuestion;
}

type Blocked = { heldBy: "employee" | "hr" | null; retryAt: number };

export default function AssessmentPage() {
  const { id } = useParams();
  const assessmentId = Number(id);
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [index, setIndex] = useState(0);
  const [overallDeadline, setOverallDeadline] = useState<number | null>(null);
  const [questionDeadline, setQuestionDeadline] = useState<number | null>(null);
  const [violations, setViolations] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const finished = useRef(false);

  const questions: FlatQuestion[] = useMemo(
    () =>
      detail?.skills.flatMap((skill) =>
        skill.questions.map((question) => ({ skillName: skill.skill_name, question }))
      ) ?? [],
    [detail]
  );

  const secondsPerQuestion = detail?.config.seconds_per_question ?? 60;

  const startQuestion = useCallback(
    (nextIndex: number, overall: number | null) => {
      setIndex(nextIndex);
      const own = Date.now() + secondsPerQuestion * 1000;
      setQuestionDeadline(overall === null ? own : Math.min(own, overall));
    },
    [secondsPerQuestion]
  );

  const goToResult = useCallback(() => {
    finished.current = true;
    clearAssessmentSession(assessmentId);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
    navigate(`/assessments/${assessmentId}/result`, { replace: true });
  }, [assessmentId, navigate]);

  /** Shared handling for errors from any assessment call. */
  const handleApiError = useCallback(
    (apiError: AssessmentApiError) => {
      if (apiError.code === "ASSESSMENT_OPEN_ELSEWHERE") {
        setBlocked({ heldBy: apiError.heldBy, retryAt: Date.now() + apiError.retryAfterSeconds * 1000 });
        return;
      }
      if (apiError.code === "ASSESSMENT_EXPIRED" || apiError.code === "ASSESSMENT_NOT_IN_PROGRESS") {
        goToResult();
        return;
      }
      setSaveError(apiError.message);
    },
    [goToResult]
  );

  // ─── Open (or resume) the session ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    openSession(assessmentId, getAssessmentSession(assessmentId))
      .then((session) => {
        if (cancelled) return;
        const data = session.assessment;
        setAssessmentSession(assessmentId, session.session_token);
        setToken(session.session_token);
        setBlocked(null);
        setDetail(data);
        setViolations(data.violation_count);

        const saved: Record<number, number> = {};
        const flat = data.skills.flatMap((skill) => skill.questions);
        flat.forEach((q) => {
          if (q.selected_option_id !== null) saved[q.question_id] = q.selected_option_id;
        });
        setAnswers(saved);

        const overall = Date.now() + (data.remaining_seconds ?? 0) * 1000;
        setOverallDeadline(overall);

        // Resume at the first unanswered question
        const firstOpen = flat.findIndex((q) => q.selected_option_id === null);
        const resumeAt = firstOpen === -1 ? Math.max(0, flat.length - 1) : firstOpen;
        setIndex(resumeAt);
        const own = Date.now() + (data.config.seconds_per_question ?? 60) * 1000;
        setQuestionDeadline(Math.min(own, overall));
      })
      .catch((error) => {
        if (cancelled) return;
        const apiError = toAssessmentError(error);
        if (apiError.code === "ASSESSMENT_OPEN_ELSEWHERE") {
          setBlocked({ heldBy: apiError.heldBy, retryAt: Date.now() + apiError.retryAfterSeconds * 1000 });
        } else if (apiError.code === "ASSESSMENT_EXPIRED" || apiError.code === "ASSESSMENT_NOT_IN_PROGRESS") {
          goToResult();
        } else {
          setFatalError(apiError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assessmentId, goToResult, loadAttempt]);

  // ─── Heartbeat ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || blocked) return;

    const interval = window.setInterval(() => {
      sendHeartbeat(assessmentId, token).catch((error) => handleApiError(toAssessmentError(error)));
    }, HEARTBEAT_MS);

    return () => window.clearInterval(interval);
  }, [assessmentId, token, blocked, handleApiError]);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!token || finished.current) return;
    setSubmitting(true);
    try {
      await submitAssessment(assessmentId, token);
      goToResult();
    } catch (error) {
      setSubmitting(false);
      handleApiError(toAssessmentError(error));
    }
  }, [assessmentId, token, goToResult, handleApiError]);

  const goNext = useCallback(() => {
    if (index >= questions.length - 1) {
      submit();
      return;
    }
    startQuestion(index + 1, overallDeadline);
  }, [index, questions.length, submit, startQuestion, overallDeadline]);

  // ─── Timers ───────────────────────────────────────────────────────────────
  const { timeRemaining: questionRemaining } = useAssessmentTimer({ deadline: questionDeadline, onExpire: goNext });
  // The tick state can be a moment old when a new question starts; never show more than the limit
  const timeRemaining = Math.min(questionRemaining, secondsPerQuestion);
  const { timeRemaining: overallRemaining } = useAssessmentTimer({ deadline: overallDeadline, onExpire: submit });

  // ─── Violations ───────────────────────────────────────────────────────────
  const handleViolation = useCallback(
    (reason: ViolationReason) => {
      if (!token || finished.current) return;
      reportViolation(assessmentId, reason, token)
        .then((result) => {
          setViolations(result.violation_count);
          if (result.terminated) goToResult();
        })
        .catch((error) => handleApiError(toAssessmentError(error)));
    },
    [assessmentId, token, goToResult, handleApiError]
  );

  useAssessmentSecurity({ enabled: !!detail && !!token && !blocked, onViolation: handleViolation });

  // ─── Answers ──────────────────────────────────────────────────────────────
  function handleSelect(question: AssessmentQuestion, optionId: number) {
    if (!token) return;
    setAnswers((previous) => ({ ...previous, [question.question_id]: optionId }));
    setSaveError(null);
    saveAnswer(assessmentId, question.question_id, optionId, token).catch((error) =>
      handleApiError(toAssessmentError(error))
    );
  }

  // ─── Screens ──────────────────────────────────────────────────────────────
  if (fatalError) {
    return (
      <CenteredMessage icon={<AlertTriangle className="h-8 w-8 text-destructive" />} title="Can't open this test">
        <p className="text-sm text-muted-foreground">{fatalError}</p>
        <Button className="mt-6" onClick={() => navigate(-1)}>Go back</Button>
      </CenteredMessage>
    );
  }

  if (blocked) {
    return (
      <BlockedScreen
        blocked={blocked}
        onRetry={() => {
          setBlocked(null);
          setDetail(null);
          setLoadAttempt((n) => n + 1);
        }}
      />
    );
  }

  const current = questions[index];
  if (!detail || !current) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }

  const selected = answers[current.question.question_id] ?? null;
  const isLast = index === questions.length - 1;
  const maxViolations = detail.config.max_violations ?? 3;

  return (
    <div className="min-h-screen select-none bg-background px-6 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Skill Assessment{detail.administered_by === "hr_on_behalf" ? " · run by HR" : ""}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{detail.position_title}</h1>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-sm text-muted-foreground">Total time left</p>
              <p className="text-lg font-semibold tabular-nums">{formatClock(overallRemaining)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Question</p>
              <p className="text-lg font-semibold">
                {index + 1} <span className="text-muted-foreground">/ {questions.length}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>

        {violations > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <p className="text-sm">
              Violation {violations} of {maxViolations}. Leaving the test again may end it.
            </p>
          </div>
        )}

        {/* Timer */}
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-3 rounded-xl border bg-card px-6 py-4 shadow-sm">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Time for this question</p>
              <p className={`text-2xl font-bold tabular-nums ${timeRemaining <= 10 ? "text-destructive" : ""}`}>
                {formatClock(timeRemaining)}
              </p>
            </div>
          </div>
        </div>

        {/* Question */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="capitalize">{current.skillName}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${levelClasses[current.question.proficiency_level]}`}>
                {current.question.proficiency_level}
              </span>
            </div>
            <h2 className="whitespace-pre-wrap text-xl font-semibold leading-relaxed">
              {current.question.question_text}
            </h2>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {current.question.options.map((option, optionIndex) => {
                const isSelected = selected === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(current.question, option.id)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition hover:bg-muted/50 ${
                      isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                    }`}
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-primary" : "border-muted-foreground/40"}`}>
                      {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                      {OPTION_LETTERS[optionIndex]}
                    </span>
                    <span className="whitespace-pre-wrap text-sm leading-relaxed">{option.text}</span>
                  </button>
                );
              })}
            </div>

            {saveError && (
              <p className="mt-4 text-sm text-destructive">{saveError}</p>
            )}

            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>Answers are saved automatically. You can't go back.</span>
              </div>
              <Button size="lg" disabled={selected === null || submitting} onClick={goNext}>
                {submitting ? "Submitting..." : isLast ? "Submit Assessment" : "Next Question"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CenteredMessage({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">{icon}</div>
          <h1 className="mb-2 text-xl font-semibold">{title}</h1>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

/** Shown while another device or user holds the test. */
function BlockedScreen({ blocked, onRetry }: { blocked: Blocked; onRetry: () => void }) {
  const { timeRemaining } = useAssessmentTimer({ deadline: blocked.retryAt, onExpire: () => undefined });
  const holder = blocked.heldBy === "hr" ? "HR" : blocked.heldBy === "employee" ? "the employee" : "someone else";

  return (
    <CenteredMessage icon={<MonitorSmartphone className="h-8 w-8 text-primary" />} title="This test is open on another device">
      <p className="text-sm text-muted-foreground">
        It is currently open by {holder}. A test can only be open in one place at a time. Close it there,
        or wait until it has been inactive for a minute. Saved answers and the time limit carry over.
      </p>
      <Button className="mt-6" disabled={timeRemaining > 0} onClick={onRetry}>
        {timeRemaining > 0 ? `Try again in ${timeRemaining}s` : "Try again"}
      </Button>
    </CenteredMessage>
  );
}
