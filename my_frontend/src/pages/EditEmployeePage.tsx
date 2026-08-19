import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import FormField from "../components/FormField";

import { getDepartments } from "../services/departmentService";
import { getPositions } from "../services/positionService";

import type { Department } from "../types/department";
import type { Position } from "../types/position";

import { getEmployeeById, updateEmployee } from "../services/employeeService";
import type { Employee } from "../types/employee";
import {
  updateEmployeeSchema,
} from "../schemas/employeeSchema";

type UpdateEmployeeForm = z.infer<
  typeof updateEmployeeSchema
>;

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
        console.error(
        "Failed to update employee:",
        error
        );
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
        Promise.all([
        getDepartments(),
        getPositions(),
    ])
        .then(([departmentsData, positionsData]) => {
        setDepartments(departmentsData);
        setPositions(positionsData);
        })
        .catch((error) => {
            console.error(
                "Failed to load departments and positions:",
                error
            );
        });
    }, []);
    
      if (!employee) {
        return <p>Loading...</p>;
      }
    
  return (
    <div>
      <h1>Edit Employee</h1>

        <Card>
        <CardHeader>
            <CardTitle>Employee Information</CardTitle>
        </CardHeader>

        <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
            <FormField
                label="First Name"
                error={errors.first_name?.message}
            >
                <Input
                type="text"
                {...register("first_name")}
                />
            </FormField>

            <FormField
                label="Last Name"
                error={errors.last_name?.message}
            >
                <Input
                type="text"
                {...register("last_name")}
                />
            </FormField>

            <FormField
                label="Email"
                error={errors.email?.message}
            >
                <Input
                type="email"
                {...register("email")}
                />
            </FormField>

            <FormField
                label="Phone"
                error={errors.phone?.message}
            >
                <Input
                type="text"
                {...register("phone")}
                />
            </FormField>

            <FormField
            label="Department"
            error={errors.department_id?.message}
            >
            <select
                {...register("department_id", {
                setValueAs: (value) =>
                    value === "" ? null : Number(value),
                })}
            >
                <option value="">No Department</option>

                {departments.map((department) => (
                <option
                    key={department.id}
                    value={department.id}
                >
                    {department.name}
                </option>
                ))}
            </select>
            </FormField>

            <FormField
            label="Position"
            error={errors.position_id?.message}
            >
            <select {...register("position_id", {
                valueAsNumber: true,
            })}>
                <option value="">Select Position</option>

                {positions.map((position) => (
                <option
                    key={position.id}
                    value={position.id}
                >
                    {position.title}
                </option>
                ))}
            </select>
            </FormField>

            <FormField
                label="Notes"
                error={errors.notes?.message}
                >
                <textarea
                    {...register("notes")}
                />
            </FormField>

            <Button type="submit">
                Save Changes
            </Button>
            </form>
        </CardContent>
        </Card>
    </div>

  );
}

export default EditEmployeePage;