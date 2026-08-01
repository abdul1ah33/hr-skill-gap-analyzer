import React, { useState, useEffect } from "react";
import type { Employee, Department, Position, Skill } from "../types/employee";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { User, Briefcase, Award, Check } from "lucide-react";

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeeData: Partial<Employee>) => void;
  employee?: Employee | null;
  departments: Department[];
  positions: Position[];
  skills: Skill[];
  employees: Employee[];
}

type FormTab = "personal" | "employment" | "skills";

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  employee,
  departments,
  positions,
  skills,
  employees,
}) => {
  const [activeTab, setActiveTab] = useState<FormTab>("personal");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("Male");

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [departmentId, setDepartmentId] = useState<number>(0);
  const [roleId, setRoleId] = useState<number>(0);
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [hireDate, setHireDate] = useState(new Date().toISOString().split("T")[0]);
  const [salary, setSalary] = useState<number>(5000);
  const [status, setStatus] = useState("Active");

  const [yearsExperience, setYearsExperience] = useState<number>(0);
  const [educationLevel, setEducationLevel] = useState("Bachelor's Degree");
  const [certifications, setCertifications] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const filteredPositions = positions.filter((pos) => pos.departmentId === departmentId);

  useEffect(() => {
    if (employee) {
      setFirstName(employee.firstName || "");
      setLastName(employee.lastName || "");
      setEmail(employee.email || "");
      setPhone(employee.phone || "");
      setAddress(employee.address || "");
      setBirthDate(employee.birthDate || "");
      setGender(employee.gender || "Male");
      setEmployeeNumber(employee.employeeNumber || "");
      setDepartmentId(employee.departmentId || (departments[0]?.id || 0));
      setRoleId(employee.roleId || 0);
      setEmploymentType(employee.employmentType || "Full-time");
      setHireDate(employee.hireDate || "");
      setSalary(employee.salary || 5000);
      setStatus(employee.status || "Active");
      setYearsExperience(employee.yearsExperience || 0);
      setEducationLevel(employee.educationLevel || "Bachelor's Degree");
      setCertifications(employee.certifications || "");
      setSelectedSkills(employee.skills || []);
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setBirthDate("");
      setGender("Male");
      const nextNum = employees.length > 0
        ? `EMP-${String(Math.max(...employees.map((e) => parseInt(e.employeeNumber?.replace("EMP-", "") || "0") || 0)) + 1).padStart(3, "0")}`
        : "EMP-001";
      setEmployeeNumber(nextNum);
      const defaultDeptId = departments[0]?.id || 0;
      setDepartmentId(defaultDeptId);
      const deptPositions = positions.filter((p) => p.departmentId === defaultDeptId);
      setRoleId(deptPositions[0]?.id || 0);
      setEmploymentType("Full-time");
      setHireDate(new Date().toISOString().split("T")[0]);
      setSalary(5000);
      setStatus("Active");
      setYearsExperience(0);
      setEducationLevel("Bachelor's Degree");
      setCertifications("");
      setSelectedSkills([]);
    }
    setActiveTab("personal");
  }, [employee, isOpen, departments, positions, employees]);

  const handleDepartmentChange = (deptId: number) => {
    setDepartmentId(deptId);
    const deptPositions = positions.filter((p) => p.departmentId === deptId);
    setRoleId(deptPositions[0]?.id || 0);
  };

  const handleSkillToggle = (skillName: string) => {
    if (selectedSkills.includes(skillName)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skillName));
    } else {
      setSelectedSkills([...selectedSkills, skillName]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !employeeNumber) {
      alert("Please fill in required fields");
      return;
    }

    onSubmit({
      firstName,
      lastName,
      email,
      phone,
      address,
      birthDate,
      gender,
      employeeNumber,
      departmentId,
      roleId,
      employmentType,
      hireDate,
      salary: Number(salary),
      status,
      yearsExperience: Number(yearsExperience),
      educationLevel,
      certifications,
      skills: selectedSkills,
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? `Edit ${employee.firstName} ${employee.lastName}` : "Add New Employee"}
      description="Create or update employee details and skill assignments."
    >
      {/* Form Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        {[
          { id: "personal", label: "Personal", icon: User },
          { id: "employment", label: "Employment", icon: Briefcase },
          { id: "skills", label: "Skills", icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as FormTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                isActive
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
        {activeTab === "personal" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Work Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {activeTab === "employment" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Employee Number *</label>
              <input
                type="text"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Department *</label>
              <select
                value={departmentId}
                onChange={(e) => handleDepartmentChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Position / Role *</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {filteredPositions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === "skills" && (
          <div className="space-y-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Select Skills</label>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                {skills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill.name);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => handleSkillToggle(skill.name)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-purple-600 text-white shadow"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-purple-400"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{skill.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="gradient" type="submit">
            {employee ? "Save Changes" : "Create Employee"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default EmployeeForm;
