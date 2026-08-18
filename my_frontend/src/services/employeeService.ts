import api from "./api";
import type { Employee, CreateEmployeeRequest, EmployeeUpdate } from "../types/employee";

export async function getEmployees(): Promise<Employee[]> {
  const response = await api.get<Employee[]>("/employees");

  return response.data;
}

export async function getEmployeeById(
  id: number
): Promise<Employee> {
  const response = await api.get<Employee>(
    `/employees/${id}`
  );

  return response.data;
}

export async function createEmployee(
  employee: CreateEmployeeRequest
): Promise<Employee> {
  const response = await api.post<Employee>(
    "/employees/",
    employee
  );

  return response.data;
}

export async function updateEmployee(
  id: number,
  data: EmployeeUpdate
) {
  const response = await api.put(
    `/employees/${id}`,
    data
  );

  return response.data;
}