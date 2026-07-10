import React from "react";
import type { Employee, Department, Position } from "../types/employee";
import { Edit, Trash2, Eye } from "lucide-react";

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

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "badge badge-active";
      case "on leave":
      case "leave":
        return "badge badge-on-leave";
      case "terminated":
      case "inactive":
        return "badge badge-terminated";
      default:
        return "badge";
    }
  };

  return (
    <div className="table-container">
      {employees.length === 0 ? (
        <div className="no-data">
          <p>No employees found matching the search criteria.</p>
        </div>
      ) : (
        <table className="custom-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <div className="employee-cell">
                    <div className="employee-initials">
                      {emp.firstName[0]}
                      {emp.lastName[0]}
                    </div>
                    <div className="employee-name-stack">
                      <span className="employee-fullname">
                        {emp.firstName} {emp.lastName}
                      </span>
                      <span className="employee-number">{emp.employeeNumber}</span>
                    </div>
                  </div>
                </td>
                <td>{emp.email}</td>
                <td>{getDepartmentName(emp.departmentId)}</td>
                <td>{getPositionTitle(emp.roleId)}</td>
                <td>
                  <span className={getStatusBadgeClass(emp.status)}>
                    {emp.status}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: "0.25rem" }}>
                    <button
                      className="btn-icon view"
                      onClick={() => onView(emp)}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="btn-icon edit"
                      onClick={() => onEdit(emp)}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => emp.id && onDelete(emp.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default EmployeeTable;
