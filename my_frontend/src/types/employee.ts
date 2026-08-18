export interface Department {
  id: number;
  name: string;
}

export interface Position {
  id: number;
  title: string;
}

export interface Skill {
  id: number;
  name: string;
}

export interface EmployeeSkill {
  id: number;
  level: string;
  skill: Skill;
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
  department_id: number;
  position_id: number;
  address: string;
  emergency_contact: string;
  notes: string;
}