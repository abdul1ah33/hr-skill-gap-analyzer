import api from "./api";
import type { SkillGapResult } from "../types/gapAnalysis";

export async function getSkillGapAnalysis(
  employeeId: number
): Promise<SkillGapResult> {
  const response = await api.get<SkillGapResult>(
    `/employees/${employeeId}/skill-gap`
  );
  return response.data;
}
