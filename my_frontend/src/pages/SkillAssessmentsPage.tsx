import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";

import EmployeePicker from "../components/EmployeePicker";
import { getEmployees } from "../services/employeeService";
import type { Employee } from "../types/employee";

/** HR: pick an employee to start, assign or review their skill tests. */
export default function SkillAssessmentsPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Skill Assessments
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Run a timed skill test for an employee on this screen, or assign it so they take it from their own account.
        </p>
      </div>

      <EmployeePicker
        employees={employees}
        loading={loading}
        title="Select Employee"
        subtitle="Choose an employee to test"
        actionLabel="Assess"
        actionIcon={ClipboardCheck}
        noPositionTitle="No position assigned — nothing to test"
        onSelect={(emp) => navigate(`/skill-assessments/${emp.id}`)}
      />
    </div>
  );
}
