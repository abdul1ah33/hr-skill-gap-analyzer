import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "../components/FormField";

import { getDepartments } from "../services/departmentService";
import { getPositions } from "../services/positionService";

import type { Department } from "../types/department";
import type { Position } from "../types/position";

import { getEmployeeById, updateEmployee } from "../services/employeeService";
import type { Employee } from "../types/employee";
import { updateEmployeeSchema } from "../schemas/employeeSchema";

import { ArrowLeft, Save, UserCog } from "lucide-react";

type UpdateEmployeeForm = z.infer<typeof updateEmployeeSchema>;

function EditEmployeePage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateEmployeeForm>({
    resolver: zodResolver(updateEmployeeSchema),
  });

  async function onSubmit(data: UpdateEmployeeForm) {
    try {
      await updateEmployee(Number(id), data);
      navigate(`/employees/${id}`);
    } catch (error) {
      console.error("Failed to update employee:", error);
    }
  }

  useEffect(() => {
    if (!id) {
      return;
    }

    getEmployeeById(Number(id))
      .then((data) => {
        setEmployee(data);
        reset({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone ?? "",
          department_id: data.department_id ?? null,
          position_id: data.position_id,
          notes: data.notes ?? "",
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }, [id, reset]);

  useEffect(() => {
    Promise.all([getDepartments(), getPositions()])
      .then(([departmentsData, positionsData]) => {
        setDepartments(departmentsData);
        setPositions(positionsData);
      })
      .catch((error) => {
        console.error("Failed to load departments and positions:", error);
      });
  }, []);

  if (!employee) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to={`/employees/${id}`}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
        style={{
          background: "var(--accent)",
          color: "var(--primary)",
          border: "1px solid var(--accent)",
        }}
      >
        <ArrowLeft style={{ width: "15px", height: "15px" }} />
        Back to Employee
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Edit Employee
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
          {employee.first_name} {employee.last_name} Â· {employee.employee_number}
        </p>
      </div>

      {/* Form card */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <UserCog style={{ width: "18px", height: "18px", color: "var(--primary)" }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            Employee Information
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                First Name
              </label>
              <FormField error={errors.first_name?.message}>
                <Input
                  type="text"
                  {...register("first_name")}
                  className="rounded-xl"
                  style={{ border: "1px solid var(--border)", background: "var(--muted)" }}
                />
              </FormField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                Last Name
              </label>
              <FormField error={errors.last_name?.message}>
                <Input
                  type="text"
                  {...register("last_name")}
                  className="rounded-xl"
                  style={{ border: "1px solid var(--border)", background: "var(--muted)" }}
                />
              </FormField>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
              Email Address
            </label>
            <FormField error={errors.email?.message}>
              <Input
                type="email"
                {...register("email")}
                className="rounded-xl"
                style={{ border: "1px solid var(--border)", background: "var(--muted)" }}
              />
            </FormField>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
              Phone Number
            </label>
            <FormField error={errors.phone?.message}>
              <Input
                type="text"
                {...register("phone")}
                className="rounded-xl"
                style={{ border: "1px solid var(--border)", background: "var(--muted)" }}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                Department
              </label>
              <FormField error={errors.department_id?.message}>
                <select
                  {...register("department_id", {
                    setValueAs: (value) =>
                      value === "" || value === null || value === undefined
                        ? null
                        : Number(value),
                  })}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--muted)",
                    color: "var(--foreground)",
                    outline: "none",
                    height: "38px",
                  }}
                >
                  <option value="">No Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                Position
              </label>
              <FormField error={errors.position_id?.message}>
                <select
                  {...register("position_id", { valueAsNumber: true })}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--muted)",
                    color: "var(--foreground)",
                    outline: "none",
                    height: "38px",
                  }}
                >
                  <option value="">Select Position</option>
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.title}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
              Notes
            </label>
            <FormField error={errors.notes?.message}>
              <textarea
                {...register("notes")}
                rows={3}
                className="w-full rounded-xl px-4 py-2.5 text-sm resize-none outline-none transition-all"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--muted)",
                  color: "var(--foreground)",
                }}
              />
            </FormField>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none" }}
            >
              <Save style={{ width: "16px", height: "16px" }} />
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditEmployeePage;
