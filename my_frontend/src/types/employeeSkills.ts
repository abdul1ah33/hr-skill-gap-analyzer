export type SkillLevel =
  | "Beginner"
  | "Intermediate"
  | "Advanced";

export interface EmployeeSkill {
  id: number;
  employee_id: number;
  skill_id: number;
  level: SkillLevel;
  verified?: boolean;
  last_assessed_at?: string | null;
  skill: {
    id: number;
    name: string;
  };
}

export interface AddEmployeeSkillData {
  skill_id: number;
  level: SkillLevel;
}