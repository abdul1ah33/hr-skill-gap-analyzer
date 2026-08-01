import React from "react";
import type { Employee, Department, Position } from "../types/employee";
import { Edit, Trash2, Eye, Mail, ArrowUpDown } from "lucide-react";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

interface EmployeeTableProps {
  employees: Employee[];
  departments: Department[];
  positions: Position[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: number) => void;
  onView: (employee: Employee) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  departments,
  positions,
  onEdit,
  onDelete,
  onView,
}) => {
  const getDepartmentName = (id: number) => {
    const dept = departments.find((d) => d.id === id);
    return dept ? dept.name : `Dept #${id}`;
  };

  const getPositionTitle = (id: number) => {
    const pos = positions.find((p) => p.id === id);
    return pos ? pos.title : `Role #${id}`;
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "success";
      case "on leave":
      case "leave":
        return "warning";
      case "terminated":
      case "inactive":
        return "danger";
      default:
        return "secondary";
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
      {employees.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
          No employees found matching the search criteria.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Employee <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold">Department</th>
                <th className="py-3.5 px-4 font-semibold">Position</th>
                <th className="py-3.5 px-4 font-semibold">Skills Matrix</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {employees.map((emp) => {
                const initials = `${emp.firstName?.[0] || "E"}${emp.lastName?.[0] || ""}`;
                const deptName = getDepartmentName(emp.departmentId);
                const roleTitle = getPositionTitle(emp.roleId);

                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors group"
                  >
                    {/* Employee Profile Cell */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-purple flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p
                            onClick={() => onView(emp)}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors"
                          >
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                            <span>{emp.employeeNumber}</span> •{" "}
                            <Mail className="w-3 h-3 inline" /> {emp.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      <Badge variant="secondary" className="font-medium">
                        {deptName}
                      </Badge>
                    </td>

                    {/* Position */}
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {roleTitle}
                    </td>

                    {/* Skills Chips */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {emp.skills && emp.skills.length > 0 ? (
                          emp.skills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No skills listed</span>
                        )}
                        {emp.skills && emp.skills.length > 3 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            +{emp.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge variant={getStatusVariant(emp.status)}>
                        {emp.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onView(emp)}
                          title="View Employee Profile Drawer"
                        >
                          <Eye className="w-4 h-4 text-slate-500 hover:text-purple-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(emp)}
                          title="Edit Employee"
                        >
                          <Edit className="w-4 h-4 text-slate-500 hover:text-purple-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => emp.id && onDelete(emp.id)}
                          title="Delete Employee"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmployeeTable;
