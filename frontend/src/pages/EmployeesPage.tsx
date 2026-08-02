import React, { useState } from "react";
import type { Employee, Department, Position, Skill } from "../types/employee";
import EmployeeTable from "../components/EmployeeTable";
import EmployeeForm from "../components/EmployeeForm";
import EmployeeCard from "../components/EmployeeCard";
import { Plus, Search, Filter, Users } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

interface EmployeesPageProps {
  employees: Employee[];
  departments: Department[];
  positions: Position[];
  skills: Skill[];
  setSkills: (skills: Skill[]) => void;
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
  setSkills,
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
    if (window.confirm("Are you sure you want to delete this employee profile?")) {
      try {
        await removeEmployee(id);
      } catch (err) {
        console.error("Error deleting employee", err);
      }
    }
  };

  const handleSkillAdded = (newSkill: Skill) => {
    setSkills([...skills, newSkill]);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Employee Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ClickUp-inspired task table & right-side profile drawer with AI skill matrix.
          </p>
        </div>

        <Button variant="gradient" onClick={handleAddClick} className="gap-2 shadow-lg shadow-purple-500/20">
          <Plus className="w-4 h-4" /> Add Employee
        </Button>
      </div>

      {/* Control Bar Filters & Search */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or employee number..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </Card>

      {/* Main Employee Table */}
      <EmployeeTable
        employees={filteredEmployees}
        departments={departments}
        positions={positions}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onView={handleViewClick}
      />

      {/* Add / Edit Form Modal */}
      <EmployeeForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        employee={selectedEmployee}
        departments={departments}
        positions={positions}
        skills={skills}
        employees={employees}
        onSkillAdded={handleSkillAdded}
      />

      {/* Right-side Drawer Profile Card */}
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
