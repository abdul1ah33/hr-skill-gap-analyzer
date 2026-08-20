export type SkillLevel =
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "Expert";

export interface EmployeeSkill {
  id: number;
  employee_id: number;
  skill_id: number;
  level: SkillLevel;
  skill: {
    id: number;
    name: string;
  };
}

export interface AddEmployeeSkillData {
  skill_id: number;
  level: SkillLevel;
}