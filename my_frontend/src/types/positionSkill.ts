export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export interface PositionSkill {
  id: number;
  position_id: number;
  skill_id: number;
  required_skill_level: SkillLevel;
  is_essential: boolean;
  short_description: string | null;
  skill: {
    id: number;
    name: string;
    category?: string | null;
  };
}

export interface AddPositionSkillData {
  skill_id: number;
  required_skill_level: SkillLevel;
  is_essential: boolean;
  short_description?: string;
}

export interface UpdatePositionSkillData {
  required_skill_level?: SkillLevel;
  is_essential?: boolean;
  short_description?: string;
}
