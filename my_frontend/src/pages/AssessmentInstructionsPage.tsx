import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardX,
  Clock,
  FileQuestion,
  Maximize,
  ShieldAlert,
  UserCog,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { getAssessmentSession, setAssessmentSession } from "../lib/auth";
import { categoryLabels, levelClasses, notAssessableLabels } from "../lib/assessmentLabels";
import {
  getEmployeePreview,
  getMyPreview,
  listEmployeeAssessments,
  listMyAssessments,
  startMyAssessment,
  startOnBehalf,
  toAssessmentError,
} from "../services/assessmentService";
import { getEmployeeById } from "../services/employeeService";
import type { AssessmentPreview } from "../types/assessment";

/**
 * Rules and skill list before a test starts.
 *   /assessments/start              → the logged-in employee's own test
 *   /assessments/start?employee=12  → HR runs the test for employee 12
 */
export default function AssessmentInstructionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const employeeParam = searchParams.get("employee");
  const employeeId = employeeParam ? Number(employeeParam) : null;
  const onBehalf = employeeId !== null;

  const [preview, setPreview] = useState<AssessmentPreview | null>(null);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const backPath = onBehalf ? `/employees/${employeeId}` : "/my/assessments";

  useEffect(() => {
    const load = async () => {
      try {
        const [previewData, assessments] = await Promise.all([
          onBehalf ? getEmployeePreview(employeeId) : getMyPreview(),
          onBehalf ? listEmployeeAssessments(employeeId) : listMyAssessments(),
        ]);
        setPreview(previewData);
        const active = assessments.find((a) => a.status === "assigned" || a.status === "in_progress");
        setActiveId(active?.id ?? null);

        if (onBehalf) {
          const employee = await getEmployeeById(employeeId);
          setEmployeeName(`${employee.first_name} ${employee.last_name}`);
        }
      } catch (error) {
        setLoadError(toAssessmentError(error).message);
      }
    };
    load();
  }, [employeeId, onBehalf]);

  async function handleStart() {
    setStarting(true);
    setStartError(null);

    // Must be called from the click, before any await
    document.documentElement.requestFullscreen?.().catch(() => undefined);

    try {
      const storedToken = activeId !== null ? getAssessmentSession(activeId) : null;
      const session = onBehalf
        ? await startOnBehalf(employeeId, storedToken)
        : await startMyAssessment(storedToken);

      setAssessmentSession(session.assessment.id, session.session_token);
      navigate(`/assessments/${session.assessment.id}`);
    } catch (error) {
      const apiError = toAssessmentError(error);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      }
      setStartError(
        apiError.code === "ASSESSMENT_OPEN_ELSEWHERE"
          ? `This test is open ${apiError.heldBy === "hr" ? "by HR" : "by the employee"} on another device. Try again in ${apiError.retryAfterSeconds} seconds.`
          : apiError.message
      );
      setStarting(false);
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link to={backPath} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm">{loadError}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  const canStart = preview.assessable.length > 0;

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link to={backPath} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Header */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Skill Assessment</p>
          <h1 className="text-3xl font-bold tracking-tight">{preview.position_title}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            The test checks your level in the skills your position requires. Each skill has 5
            questions (1 Beginner, 2 Intermediate, 2 Advanced). Your skill levels are updated from
            the result.
          </p>

          {onBehalf && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <UserCog className="h-5 w-5 text-primary" />
              <p className="text-sm">
                You are running this test on behalf of{" "}
                <span className="font-semibold">{employeeName ?? "the employee"}</span>. The result
                will show it was administered by HR.
              </p>
            </div>
          )}
        </div>

        {/* Numbers */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileQuestion, label: "Questions", value: preview.total_questions },
            { icon: Clock, label: "Time per question", value: `${preview.seconds_per_question} sec` },
            { icon: Clock, label: "Total time", value: `about ${preview.estimated_minutes} min` },
            { icon: ShieldAlert, label: "Allowed violations", value: preview.max_violations - 1 },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-xl font-semibold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skills */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Skills in this test</CardTitle>
          </CardHeader>
          <CardContent>
            {canStart ? (
              <div className="divide-y">
                {preview.assessable.map((skill) => (
                  <div key={skill.skill_id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium capitalize">{skill.skill_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabels[skill.category]} · {skill.is_essential ? "Essential" : "Optional"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Current</span>
                      <span className={`rounded-full px-2 py-0.5 font-medium ${skill.claimed_level ? levelClasses[skill.claimed_level] : "bg-muted text-muted-foreground"}`}>
                        {skill.claimed_level ?? "None"}
                      </span>
                      <span className="text-muted-foreground">Required</span>
                      <span className={`rounded-full px-2 py-0.5 font-medium ${levelClasses[skill.required_level]}`}>
                        {skill.required_level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                None of the position's skills can be tested yet.
              </p>
            )}

            {preview.not_assessable.length > 0 && (
              <div className="mt-4 rounded-lg bg-muted p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Not in this test</p>
                <div className="flex flex-wrap gap-2">
                  {preview.not_assessable.map((skill) => (
                    <span key={skill.skill_id} className="rounded-full border bg-background px-3 py-1 text-xs">
                      <span className="capitalize">{skill.skill_name}</span>
                      <span className="text-muted-foreground"> · {notAssessableLabels[skill.reason]}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Before you begin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                {
                  icon: Clock,
                  title: "Time limit",
                  text: `Each question has ${preview.seconds_per_question} seconds. When the time runs out, the test moves to the next question and an unanswered question counts as wrong. The overall time can't be paused.`,
                },
                {
                  icon: FileQuestion,
                  title: "One question at a time",
                  text: "You can't go back to a previous question. Answers are saved as you pick them, so a refresh or lost connection doesn't lose them.",
                },
                {
                  icon: Maximize,
                  title: "Fullscreen",
                  text: "The test runs in fullscreen. Leaving fullscreen counts as a violation.",
                },
                {
                  icon: ClipboardX,
                  title: "Copy protection",
                  text: "Copy, cut, paste and the right-click menu are disabled.",
                },
                {
                  icon: ShieldAlert,
                  title: "Stay on the test",
                  text: `Switching tabs or windows counts as a violation. After ${preview.max_violations} violations the test is ended and your skill levels are not changed.`,
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-4">
                  <div className="rounded-lg bg-muted p-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
              <p className="text-sm">
                <span className="font-semibold">Important:</span> the test can only be open on one
                device at a time.
              </p>
            </div>

            {startError && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <p className="text-sm">{startError}</p>
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <Button size="lg" disabled={!canStart || starting} onClick={handleStart}>
                {starting ? "Starting..." : activeId !== null ? "Start / Resume Test" : "Start Test"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
