import { useState, useEffect, useCallback, useMemo } from "react";
import type { Employee, Department, Position, Skill } from "../types/employee";
import * as svc from "../services/employeeService";

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all required data in parallel or fallback to mock data if API is not running
      const [empRes, deptRes, posRes, skillRes] = await Promise.allSettled([
        svc.getEmployees(),
        svc.getDepartments(),
        svc.getPositions(),
        svc.getSkills(),
      ]);

      let empData: Employee[] = [];
      let deptData: Department[] = [];
      let posData: Position[] = [];
      let skillData: Skill[] = [];

      if (empRes.status === "fulfilled") {
        empData = empRes.value.data;
      } else {
        console.warn("Failed to fetch employees, using empty list or local storage mock.");
      }

      if (deptRes.status === "fulfilled") {
        deptData = deptRes.value.data;
      }

      if (posRes.status === "fulfilled") {
        posData = posRes.value.data;
      }

      if (skillRes.status === "fulfilled") {
        skillData = skillRes.value.data;
      }

      // Check if we need to initialize with mock data for local development if everything fails
      const storedEmployees = localStorage.getItem("hr_employees");
      const storedDepts = localStorage.getItem("hr_departments");
      const storedPositions = localStorage.getItem("hr_positions");
      const storedSkills = localStorage.getItem("hr_skills");

      if (empData.length === 0) {
        if (storedEmployees) {
          empData = JSON.parse(storedEmployees);
        } else {
          // Default mock data to wow the user on first load
          empData = [
            {
              id: 1,
              employeeNumber: "EMP-001",
              firstName: "Ahmed",
              lastName: "Ali",
              email: "ahmed.ali@company.com",
              phone: "+20123456789",
              gender: "Male",
              birthDate: "1992-05-15",
              address: "123 Nile St, Cairo, Egypt",
              departmentId: 1,
              roleId: 1,
              managerId: undefined,
              employmentType: "Full-time",
              hireDate: "2021-03-10",
              salary: 8500,
              status: "Active",
              yearsExperience: 8,
              educationLevel: "Bachelor's Degree",
              certifications: "AWS Solutions Architect, PMP",
              skills: ["React", "TypeScript", "Node.js", "Python"]
            },
            {
              id: 2,
              employeeNumber: "EMP-002",
              firstName: "Sarah",
              lastName: "Connor",
              email: "sarah.connor@company.com",
              phone: "+15550199",
              gender: "Female",
              birthDate: "1990-11-23",
              address: "742 Evergreen Terr, Springfield",
              departmentId: 2,
              roleId: 2,
              managerId: 1,
              employmentType: "Full-time",
              hireDate: "2022-06-01",
              salary: 7200,
              status: "Active",
              yearsExperience: 6,
              educationLevel: "Master's Degree",
              certifications: "SHRM-CP",
              skills: ["Recruiting", "Employee Relations", "HR Strategy"]
            },
            {
              id: 3,
              employeeNumber: "EMP-003",
              firstName: "Omar",
              lastName: "Farooq",
              email: "omar.farooq@company.com",
              phone: "+923001234567",
              gender: "Male",
              birthDate: "1995-08-04",
              address: "G-11, Islamabad, Pakistan",
              departmentId: 1,
              roleId: 3,
              managerId: 1,
              employmentType: "Contract",
              hireDate: "2023-01-15",
              salary: 5000,
              status: "On Leave",
              yearsExperience: 4,
              educationLevel: "Bachelor's Degree",
              certifications: "Scrum Master",
              skills: ["React", "CSS", "UI/UX Design"]
            }
          ];
          localStorage.setItem("hr_employees", JSON.stringify(empData));
        }
      }

      if (deptData.length === 0) {
        if (storedDepts) {
          deptData = JSON.parse(storedDepts);
        } else {
          deptData = [
            { id: 1, name: "IT & Engineering", description: "Technical operations and development" },
            { id: 2, name: "Human Resources", description: "Talent acquisition and management" },
            { id: 3, name: "Marketing", description: "Brand promotion and campaigns" }
          ];
          localStorage.setItem("hr_departments", JSON.stringify(deptData));
        }
      }

      if (posData.length === 0) {
        if (storedPositions) {
          posData = JSON.parse(storedPositions);
        } else {
          posData = [
            { id: 1, title: "Tech Lead", departmentId: 1, level: "Senior", salaryGrade: "G8" },
            { id: 2, title: "HR Manager", departmentId: 2, level: "Manager", salaryGrade: "G7" },
            { id: 3, title: "Frontend Developer", departmentId: 1, level: "Mid-level", salaryGrade: "G5" },
            { id: 4, title: "Marketing Specialist", departmentId: 3, level: "Mid-level", salaryGrade: "G4" }
          ];
          localStorage.setItem("hr_positions", JSON.stringify(posData));
        }
      }

      if (skillData.length === 0) {
        if (storedSkills) {
          skillData = JSON.parse(storedSkills);
        } else {
          skillData = [
            { id: 1, name: "React", category: "Frontend", description: "UI Framework" },
            { id: 2, name: "TypeScript", category: "Language", description: "Typed JavaScript" },
            { id: 3, name: "Python", category: "Backend", description: "Programming Language" },
            { id: 4, name: "Node.js", category: "Backend", description: "JavaScript Runtime" }
          ];
          localStorage.setItem("hr_skills", JSON.stringify(skillData));
        }
      }

      setEmployees(empData);
      setDepartments(deptData);
      setPositions(posData);
      setSkills(skillData);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Employee actions
  const addEmployee = async (employeeData: Partial<Employee>) => {
    setLoading(true);
    try {
      let newEmployee: Employee;
      try {
        const response = await svc.createEmployee(employeeData);
        newEmployee = response.data;
      } catch (apiErr) {
        // Fallback to local storage CRUD
        newEmployee = {
          ...employeeData,
          id: employees.length > 0 ? Math.max(...employees.map(e => e.id || 0)) + 1 : 1
        } as Employee;
      }

      const updated = [...employees, newEmployee];
      setEmployees(updated);
      localStorage.setItem("hr_employees", JSON.stringify(updated));
      return newEmployee;
    } catch (err: any) {
      setError(err.message || "Failed to create employee.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const editEmployee = async (id: number, employeeData: Partial<Employee>) => {
    setLoading(true);
    try {
      let updatedEmployee: Employee;
      try {
        const response = await svc.updateEmployee(id, employeeData);
        updatedEmployee = response.data;
      } catch (apiErr) {
        updatedEmployee = { ...employeeData, id } as Employee;
      }

      const updated = employees.map(emp => emp.id === id ? { ...emp, ...updatedEmployee } : emp);
      setEmployees(updated);
      localStorage.setItem("hr_employees", JSON.stringify(updated));
      return updatedEmployee;
    } catch (err: any) {
      setError(err.message || "Failed to update employee.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeEmployee = async (id: number) => {
    setLoading(true);
    try {
      try {
        await svc.deleteEmployee(id);
      } catch (apiErr) {
        // Continue to local storage delete even if API fails
      }

      const updated = employees.filter(emp => emp.id !== id);
      setEmployees(updated);
      localStorage.setItem("hr_employees", JSON.stringify(updated));
    } catch (err: any) {
      setError(err.message || "Failed to delete employee.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (!emp) return false;
      const firstName = emp.firstName || "";
      const lastName = emp.lastName || "";
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      const email = (emp.email || "").toLowerCase();
      const empNum = (emp.employeeNumber || "").toLowerCase();
      const search = (searchQuery || "").toLowerCase();

      const matchesSearch = 
        fullName.includes(search) || 
        email.includes(search) ||
        empNum.includes(search);

      const matchesDept = 
        filterDepartment === "all" || 
        (emp.departmentId !== undefined && emp.departmentId !== null && emp.departmentId.toString() === filterDepartment);

      const matchesStatus = 
        filterStatus === "all" || 
        (emp.status || "").toLowerCase() === filterStatus.toLowerCase();

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchQuery, filterDepartment, filterStatus]);

  // Master lists updates (for local fallback CRUD of Departments, Roles, Skills)
  const addDepartment = async (dept: Partial<Department>) => {
    try {
      let newDept: Department;
      try {
        const res = await svc.createDepartment(dept);
        newDept = res.data;
      } catch {
        newDept = { ...dept, id: departments.length > 0 ? Math.max(...departments.map(d => d.id || 0)) + 1 : 1 } as Department;
      }
      const updated = [...departments, newDept];
      setDepartments(updated);
      localStorage.setItem("hr_departments", JSON.stringify(updated));
    } catch (err: any) {
      setError(err.message || "Failed to add department");
    }
  };

  const deleteDepartment = async (id: number) => {
    try {
      try {
        await svc.deleteDepartment(id);
      } catch {}
      const updated = departments.filter(d => d.id !== id);
      setDepartments(updated);
      localStorage.setItem("hr_departments", JSON.stringify(updated));
    } catch (err: any) {
      setError(err.message || "Failed to delete department");
    }
  };

  const addPosition = async (pos: Partial<Position>) => {
    try {
      let newPos: Position;
      try {
        const res = await svc.createPosition(pos);
        newPos = res.data;
      } catch {
        newPos = { ...pos, id: positions.length > 0 ? Math.max(...positions.map(p => p.id || 0)) + 1 : 1 } as Position;
      }
      const updated = [...positions, newPos];
      setPositions(updated);
      localStorage.setItem("hr_positions", JSON.stringify(updated));
    } catch (err: any) {
      setError(err.message || "Failed to add position");
    }
  };

  const deletePosition = async (id: number) => {
    try {
      try {
        await svc.deletePosition(id);
      } catch {}
      const updated = positions.filter(p => p.id !== id);
      setPositions(updated);
      localStorage.setItem("hr_positions", JSON.stringify(updated));
    } catch (err: any) {
      setError(err.message || "Failed to delete position");
    }
  };

  const addSkill = async (skill: Partial<Skill>) => {
    try {
      const res = await svc.createSkill(skill);
      setSkills(prev => [...prev, res.data]);
    } catch (err: any) {
      setError(err.message || "Failed to add skill");
      throw err;
    }
  };

  const editSkill = async (id: number, skill: Partial<Skill>) => {
    try {
      const res = await svc.updateSkill(id, skill);
      setSkills(prev => prev.map(s => s.id === id ? res.data : s));
    } catch (err: any) {
      setError(err.message || "Failed to update skill");
      throw err;
    }
  };

  const deleteSkill = async (id: number) => {
    try {
      await svc.deleteSkill(id);
      setSkills(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete skill");
      throw err;
    }
  };

  return {
    employees,
    departments,
    positions,
    skills,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filterDepartment,
    setFilterDepartment,
    filterStatus,
    setFilterStatus,
    filteredEmployees,
    fetchData,
    addEmployee,
    editEmployee,
    removeEmployee,
    addDepartment,
    deleteDepartment,
    addPosition,
    deletePosition,
    addSkill,
    editSkill,
    deleteSkill
  };
};
