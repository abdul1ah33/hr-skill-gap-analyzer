import api from "./api";
import type { Skill } from "../types/skill";


export async function getSkills(): Promise<Skill[]> {
  const response = await api.get("/skills/");
  return response.data;
}