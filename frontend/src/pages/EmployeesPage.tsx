import React, { useState } from "react";
import type { Employee, Department, Position, Skill } from "../types/employee";
import EmployeeTable from "../components/EmployeeTable";
import EmployeeForm from "../components/EmployeeForm";
import EmployeeCard from "../components/EmployeeCard";
import { Plus, Search, Filter } from "lucide-react";

interface EmployeesPageProps {
  employees: Employee[];
  departments: Department[];
  positions: Position[];
  skills: Skill[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterDepartment: string;
  setFilterDepartment: (d: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  filteredEmployees: Employee[];
  addEmployee: (emp: Partial<Employee>) => Promise<Employee>;
  editEmployee: (id: number, emp: Partial<Employee>) => Promise<Employee>;
  removeEmployee: (id: number) => Promise<void>;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({
  employees,
  departments,
  positions,
  skills,
  searchQuery,
  setSearchQuery,
  filterDepartment,
  setFilterDepartment,
  filterStatus,
  setFilterStatus,
  filteredEmployees,
  addEmployee,
  editEmployee,
  removeEmployee,
}) => {
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const handleAddClick = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true);
  };

  const handleViewClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsCardOpen(true);
  };

  const handleFormSubmit = async (employeeData: Partial<Employee>) => {
    try {
      if (selectedEmployee && selectedEmployee.id) {
        await editEmployee(selectedEmployee.id, employeeData);
      } else {
        await addEmployee(employeeData);
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error("Error submitting employee form", err);
    }
  };

  const handleDeleteClick = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        await removeEmployee(id);
      } catch (err) {
        console.error("Error deleting employee", err);
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees Directory</h1>
          <p className="page-description">Manage staff details, departments, and AI skill matrices.</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddClick}>
          <Plus size={18} /> Add Employee
        </button>
      </div>

      <div className="controls-bar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, or employee number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filters-wrapper">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Filter size={16} className="text-muted" />
            <select
              className="select-filter"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <select
            className="select-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>

      <EmployeeTable
        employees={filteredEmployees}
        departments={departments}
        positions={positions}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onView={handleViewClick}
      />

      <EmployeeForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        employee={selectedEmployee}
        departments={departments}
        positions={positions}
        skills={skills}
        employees={employees}
      />

      <EmployeeCard
        employee={selectedEmployee}
        isOpen={isCardOpen}
        onClose={() => setIsCardOpen(false)}
        departments={departments}
        positions={positions}
        employees={employees}
      />
    </div>
  );
};

export default EmployeesPage;
