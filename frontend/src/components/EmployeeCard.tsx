import React, { useState } from "react";
import type { Employee, Department, Position } from "../types/employee";
import { Drawer } from "./ui/Drawer";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import {
  Briefcase,
  Award,
  Sparkles,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmployeeCardProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  positions: Position[];
  employees: Employee[];
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  isOpen,
  onClose,
  departments,
  positions,
  employees,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "skills" | "employment" | "ai">("overview");
  const navigate = useNavigate();

  if (!employee) return null;

  const getDepartmentName = (id: number) => {
    const dept = departments.find((d) => d.id === id);
    return dept ? dept.name : `Dept #${id}`;
  };

  const getPositionTitle = (id: number) => {
    const pos = positions.find((p) => p.id === id);
    return pos ? pos.title : `Role #${id}`;
  };

  const getManagerName = (id?: number) => {
    if (!id) return "Top Executive";
    const mgr = employees.find((e) => e.id === id);
    return mgr ? `${mgr.firstName} ${mgr.lastName}` : `Manager #${id}`;
  };

  const initials = `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`${employee.firstName} ${employee.lastName}`}
      subtitle={`${getPositionTitle(employee.roleId)} • ${getDepartmentName(employee.departmentId)}`}
    >
      {/* Header Profile Banner */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-900/10 via-purple-500/10 to-indigo-900/10 border border-purple-500/20">
        <div className="w-16 h-16 rounded-2xl bg-gradient-purple flex items-center justify-center text-white font-black text-xl shadow-lg shadow-purple-500/30 flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              {employee.firstName} {employee.lastName}
            </h3>
            <Badge variant={employee.status === "Active" ? "success" : "warning"}>
              {employee.status || "Active"}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            {employee.employeeNumber} • {employee.email}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: "overview", label: "Overview", icon: User },
          { id: "skills", label: "Skills Stack", icon: Award },
          { id: "employment", label: "Employment", icon: Briefcase },
          { id: "ai", label: "AI Assessment", icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                isActive
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Personal Details</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Email</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{employee.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{employee.phone || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Gender & DoB</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{employee.gender || "N/A"} {employee.birthDate ? `(${employee.birthDate})` : ""}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Address</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{employee.address || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "skills" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Verified Skills Stack</h4>
            <Badge variant="primary">{employee.skills?.length || 0} Skills</Badge>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {employee.skills && employee.skills.length > 0 ? (
              employee.skills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300">
                      <Award className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{skill}</span>
                  </div>
                  <Badge variant="secondary" className="text-slate-500 dark:text-slate-400">
                    Proficient
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">No skill tags assigned yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "employment" && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block">Department</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{getDepartmentName(employee.departmentId)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Position Title</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{getPositionTitle(employee.roleId)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Manager</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{getManagerName(employee.managerId)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Hire Date</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{employee.hireDate}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="space-y-4 text-center py-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">AI Skill Gap Assessment Ready</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Compare {employee.firstName}'s skill stack against position requirements using canonical alias resolution.
          </p>
          <Button
            variant="gradient"
            onClick={() => {
              onClose();
              navigate("/assessment");
            }}
            className="gap-2 mx-auto"
          >
            <Sparkles className="w-4 h-4" /> Run Full AI Assessment
          </Button>
        </div>
      )}
    </Drawer>
  );
};

export default EmployeeCard;
