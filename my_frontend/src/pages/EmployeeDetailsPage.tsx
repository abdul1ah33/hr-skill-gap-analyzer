import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getEmployeeById, deleteEmployee } from "../services/employeeService";
import type { Employee } from "../types/employee";
import { Button } from "../components/ui/button";

import {
  addEmployeeSkill,
  updateEmployeeSkill,
  deleteEmployeeSkill,
} from "../services/employeeSkillService";

import { getSkills } from "../services/skillService";
import type { Skill } from "../types/employee";
import type { SkillLevel } from "../types/employeeSkills";

import {
  ArrowLeft,
  BarChart3,
  Pencil,
  Plus,
  Trash2,
  GraduationCap,
  Award,
  Sparkles,
  Mail,
  Phone,
  Building2,
  BriefcaseBusiness,
} from "lucide-react";

const levelColors: Record<string, { bg: string; color: string }> = {
  Beginner: { bg: "#e0f2fe", color: "#0369a1" },
  Intermediate: { bg: "#fef9c3", color: "#854d0e" },
  Advanced: { bg: "#dcfce7", color: "#166534" },
  Expert: { bg: "#ede8ff", color: "#6c63ff" },
};

function EmployeeDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);

  // for add skill to employee form
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>("Beginner");
  const [addingSkill, setAddingSkill] = useState(false);

  // for editing skill
  const [editingSkillId, setEditingSkillId] = useState<number | null>(null);
  const [editingLevel, setEditingLevel] = useState<SkillLevel>("Beginner");

  useEffect(() => {
    if (!id) {
      return;
    }

    getEmployeeById(Number(id))
      .then(setEmployee)
      .catch((error) => {
        console.error(error);
      });
  }, [id]);

  useEffect(() => {
    getSkills()
      .then(setSkills)
      .catch((error) => {
        console.error("Failed to load skills:", error);
      });
  }, []);

  async function handleDeleteEmployee() {
    if (!employee) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${employee.first_name} ${employee.last_name}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteEmployee(employee.id);
      navigate("/employees");
    } catch (error: any) {
      const msg = error?.response?.data?.detail ?? "Failed to delete employee.";
      alert(msg);
    }
  }

  async function handleAddSkill() {
    if (!employee || !selectedSkillId) {
      return;
    }

    try {
      setAddingSkill(true);

      const newEmployeeSkill = await addEmployeeSkill(employee.id, {
        skill_id: Number(selectedSkillId),
        level: selectedLevel,
      });

      setEmployee({
        ...employee,
        employee_skills: [...employee.employee_skills, newEmployeeSkill],
      });

      setSelectedSkillId("");
      setSelectedLevel("Beginner");
      setShowAddSkill(false);
    } catch (error) {
      console.error("Failed to add employee skill:", error);
    } finally {
      setAddingSkill(false);
    }
  }

  async function handleUpdateSkill(skillId: number) {
    if (!employee) {
      return;
    }

    try {
      const updatedSkill = await updateEmployeeSkill(employee.id, skillId, {
        level: editingLevel,
      });

      setEmployee({
        ...employee,
        employee_skills: employee.employee_skills.map((employeeSkill) =>
          employeeSkill.skill.id === skillId ? updatedSkill : employeeSkill
        ),
      });

      setEditingSkillId(null);
    } catch (error) {
      console.error("Failed to update employee skill:", error);
    }
  }

  async function handleDeleteSkill(skillId: number) {
    if (!employee) {
      return;
    }

    try {
      await deleteEmployeeSkill(employee.id, skillId);

      setEmployee({
        ...employee,
        employee_skills: employee.employee_skills.filter(
          (employeeSkill) => employeeSkill.skill.id !== skillId
        ),
      });
    } catch (error) {
      console.error("Failed to delete employee skill:", error);
    }
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm" style={{ color: "#9ca3af" }}>Loading...</div>
      </div>
    );
  }

  const initials = `${employee.first_name[0]}${employee.last_name[0]}`;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/employees"
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
        style={{
          background: "#ede8ff",
          color: "#6c63ff",
          border: "1px solid #d4cfff",
        }}
      >
        <ArrowLeft style={{ width: "15px", height: "15px" }} />
        Back to Employees
      </Link>

      {/* Profile header card */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)" }}
            >
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#1a1a2e" }}>
                {employee.first_name} {employee.last_name}
              </h1>
              <p className="mt-0.5 text-sm font-mono" style={{ color: "#9ca3af" }}>
                {employee.employee_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/gap-analysis/${employee.id}`}>
              <Button
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)", border: "none" }}
              >
                <BarChart3 style={{ width: "14px", height: "14px" }} />
                Gap Analysis
              </Button>
            </Link>

            <Link to={`/employees/${employee.id}/edit`}>
              <Button
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none" }}
              >
                <Pencil style={{ width: "14px", height: "14px" }} />
                Edit Employee
              </Button>
            </Link>

            <Button
              type="button"
              onClick={handleDeleteEmployee}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #ef4444, #f87171)", border: "none" }}
            >
              <Trash2 style={{ width: "14px", height: "14px" }} />
              Delete
            </Button>
          </div>
        </div>

        {/* Info grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: Mail, label: "Email", value: employee.email },
            { icon: Phone, label: "Phone", value: employee.phone || "â€”" },
            { icon: Building2, label: "Department", value: employee.department?.name ?? "â€”" },
            { icon: BriefcaseBusiness, label: "Position", value: employee.position?.title ?? "â€”" },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl p-3"
              style={{ background: "#f0f2f8" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon style={{ width: "14px", height: "14px", color: "#6c63ff" }} />
                <span className="text-xs font-medium" style={{ color: "#9ca3af" }}>
                  {label}
                </span>
              </div>
              <p className="truncate text-sm font-semibold" style={{ color: "#1a1a2e" }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Education */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div
          className="flex items-center gap-3 px-6 py-4"
          style={{ borderBottom: "1px solid #e8eaf0" }}
        >
          <GraduationCap style={{ width: "18px", height: "18px", color: "#6c63ff" }} />
          <h2 className="text-base font-semibold" style={{ color: "#1a1a2e" }}>
            Education
          </h2>
        </div>

        <div className="px-6 py-4">
          {employee.education.length === 0 ? (
            <p className="text-sm" style={{ color: "#9ca3af" }}>No education records found.</p>
          ) : (
            <div className="space-y-2">
              {employee.education.map((education) => (
                <div
                  key={education.id}
                  className="rounded-xl p-3"
                  style={{ background: "#f0f2f8" }}
                >
                  <p className="text-sm" style={{ color: "#1a1a2e" }}>{education.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Certifications */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div
          className="flex items-center gap-3 px-6 py-4"
          style={{ borderBottom: "1px solid #e8eaf0" }}
        >
          <Award style={{ width: "18px", height: "18px", color: "#6c63ff" }} />
          <h2 className="text-base font-semibold" style={{ color: "#1a1a2e" }}>
            Certifications
          </h2>
        </div>

        <div className="px-6 py-4">
          {employee.certifications.length === 0 ? (
            <p className="text-sm" style={{ color: "#9ca3af" }}>No certifications found.</p>
          ) : (
            <div className="space-y-2">
              {employee.certifications.map((certification) => (
                <div
                  key={certification.id}
                  className="flex items-center gap-2 rounded-xl p-3"
                  style={{ background: "#f0f2f8" }}
                >
                  <Award style={{ width: "14px", height: "14px", color: "#6c63ff", flexShrink: 0 }} />
                  <p className="text-sm font-medium" style={{ color: "#1a1a2e" }}>
                    {certification.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skills */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #e8eaf0" }}
        >
          <div className="flex items-center gap-3">
            <Sparkles style={{ width: "18px", height: "18px", color: "#6c63ff" }} />
            <h2 className="text-base font-semibold" style={{ color: "#1a1a2e" }}>
              Skills
            </h2>
          </div>

          <Button
            type="button"
            onClick={() => setShowAddSkill(!showAddSkill)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none" }}
          >
            <Plus style={{ width: "14px", height: "14px" }} />
            {showAddSkill ? "Cancel" : "Add Skill"}
          </Button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Add skill form */}
          {showAddSkill && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "#f0f2f8", border: "1px solid #e8eaf0" }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>Add New Skill</h3>
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "#6b7280" }}>Skill</label>
                  <select
                    value={selectedSkillId}
                    onChange={(event) => setSelectedSkillId(event.target.value)}
                    className="rounded-xl px-3 py-2 text-sm"
                    style={{ border: "1px solid #e8eaf0", background: "#ffffff", color: "#1a1a2e", outline: "none" }}
                  >
                    <option value="">Select Skill</option>
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "#6b7280" }}>Level</label>
                  <select
                    value={selectedLevel}
                    onChange={(event) =>
                      setSelectedLevel(event.target.value as SkillLevel)
                    }
                    className="rounded-xl px-3 py-2 text-sm"
                    style={{ border: "1px solid #e8eaf0", background: "#ffffff", color: "#1a1a2e", outline: "none" }}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleAddSkill}
                    disabled={!selectedSkillId || addingSkill}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none" }}
                  >
                    {addingSkill ? "Adding..." : "Add Skill"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Skills list */}
          {employee.employee_skills.length === 0 ? (
            <p className="text-sm" style={{ color: "#9ca3af" }}>No skills found.</p>
          ) : (
            <div className="space-y-2">
              {employee.employee_skills.map((employeeSkill) => {
                const levelStyle = levelColors[employeeSkill.level] ?? levelColors["Beginner"];
                return (
                  <div
                    key={employeeSkill.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: "#f0f2f8" }}
                  >
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>
                        {employeeSkill.skill.name}
                      </p>

                      {editingSkillId !== employeeSkill.id && (
                        <span
                          className="rounded-lg px-2 py-0.5 text-xs font-medium"
                          style={levelStyle}
                        >
                          {employeeSkill.level}
                        </span>
                      )}
                    </div>

                    {editingSkillId === employeeSkill.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editingLevel}
                          onChange={(event) =>
                            setEditingLevel(event.target.value as SkillLevel)
                          }
                          className="rounded-xl px-3 py-1.5 text-sm"
                          style={{ border: "1px solid #e8eaf0", background: "#ffffff", color: "#1a1a2e", outline: "none" }}
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Expert">Expert</option>
                        </select>

                        <Button
                          type="button"
                          onClick={() => handleUpdateSkill(employeeSkill.skill.id)}
                          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                          style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none" }}
                        >
                          Save
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingSkillId(null)}
                          className="rounded-xl px-3 py-1.5 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSkillId(employeeSkill.id);
                            setEditingLevel(employeeSkill.level as SkillLevel);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white"
                          title="Edit skill"
                        >
                          <Pencil style={{ width: "13px", height: "13px", color: "#6c63ff" }} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSkill(employeeSkill.skill.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                          title="Remove skill"
                        >
                          <Trash2 style={{ width: "13px", height: "13px", color: "#ef4444" }} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmployeeDetailsPage;
