import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { extractResume } from "../services/resumeService";

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
import { useState } from "react";

type CreateEmployeeForm = z.infer<
  typeof createEmployeeSchema
>;

function AddEmployeePage() {
  const navigate = useNavigate();

  const [uploadingResume, setUploadingResume] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeForm>({
    resolver: zodResolver(createEmployeeSchema),
  });

  const handleResumeUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const extension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    if (extension !== ".pdf" && extension !== ".docx") {
      alert("Only PDF and DOCX files are supported.");
      return;
    }

    try {
      setUploadingResume(true);

      const result = await extractResume(file);

      navigate(`/employees/${result.employee_id}`);

    } catch (error) {
      console.error(error);

      alert("Failed to process the resume.");

    } finally {
      setUploadingResume(false);
    }
  };

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

      <div>
        <label
          htmlFor="resume-upload"
          className="inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {uploadingResume
            ? "Processing Resume..."
            : "Add from PDF / DOCX"}
        </label>

        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.docx"
          onChange={handleResumeUpload}
          disabled={uploadingResume}
          className="hidden"
        />
      </div>

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