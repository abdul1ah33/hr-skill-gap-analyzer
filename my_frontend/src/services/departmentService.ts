import api from "./api";
import type { Department, CreateDepartmentData } from "../types/department";

export async function getDepartments(): Promise<Department[]> {
  const response = await api.get<Department[]>("/departments/");
  return response.data;
}

export async function createDepartment(
  data: CreateDepartmentData
): Promise<Department> {
  const response = await api.post(
    "/departments/",
    data
  );

  return response.data;
}

export async function deleteDepartment(
  departmentId: number
): Promise<void> {
  await api.delete(
    `/departments/${departmentId}`
  );
}