import api from "./api";
import type { Position } from "../types/position";

export async function getPositions(): Promise<Position[]> {
  const response = await api.get<Position[]>("/positions/");
  return response.data;
}