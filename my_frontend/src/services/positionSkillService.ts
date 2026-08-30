import api from "./api";
import type {
  PositionSkill,
  AddPositionSkillData,
  UpdatePositionSkillData,
} from "../types/positionSkill";

export async function getPositionSkills(
  positionId: number
): Promise<PositionSkill[]> {
  const response = await api.get(`/positionSkills/${positionId}/skills`);
  return response.data;
}

export async function generatePositionSkills(
  positionId: number
): Promise<{ position_id: number; skills: PositionSkill[] }> {
  const response = await api.post(
    `/positionSkills/${positionId}/generate-skills`
  );
  return response.data;
}

export async function addPositionSkill(
  positionId: number,
  data: AddPositionSkillData
): Promise<PositionSkill> {
  const response = await api.post(
    `/positionSkills/${positionId}/skills`,
    data
  );
  return response.data;
}

export async function updatePositionSkill(
  positionId: number,
  psId: number,
  data: UpdatePositionSkillData
): Promise<PositionSkill> {
  const response = await api.put(
    `/positionSkills/${positionId}/skills/${psId}`,
    data
  );
  return response.data;
}

export async function deletePositionSkill(
  positionId: number,
  psId: number
): Promise<void> {
  await api.delete(`/positionSkills/${positionId}/skills/${psId}`);
}
