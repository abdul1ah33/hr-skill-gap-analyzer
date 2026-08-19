export interface Position {
  id: number;
  title: string;
  department_id: number;
  created_at: string;
  updated_at: string;
  department?: {
    id: number;
    name: string;
  };
}