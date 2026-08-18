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


import { getEmployeeById, updateEmployee } from "../services/employeeService";
import type { Employee } from "../types/employee";
import {
  createEmployeeSchema,
} from "../schemas/employeeSchema";

type CreateEmployeeForm = z.infer<
  typeof createEmployeeSchema
>;

function EditEmployeePage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [employee, setEmployee] = useState<Employee | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    } = useForm<CreateEmployeeForm>({
    resolver: zodResolver(createEmployeeSchema),
  });

  async function onSubmit(data: CreateEmployeeForm) {
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
        });
        })
        .catch((error) => {
        console.error(error);
        });
    }, [id, reset]);

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