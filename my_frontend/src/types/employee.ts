export interface Department {
  id: number;
  name: string;
}

export interface Position {
  id: number;
  title: string;
  department?: Department;
}

export interface Skill {
  id: number;
  name: string;
}

export interface EmployeeSkill {
  id: number;
  level: string;
  skill: Skill;
  // Set by a graded skill assessment; reset when the level is edited by hand
  verified?: boolean;
  last_assessed_at?: string | null;
}

export interface Education {
  id: number;
  description: string;
}

export interface Certification {
  id: number;
  name: string;
}

export interface Employee {
  employee_number: string;

  first_name: string;
  last_name: string;

  email: string;
  phone: string;

  gender: string;

  department_id: number;
  position_id: number;


  notes: string;

  id: number;

  created_at: string;
  updated_at: string;

  department: Department;
  position: Position;

  employee_skills: EmployeeSkill[];
  education: Education[];
  certifications: Certification[];
}

export interface CreateEmployeeRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  employment_type: string;
  employment_status: string;
  salary: string;
  department_id?: number | null;
  position_id: number;
  address: string;
  emergency_contact: string;
  notes: string;
}

export interface EmployeeUpdate {
  employee_number?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  gender?: string | null;
  years_experience?: number | null;
  department_id?: number | null;
  position_id?: number;
  notes?: string | null;
}