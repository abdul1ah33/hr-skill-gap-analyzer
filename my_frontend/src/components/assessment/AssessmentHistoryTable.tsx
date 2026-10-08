import { Link } from "react-router-dom";

import { formatDateTime, statusClasses, statusLabels } from "../../lib/assessmentLabels";
import { FINISHED_STATUSES, type AssessmentSummary } from "../../types/assessment";

interface Props {
  assessments: AssessmentSummary[];
  emptyText: string;
}

/** Past and current assessments with a link to each finished result. */
export default function AssessmentHistoryTable({ assessments, emptyText }: Props) {
  if (assessments.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Position</th>
            <th className="py-2 pr-4 font-medium">Skills</th>
            <th className="py-2 pr-4 font-medium">Taken by</th>
            <th className="py-2 pr-4 font-medium">Started</th>
            <th className="py-2 pr-4 font-medium">Finished</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {assessments.map((assessment) => (
            <tr key={assessment.id} className="border-b last:border-0">
              <td className="py-3 pr-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[assessment.status]}`}>
                  {statusLabels[assessment.status]}
                </span>
              </td>
              <td className="py-3 pr-4">{assessment.position_title ?? "—"}</td>
              <td className="py-3 pr-4">{assessment.skill_count || "—"}</td>
              <td className="py-3 pr-4">
                {assessment.administered_by === "hr_on_behalf" ? "HR" : assessment.administered_by === "self" ? "Employee" : "—"}
              </td>
              <td className="py-3 pr-4">{formatDateTime(assessment.started_at)}</td>
              <td className="py-3 pr-4">{formatDateTime(assessment.submitted_at)}</td>
              <td className="py-3 text-right">
                {FINISHED_STATUSES.includes(assessment.status) && (
                  <Link to={`/assessments/${assessment.id}/result`} className="text-sm font-medium text-primary hover:underline">
                    View result
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
