import api from "./api";
import type { Department } from "../types/department";

export async function getDepartments(): Promise<Department[]> {
  const response = await api.get<Department[]>("/departments/");
  return response.data;
}