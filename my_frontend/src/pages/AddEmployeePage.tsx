import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { extractResume } from "../services/resumeService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import FormField from "../components/FormField";

import { createEmployee } from "../services/employeeService";
import { createEmployeeSchema } from "../schemas/employeeSchema";

import { getDepartments } from "../services/departmentService";
import { getPositions } from "../services/positionService";
import type { Department } from "../types/department";
import type { Position } from "../types/position";

import type { z } from "zod";
import { useEffect, useState } from "react";
import { FileUp, ArrowLeft, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

type CreateEmployeeForm = z.infer<typeof createEmployeeSchema>;

function AddEmployeePage() {
  const navigate = useNavigate();

  const [uploadingResume, setUploadingResume] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

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
        address: "",
        emergency_contact: "",
        notes: "",
      });

      navigate("/employees");
    } catch (error) {
      console.error("Failed to create employee:", error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/employees"
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
        style={{
          background: "var(--accent)",
          color: "var(--primary)",
          border: "1px solid var(--accent)",
        }}
      >
        <ArrowLeft style={{ width: "15px", height: "15px" }} />
        Back to Employees
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Add Employee
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Create a new employee record manually or import from a resume
        </p>
      </div>

      {/* PDF/DOCX upload zone */}
      <div
        className="flex items-center justify-between rounded-2xl p-5"
        style={{
          background: "var(--accent)",
          border: "1px dashed var(--primary)",
        }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Import from Resume
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
            Upload a PDF or DOCX file to auto-fill employee information
          </p>
        </div>

        <label
          htmlFor="resume-upload"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
          style={{
            background: uploadingResume
              ? "var(--muted-foreground)"
              : "linear-gradient(135deg, #6c63ff, #a78bfa)",
            cursor: uploadingResume ? "not-allowed" : "pointer",
          }}
        >
          <FileUp style={{ width: "16px", height: "16px" }} />
          {uploadingResume ? "Processing..." : "Upload Resume"}
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

      {/* Manual form card */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <UserPlus style={{ width: "18px", height: "18px", color: "var(--primary)" }} />
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
                  placeholder="e.g. John"
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
                  placeholder="e.g. Doe"
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
                placeholder="e.g. john.doe@company.com"
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
                placeholder="e.g. +1 (555) 000-0000"
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

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none" }}
            >
              <UserPlus style={{ width: "16px", height: "16px" }} />
              {isSubmitting ? "Creating..." : "Create Employee"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddEmployeePage;
