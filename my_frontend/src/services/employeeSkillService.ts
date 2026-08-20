import api from "./api";
import type { EmployeeSkill, SkillLevel, AddEmployeeSkillData } from "../types/employeeSkills";

export async function getEmployeeSkills(
  employeeId: number
): Promise<EmployeeSkill[]> {
  const response = await api.get(
    `/employees/${employeeId}/skills`
  );

  return response.data;
}

export async function addEmployeeSkill(
  employeeId: number,
  data: AddEmployeeSkillData
): Promise<EmployeeSkill> {
  const response = await api.post(
    `/employees/${employeeId}/skills`,
    data
  );

  return response.data;
}

export async function updateEmployeeSkill(
  employeeId: number,
  skillId: number,
  data: { level: SkillLevel }
): Promise<EmployeeSkill> {
  const response = await api.put(
    `/employees/${employeeId}/skills/${skillId}`,
    data
  );

  return response.data;
}

export async function deleteEmployeeSkill(
  employeeId: number,
  skillId: number
): Promise<void> {
  await api.delete(
    `/employees/${employeeId}/skills/${skillId}`
  );
}