export interface Employee {
  id?: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string; // mapped to work_email
  personalEmail?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
  
  // Employment info
  departmentId: number;
  roleId: number; // positionId on backend
  managerId?: number;
  employmentType?: string; // e.g. Full-time, Part-time, Contract
  hireDate: string;
  salary?: number;
  status: string; // mapped to employment_status: Active, Terminated, On Leave
  
  // AI and skill info
  yearsExperience?: number;
  educationLevel?: string;
  certifications?: string; // Can be serialized in notes or sent as text
  skills?: string[]; // array of skill names or IDs
}

export interface Department {
  id?: number;
  name: string;
  description?: string;
  managerEmployeeId?: number;
}

export interface Position {
  id?: number;
  title: string;
  departmentId: number;
  description?: string;
  level?: string;
  salaryGrade?: string;
}

export interface Skill {
  id?: number;
  name: string;
  category?: string;
  description?: string;
}

export interface EmployeeSkill {
  id?: number;
  employeeId: number;
  skillId: number;
  level?: number;
  yearsExperience?: number;
  verified?: boolean;
}
