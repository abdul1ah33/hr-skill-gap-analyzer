import api from "../api/axios";

export interface SkillAlias {
  id: number;
  skill_id: number;
  alias: string;
  created_at?: string;
  updated_at?: string;
}

export const getSkillAliases = () =>
  api.get<SkillAlias[]>("/skill-aliases").then((res) => res.data);

export const getAliasesForSkill = (skillId: number) =>
  api.get<SkillAlias[]>(`/skill-aliases/skill/${skillId}`).then((res) => res.data);

export const createSkillAlias = (data: { skill_id: number; alias: string }) =>
  api.post<SkillAlias>("/skill-aliases/", data).then((res) => res.data);

export const deleteSkillAlias = (aliasId: number) =>
  api.delete(`/skill-aliases/${aliasId}`).then((res) => res.data);
