import api from "../api/axios";
import type { Employee, Department, Position, Skill } from "../types/employee";

// Employees CRUD
export const getEmployees = () =>
  api.get<Employee[]>("/employees");

export const getEmployeeById = (id: number) =>
  api.get<Employee>(`/employees/${id}`);

export const createEmployee = (employee: Partial<Employee>) =>
  api.post<Employee>("/employees", employee);

export const updateEmployee = (id: number, employee: Partial<Employee>) =>
  api.put<Employee>(`/employees/${id}`, employee);

export const deleteEmployee = (id: number) =>
  api.delete(`/employees/${id}`);


// Departments CRUD
export const getDepartments = () =>
  api.get<Department[]>("/departments");

export const createDepartment = (department: Partial<Department>) =>
  api.post<Department>("/departments", department);

export const updateDepartment = (id: number, department: Partial<Department>) =>
  api.put<Department>(`/departments/${id}`, department);

export const deleteDepartment = (id: number) =>
  api.delete(`/departments/${id}`);


// Positions (Roles) CRUD
export const getPositions = () =>
  api.get<Position[]>("/positions");

export const createPosition = (position: Partial<Position>) =>
  api.post<Position>("/positions", position);

export const updatePosition = (id: number, position: Partial<Position>) =>
  api.put<Position>(`/positions/${id}`, position);

export const deletePosition = (id: number) =>
  api.delete(`/positions/${id}`);


// Skills CRUD
export const getSkills = () =>
  api.get<Skill[]>("/skills");

export const createSkill = (skill: Partial<Skill>) =>
  api.post<Skill>("/skills", skill);

export const updateSkill = (id: number, skill: Partial<Skill>) =>
  api.put<Skill>(`/skills/${id}`, skill);

export const deleteSkill = (id: number) =>
  api.delete(`/skills/${id}`);
