import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { extractResume } from "../services/resumeService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import FormField from "../components/FormField";

import { createEmployee } from "../services/employeeService";
import { createEmployeeSchema } from "../schemas/employeeSchema";

import type { z } from "zod";
import { useState } from "react";
import { FileUp, ArrowLeft, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

type CreateEmployeeForm = z.infer<typeof createEmployeeSchema>;

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
          background: "#ede8ff",
          color: "#6c63ff",
          border: "1px solid #d4cfff",
        }}
      >
        <ArrowLeft style={{ width: "15px", height: "15px" }} />
        Back to Employees
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1a1a2e" }}>
          Add Employee
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>
          Create a new employee record manually or import from a resume
        </p>
      </div>

      {/* PDF/DOCX upload zone */}
      <div
        className="flex items-center justify-between rounded-2xl p-5"
        style={{
          background: "#ede8ff",
          border: "1px dashed #6c63ff",
        }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>
            Import from Resume
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "#6b7280" }}>
            Upload a PDF or DOCX file to auto-fill employee information
          </p>
        </div>

        <label
          htmlFor="resume-upload"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
          style={{
            background: uploadingResume
              ? "#9ca3af"
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
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <UserPlus style={{ width: "18px", height: "18px", color: "#6c63ff" }} />
          <h2 className="text-base font-semibold" style={{ color: "#1a1a2e" }}>
            Employee Information
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "#6b7280" }}>
                First Name
              </label>
              <FormField error={errors.first_name?.message}>
                <Input
                  type="text"
                  {...register("first_name")}
                  placeholder="e.g. John"
                  className="rounded-xl"
                  style={{ border: "1px solid #e8eaf0", background: "#f0f2f8" }}
                />
              </FormField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "#6b7280" }}>
                Last Name
              </label>
              <FormField error={errors.last_name?.message}>
                <Input
                  type="text"
                  {...register("last_name")}
                  placeholder="e.g. Doe"
                  className="rounded-xl"
                  style={{ border: "1px solid #e8eaf0", background: "#f0f2f8" }}
                />
              </FormField>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "#6b7280" }}>
              Email Address
            </label>
            <FormField error={errors.email?.message}>
              <Input
                type="email"
                {...register("email")}
                placeholder="e.g. john.doe@company.com"
                className="rounded-xl"
                style={{ border: "1px solid #e8eaf0", background: "#f0f2f8" }}
              />
            </FormField>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "#6b7280" }}>
              Phone Number
            </label>
            <FormField error={errors.phone?.message}>
              <Input
                type="text"
                {...register("phone")}
                placeholder="e.g. +1 (555) 000-0000"
                className="rounded-xl"
                style={{ border: "1px solid #e8eaf0", background: "#f0f2f8" }}
              />
            </FormField>
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
