import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  getDepartments,
  createDepartment,
  deleteDepartment,
} from "../services/departmentService";

import type { Department } from "../types/department";
import { Building2, Plus, Trash2 } from "lucide-react";

function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      return;
    }

    try {
      setCreating(true);

      const department = await createDepartment({
        name: name.trim(),
      });

      setDepartments((current) => [...current, department]);
      setName("");
    } catch (error) {
      console.error("Failed to create department:", error);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(departmentId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this department?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDepartment(departmentId);
      await loadDepartments();
    } catch (error: any) {
      console.error("Failed to delete department:", error);
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert("Failed to delete department.");
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm" style={{ color: "#9ca3af" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1a1a2e" }}>
          Departments
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>
          {departments.length} departments
        </p>
      </div>

      {/* Add Department card */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <h2 className="mb-4 text-base font-semibold" style={{ color: "#1a1a2e" }}>
          Add Department
        </h2>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Department name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="max-w-xs rounded-xl"
            style={{ border: "1px solid #e8eaf0", background: "#f0f2f8" }}
          />
          <Button
            type="button"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none" }}
          >
            <Plus style={{ width: "16px", height: "16px" }} />
            {creating ? "Adding..." : "Add Department"}
          </Button>
        </div>
      </div>

      {/* Department list */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div
          className="px-6 py-4"
          style={{ borderBottom: "1px solid #e8eaf0" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "#1a1a2e" }}>
            Existing Departments
          </h2>
        </div>

        {departments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <Building2 style={{ width: "40px", height: "40px", color: "#e8eaf0" }} />
            <p className="text-sm" style={{ color: "#9ca3af" }}>No departments found.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#f0f2f8" }}>
            {departments.map((department) => (
              <div
                key={department.id}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[#fafbff]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: "#ede8ff" }}
                  >
                    <Building2 style={{ width: "16px", height: "16px", color: "#6c63ff" }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>
                    {department.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(department.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                  title="Delete department"
                >
                  <Trash2 style={{ width: "15px", height: "15px", color: "#ef4444" }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DepartmentsPage;
