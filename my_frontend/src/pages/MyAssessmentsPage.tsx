import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, ClipboardList, PlayCircle } from "lucide-react";

import AssessmentHistoryTable from "../components/assessment/AssessmentHistoryTable";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { categoryLabels, formatDateTime, levelClasses } from "../lib/assessmentLabels";
import { getMyPreview, listMyAssessments, toAssessmentError } from "../services/assessmentService";
import type { AssessmentPreview, AssessmentSummary } from "../types/assessment";

/** Employee portal: my current / assigned test, what it covers, and my history. */
export default function MyAssessmentsPage() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<AssessmentSummary[] | null>(null);
  const [preview, setPreview] = useState<AssessmentPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    listMyAssessments()
      .then(setAssessments)
      .catch(() => setAssessments([]));
    getMyPreview()
      .then(setPreview)
      .catch((error) => setPreviewError(toAssessmentError(error).message));
  }, []);

  if (assessments === null) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  const active = assessments.find((a) => a.status === "assigned" || a.status === "in_progress");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Assessments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Take a skill test to verify your skill levels for your position.
        </p>
      </div>

      {/* Current / assigned test */}
      {active?.status === "in_progress" && (
        <Card className="ring-amber-500/40">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <PlayCircle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="font-semibold">You have a test in progress</p>
                <p className="text-sm text-muted-foreground">
                  Started {formatDateTime(active.started_at)}. The time keeps running, so continue soon.
                </p>
              </div>
            </div>
            <Button size="lg" onClick={() => navigate(`/assessments/${active.id}`)}>Continue Test</Button>
          </CardContent>
        </Card>
      )}

      {active?.status === "assigned" && (
        <Card className="ring-sky-500/40">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <ClipboardList className="h-8 w-8 text-sky-500" />
              <div>
                <p className="font-semibold">HR assigned you a skill test</p>
                <p className="text-sm text-muted-foreground">
                  Assigned {formatDateTime(active.assigned_at)}
                  {active.due_at ? ` · due ${formatDateTime(active.due_at)}` : ""}
                </p>
              </div>
            </div>
            <Button size="lg" onClick={() => navigate("/assessments/start")}>Start Test</Button>
          </CardContent>
        </Card>
      )}

      {/* What the next test covers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" /> Skills to be tested
          </CardTitle>
          {!active && preview && preview.assessable.length > 0 && (
            <Button onClick={() => navigate("/assessments/start")}>Start a Test</Button>
          )}
        </CardHeader>
        <CardContent>
          {previewError && <p className="text-sm text-muted-foreground">{previewError}</p>}
          {preview && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {preview.position_title} · {preview.total_questions} questions · about {preview.estimated_minutes} minutes
              </p>
              <div className="flex flex-wrap gap-2">
                {preview.assessable.map((skill) => (
                  <span key={skill.skill_id} className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                    <span className="font-medium capitalize">{skill.skill_name}</span>
                    <span className="text-muted-foreground">{categoryLabels[skill.category]}</span>
                    <span className={`rounded-full px-2 py-0.5 ${skill.claimed_level ? levelClasses[skill.claimed_level] : "bg-muted text-muted-foreground"}`}>
                      {skill.claimed_level ?? "None"}
                    </span>
                  </span>
                ))}
              </div>
              {preview.assessable.length === 0 && (
                <p className="text-sm text-muted-foreground">None of your position's skills can be tested yet.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <AssessmentHistoryTable assessments={assessments} emptyText="You haven't taken a test yet." />
        </CardContent>
      </Card>
    </div>
  );
}
