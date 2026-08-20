import api from "./api";
import type { Position } from "../types/position";

export async function getPositions(): Promise<Position[]> {
  const response = await api.get<Position[]>("/positions/");
  return response.data;
}

export async function createPosition(data: {
  title: string;
  department_id: number;
}) {
  const response = await api.post("/positions/", data);

  return response.data;
}

export async function deletePosition(
  positionId: number
): Promise<void> {
  await api.delete(`/positions/${positionId}`);
}