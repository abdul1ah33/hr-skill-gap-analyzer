import api from "../api/axios";
import type { Employee, Department, Position, Skill } from "../types/employee";

// ─── Mapper Functions ────────────────────────────────────────────────────────

const mapEmployeeToBackend = (emp: Partial<Employee>): any => {
  const mapped: any = {};
  if (emp.employeeNumber !== undefined) mapped.employee_number = emp.employeeNumber;
  if (emp.firstName !== undefined) mapped.first_name = emp.firstName;
  if (emp.lastName !== undefined) mapped.last_name = emp.lastName;
  if (emp.email !== undefined) mapped.work_email = emp.email;
  if (emp.phone !== undefined) mapped.phone = emp.phone;
  if (emp.gender !== undefined) mapped.gender = emp.gender;
  if (emp.birthDate !== undefined) mapped.birth_date = emp.birthDate;
  if (emp.address !== undefined) mapped.address = emp.address;
  if (emp.departmentId !== undefined) mapped.department_id = emp.departmentId;
  if (emp.roleId !== undefined) mapped.position_id = emp.roleId;
  if (emp.employmentType !== undefined) mapped.employment_type = emp.employmentType;
  if (emp.hireDate !== undefined) mapped.hire_date = emp.hireDate;
  if (emp.salary !== undefined) mapped.salary = emp.salary;
  if (emp.status !== undefined) mapped.employment_status = emp.status;
  if (emp.certifications !== undefined) mapped.notes = emp.certifications;
  return mapped;
};

const mapEmployeeToFrontend = (data: any): Employee => {
  return {
    id: data.id,
    employeeNumber: data.employee_number,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.work_email,
    phone: data.phone || undefined,
    gender: data.gender || undefined,
    birthDate: data.birth_date || undefined,
    address: data.address || undefined,
    departmentId: data.department_id,
    roleId: data.position_id,
    employmentType: data.employment_type || undefined,
    hireDate: data.hire_date,
    salary: data.salary !== null && data.salary !== undefined ? parseFloat(data.salary) : undefined,
    status: data.employment_status || "Active",
    certifications: data.notes || undefined,
    // Safely extract skill list if present in response
    skills: data.employee_skills ? data.employee_skills.map((s: any) => s.skill?.name).filter(Boolean) : []
  };
};

const mapPositionToBackend = (pos: Partial<Position>): any => {
  const mapped: any = {};
  if (pos.title !== undefined) mapped.title = pos.title;
  if (pos.departmentId !== undefined) mapped.department_id = pos.departmentId;
  if (pos.description !== undefined) mapped.description = pos.description;
  if (pos.level !== undefined) mapped.level = pos.level;
  if (pos.salaryGrade !== undefined) mapped.salary_grade = pos.salaryGrade;
  return mapped;
};

const mapPositionToFrontend = (data: any): Position => {
  return {
    id: data.id,
    title: data.title,
    departmentId: data.department_id,
    description: data.description || undefined,
    level: data.level || undefined,
    salaryGrade: data.salary_grade || undefined,
  };
};

// ─── Employees CRUD ─────────────────────────────────────────────────────────

export const getEmployees = () =>
  api.get<any[]>("/employees").then(res => {
    res.data = res.data.map(mapEmployeeToFrontend);
    return res;
  });

export const getEmployeeById = (id: number) =>
  api.get<any>(`/employees/${id}`).then(res => {
    res.data = mapEmployeeToFrontend(res.data);
    return res;
  });

export const createEmployee = (employee: Partial<Employee>) =>
  api.post<any>("/employees", mapEmployeeToBackend(employee)).then(res => {
    res.data = mapEmployeeToFrontend(res.data);
    return res;
  });

export const updateEmployee = (id: number, employee: Partial<Employee>) =>
  api.put<any>(`/employees/${id}`, mapEmployeeToBackend(employee)).then(res => {
    res.data = mapEmployeeToFrontend(res.data);
    return res;
  });

export const deleteEmployee = (id: number) =>
  api.delete(`/employees/${id}`);


// ─── Departments CRUD ───────────────────────────────────────────────────────

export const getDepartments = () =>
  api.get<Department[]>("/departments");

export const createDepartment = (department: Partial<Department>) =>
  api.post<Department>("/departments", department);

export const updateDepartment = (id: number, department: Partial<Department>) =>
  api.put<Department>(`/departments/${id}`, department);

export const deleteDepartment = (id: number) =>
  api.delete(`/departments/${id}`);


// ─── Positions CRUD ─────────────────────────────────────────────────────────

export const getPositions = () =>
  api.get<any[]>("/positions").then(res => {
    res.data = res.data.map(mapPositionToFrontend);
    return res;
  });

export const createPosition = (position: Partial<Position>) =>
  api.post<any>("/positions", mapPositionToBackend(position)).then(res => {
    res.data = mapPositionToFrontend(res.data);
    return res;
  });

export const updatePosition = (id: number, position: Partial<Position>) =>
  api.put<any>(`/positions/${id}`, mapPositionToBackend(position)).then(res => {
    res.data = mapPositionToFrontend(res.data);
    return res;
  });

export const deletePosition = (id: number) =>
  api.delete(`/positions/${id}`);


// ─── Skills CRUD ────────────────────────────────────────────────────────────

export const getSkills = () =>
  api.get<Skill[]>("/skills");

export const createSkill = (skill: Partial<Skill>) =>
  api.post<Skill>("/skills", skill);

export const updateSkill = (id: number, skill: Partial<Skill>) =>
  api.put<Skill>(`/skills/${id}`, skill);

export const deleteSkill = (id: number) =>
  api.delete(`/skills/${id}`);


// ─── Employee Skills CRUD (Nested) ──────────────────────────────────────────

export const getEmployeeSkills = (employeeId: number) =>
  api.get<any[]>(`/employees/${employeeId}/skills`).then(res => {
    res.data = res.data.map(item => ({
      id: item.id,
      employeeId: item.employee_id,
      skillId: item.skill_id,
      level: item.level,
      yearsExperience: item.years_experience,
      verified: item.verified,
      lastAssessed: item.last_assessed
    }));
    return res;
  });

export const addEmployeeSkill = (employeeId: number, data: { skillId: number, level?: string, yearsExperience?: number, verified?: boolean, lastAssessed?: string }) => {
  const payload: any = {
    skill_id: data.skillId
  };
  if (data.level !== undefined) payload.level = data.level;
  if (data.yearsExperience !== undefined) payload.years_experience = data.yearsExperience;
  if (data.verified !== undefined) payload.verified = data.verified;
  if (data.lastAssessed !== undefined) payload.last_assessed = data.lastAssessed;

  return api.post<any>(`/employees/${employeeId}/skills`, payload).then(res => {
    res.data = {
      id: res.data.id,
      employeeId: res.data.employee_id,
      skillId: res.data.skill_id,
      level: res.data.level,
      yearsExperience: res.data.years_experience,
      verified: res.data.verified,
      lastAssessed: res.data.last_assessed
    };
    return res;
  });
};

export const updateEmployeeSkill = (employeeId: number, skillId: number, data: { level?: string, yearsExperience?: number, verified?: boolean, lastAssessed?: string }) => {
  const payload: any = {};
  if (data.level !== undefined) payload.level = data.level;
  if (data.yearsExperience !== undefined) payload.years_experience = data.yearsExperience;
  if (data.verified !== undefined) payload.verified = data.verified;
  if (data.lastAssessed !== undefined) payload.last_assessed = data.lastAssessed;

  return api.put<any>(`/employees/${employeeId}/skills/${skillId}`, payload).then(res => {
    res.data = {
      id: res.data.id,
      employeeId: res.data.employee_id,
      skillId: res.data.skill_id,
      level: res.data.level,
      yearsExperience: res.data.years_experience,
      verified: res.data.verified,
      lastAssessed: res.data.last_assessed
    };
    return res;
  });
};

export const removeEmployeeSkill = (employeeId: number, skillId: number) =>
  api.delete(`/employees/${employeeId}/skills/${skillId}`);


// ─── Position Skills CRUD (Nested) ──────────────────────────────────────────

export const getPositionSkills = (positionId: number) =>
  api.get<any[]>(`/positions/${positionId}/skills`).then(res => {
    res.data = res.data.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description
    }));
    return res;
  });

export const addPositionSkill = (positionId: number, skillId: number) =>
  api.post<any>(`/positions/${positionId}/skills`, { skill_id: skillId });

export const removePositionSkill = (positionId: number, skillId: number) =>
  api.delete(`/positions/${positionId}/skills/${skillId}`);
