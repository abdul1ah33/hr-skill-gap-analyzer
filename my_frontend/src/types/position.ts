import type { Department } from "./department";


export interface Position {
  id: number;
  title: string;
  department_id: number | null;
  created_at: string;
  updated_at: string;
  department?: Department;
}