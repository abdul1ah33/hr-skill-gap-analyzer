import api from "./api";
import type { Position } from "../types/position";

export async function getPositions(): Promise<Position[]> {
  const response = await api.get<Position[]>("/positions/");
  return response.data;
}

export async function getPositionById(positionId: number): Promise<Position> {
  const response = await api.get<Position>(`/positions/${positionId}`);
  return response.data;
}

export async function createPosition(data: {
  title: string;
  department_id: number;
}) {
  const response = await api.post("/positions/", data);
  return response.data;
}

export async function updatePosition(
  positionId: number,
  data: { title?: string; department_id?: number }
): Promise<Position> {
  const response = await api.put(`/positions/${positionId}`, data);
  return response.data;
}

export async function deletePosition(positionId: number): Promise<void> {
  await api.delete(`/positions/${positionId}`);
}

export async function getPositionCount(): Promise<number> {
  const response = await api.get<{ count: number }>("/positions/count");
  return response.data.count;
}