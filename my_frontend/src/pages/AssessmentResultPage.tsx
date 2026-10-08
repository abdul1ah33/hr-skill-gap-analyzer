import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, TimerOff } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { getRole } from "../lib/auth";
import {
  actionClasses,
  actionLabels,
  categoryLabels,
  formatDateTime,
  levelClasses,
  statusLabels,
} from "../lib/assessmentLabels";
import { getResult, toAssessmentError } from "../services/assessmentService";
import type { AssessmentResult, ProficiencyLevel } from "../types/assessment";

function LevelBadge({ level }: { level: ProficiencyLevel | null }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${level ? levelClasses[level] : "bg-muted text-muted-foreground"}`}>
      {level ?? "None"}
    </span>
  );
}

export default function AssessmentResultPage() {
  const { id } = useParams();
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isHr = getRole() === "HR";

  useEffect(() => {
    getResult(Number(id))
      .then(setResult)
      .catch((err) => setError(toAssessmentError(err).message));
  }, [id]);

  const backPath = isHr && result ? `/employees/${result.employee_id}` : isHr ? "/employees" : "/my/assessments";
  const backLabel = isHr ? "Back to employee" : "Back to my assessments";

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm">{error}</p>
            <Link to={backPath} className="text-sm text-primary hover:underline">{backLabel}</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }

  const header = {
    submitted: { icon: CheckCircle2, title: "Assessment submitted", text: "The skill levels below were updated from your answers." },
    expired: { icon: TimerOff, title: "Time ran out", text: "The test was graded with the answers saved before the time limit. Unanswered questions count as wrong." },
    terminated: { icon: ShieldAlert, title: "Assessment ended", text: "The test was ended after too many violations. It was graded, but skill levels were not changed." },
  }[result.status as "submitted" | "expired" | "terminated"] ?? {
    icon: CheckCircle2, title: statusLabels[result.status], text: "",
  };
  const HeaderIcon = header.icon;

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to={backPath} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <HeaderIcon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{header.title}</CardTitle>
            <p className="mt-2 text-muted-foreground">{header.text}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {result.position_title} · finished {formatDateTime(result.submitted_at)}
              {result.administered_by === "hr_on_behalf" ? " · administered by HR" : ""}
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results per skill</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Skill</th>
                    <th className="py-2 pr-4 font-medium">Before → Assessed</th>
                    <th className="py-2 pr-4 font-medium">Required</th>
                    <th className="py-2 pr-4 font-medium">Correct</th>
                    <th className="py-2 font-medium">Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {result.skills.map((skill) => (
                    <tr key={skill.skill_id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium capitalize">{skill.skill_name}</p>
                        <p className="text-xs text-muted-foreground">{categoryLabels[skill.category]}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <LevelBadge level={skill.claimed_level} />
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <LevelBadge level={skill.assessed_level} />
                        </div>
                      </td>
                      <td className="py-3 pr-4"><LevelBadge level={skill.required_level} /></td>
                      <td className="py-3 pr-4 tabular-nums">{skill.correct} / {skill.total}</td>
                      <td className="py-3">
                        {skill.profile_action && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionClasses[skill.profile_action]}`}>
                            {actionLabels[skill.profile_action]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
