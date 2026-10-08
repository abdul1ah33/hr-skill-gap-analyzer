import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, PlayCircle, Send, X } from "lucide-react";

import AssessmentHistoryTable from "./AssessmentHistoryTable";
import { Button } from "../ui/button";
import { formatDateTime } from "../../lib/assessmentLabels";
import {
  assignAssessment,
  cancelAssessment,
  listEmployeeAssessments,
  toAssessmentError,
} from "../../services/assessmentService";
import type { AssessmentSummary } from "../../types/assessment";

interface Props {
  employeeId: number;
}

/**
 * HR view of an employee's skill tests:
 *  - "Start test" runs it now on this screen (on the employee's behalf)
 *  - "Assign test" lets the employee start it from their own account
 */
export default function EmployeeAssessmentsCard({ employeeId }: Props) {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(
    () =>
      listEmployeeAssessments(employeeId)
        .then(setAssessments)
        .catch((err) => setError(toAssessmentError(err).message)),
    [employeeId]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const active = assessments.find((a) => a.status === "assigned" || a.status === "in_progress");

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setError(toAssessmentError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <ClipboardCheck style={{ width: "18px", height: "18px", color: "var(--primary)" }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            Skill Assessments
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={busy || active !== undefined}
            onClick={() => run(() => assignAssessment(employeeId))}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            variant="outline"
            title={active ? "This employee already has an assigned or running test" : "The employee starts it from their own account"}
          >
            <Send style={{ width: "14px", height: "14px" }} />
            Assign Test
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => navigate(`/assessments/start?employee=${employeeId}`)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #10b981, #34d399)", border: "none" }}
          >
            <PlayCircle style={{ width: "14px", height: "14px" }} />
            {active?.status === "in_progress" ? "Continue Test" : "Start Test"}
          </Button>
        </div>
      </div>

      <div className="space-y-4 px-6 py-4">
        {active?.status === "assigned" && (
          <div className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--muted)" }}>
            <p className="text-sm" style={{ color: "var(--foreground)" }}>
              Test assigned {formatDateTime(active.assigned_at)}. The employee can start it from their account,
              or you can start it here.
            </p>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => run(() => cancelAssessment(employeeId, active.id))}
              className="flex items-center gap-1 text-sm text-destructive"
            >
              <X style={{ width: "14px", height: "14px" }} /> Cancel
            </Button>
          </div>
        )}

        {active?.status === "in_progress" && (
          <div className="rounded-xl p-3" style={{ background: "var(--muted)" }}>
            <p className="text-sm" style={{ color: "var(--foreground)" }}>
              A test is in progress (started {formatDateTime(active.started_at)}). It can only be open in one place:
              if the employee has it open, you can take over after a minute of inactivity.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AssessmentHistoryTable assessments={assessments} emptyText="No skill tests yet." />
      </div>
    </div>
  );
}
