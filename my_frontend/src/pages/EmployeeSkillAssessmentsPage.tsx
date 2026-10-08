import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import EmployeeAssessmentsCard from "../components/assessment/EmployeeAssessmentsCard";
import { getEmployeeById } from "../services/employeeService";
import type { Employee } from "../types/employee";

/** HR: one employee's skill tests (start, assign, cancel, history). */
export default function EmployeeSkillAssessmentsPage() {
  const { id } = useParams();
  const employeeId = Number(id);
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    getEmployeeById(employeeId).then(setEmployee).catch(console.error);
  }, [employeeId]);

  if (!employee) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>Loading employee…</div>
      </div>
    );
  }

  const initials = `${employee.first_name[0]}${employee.last_name[0]}`;

  return (
    <div className="space-y-6">
      <Link
        to="/skill-assessments"
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
        style={{ background: "var(--accent)", color: "var(--primary)", border: "1px solid var(--accent)" }}
      >
        <ArrowLeft style={{ width: 15, height: 15 }} />
        Back to Skill Assessments
      </Link>

      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white"
            style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)" }}
          >
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-black" style={{ color: "var(--foreground)" }}>
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
              {employee.position?.title ?? "No position"}
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {employee.department?.name ?? "—"} · {employee.employee_number}
            </p>
          </div>
        </div>

        <Link
          to={`/employees/${employee.id}`}
          className="text-sm font-semibold hover:underline"
          style={{ color: "var(--primary)" }}
        >
          View profile
        </Link>
      </div>

      <EmployeeAssessmentsCard employeeId={employee.id} />
    </div>
  );
}
