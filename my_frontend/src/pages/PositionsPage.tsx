import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { getPositions, createPosition, deletePosition } from "../services/positionService";
import { getDepartments } from "../services/departmentService";

import type { Position } from "../types/position";
import type { Department } from "../types/department";

import { BriefcaseBusiness, Plus, Trash2 } from "lucide-react";

function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadData() {
    try {
      const [positionsData, departmentsData] =
        await Promise.all([
          getPositions(),
          getDepartments(),
        ]);

      setPositions(positionsData);
      setDepartments(departmentsData);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreatePosition(event: React.FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    if (!departmentId) {
      alert("Please select a department.");
      return;
    }

    try {
      setLoading(true);

      await createPosition({
        title: title.trim(),
        department_id: Number(departmentId),
      });

      setTitle("");
      setDepartmentId("");

      await loadData();
    } catch (error) {
      console.error("Failed to create position:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePosition(positionId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this position?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deletePosition(positionId);
      await loadData();
    } catch (error: any) {
      console.error("Failed to delete position:", error);
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert("Failed to delete position.");
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1a1a2e" }}>
          Positions
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>
          {positions.length} positions
        </p>
      </div>

      {/* Add Position card */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <h2 className="mb-4 text-base font-semibold" style={{ color: "#1a1a2e" }}>
          Add Position
        </h2>

        <form onSubmit={handleCreatePosition} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "#6b7280" }}>
              Position Title
            </label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Software Engineer"
              className="w-56 rounded-xl"
              style={{ border: "1px solid #e8eaf0", background: "#f0f2f8" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "#6b7280" }}>
              Department
            </label>
            <select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className="w-48 rounded-xl px-3 py-2 text-sm"
              style={{
                border: "1px solid #e8eaf0",
                background: "#f0f2f8",
                color: "#1a1a2e",
                outline: "none",
              }}
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none" }}
          >
            <Plus style={{ width: "16px", height: "16px" }} />
            {loading ? "Creating..." : "Add Position"}
          </Button>
        </form>
      </div>

      {/* Positions list */}
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
            All Positions
          </h2>
        </div>

        {positions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <BriefcaseBusiness style={{ width: "40px", height: "40px", color: "#e8eaf0" }} />
            <p className="text-sm" style={{ color: "#9ca3af" }}>No positions found.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#f0f2f8" }}>
            {positions.map((position) => (
              <div
                key={position.id}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[#fafbff]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: "#ede8ff" }}
                  >
                    <BriefcaseBusiness style={{ width: "16px", height: "16px", color: "#6c63ff" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>
                      {position.title}
                    </p>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>
                      {position.department?.name ?? "No department"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeletePosition(position.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                  title="Delete position"
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

export default PositionsPage;


