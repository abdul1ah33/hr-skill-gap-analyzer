import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

import FormField from "../components/FormField";

import { createEmployee } from "../services/employeeService";
import {
  createEmployeeSchema,
} from "../schemas/employeeSchema";

import type { z } from "zod";

type CreateEmployeeForm = z.infer<
  typeof createEmployeeSchema
>;

function AddEmployeePage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeForm>({
    resolver: zodResolver(createEmployeeSchema),
  });

  async function onSubmit(data: CreateEmployeeForm) {
    try {
      await createEmployee({
        ...data,

        gender: "",
        employment_type: "",
        employment_status: "",
        salary: "0",

        department_id: 1,
        position_id: 1,

        address: "",
        emergency_contact: "",
        notes: "",
      });

      navigate("/employees");
    } catch (error) {
      console.error(
        "Failed to create employee:",
        error
      );
    }
  }

  return (
    <div>
      <h1>Add Employee</h1>

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
              <input
                type="text"
                {...register("phone")}
              />
            </FormField>

            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Creating..."
                : "Create Employee"}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default AddEmployeePage;