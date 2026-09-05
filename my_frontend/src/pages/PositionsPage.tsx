import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  getPositions,
  createPosition,
  updatePosition,
  deletePosition,
} from "../services/positionService";
import { getDepartments } from "../services/departmentService";

import type { Position } from "../types/position";
import type { Department } from "../types/department";

import { BriefcaseBusiness, Check, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";

function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDepartmentId, setEditingDepartmentId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadData() {
    try {
      const [positionsData, departmentsData] = await Promise.all([
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

    if (!title.trim()) return;
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

  function startEdit(position: Position) {
    setEditingId(position.id);
    setEditingTitle(position.title);
    setEditingDepartmentId(position.department_id ? String(position.department_id) : "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
    setEditingDepartmentId("");
  }

  async function handleSaveEdit(positionId: number) {
    const trimmed = editingTitle.trim();
    if (!trimmed) return;

    try {
      setSavingEdit(true);
      await updatePosition(positionId, { 
        title: trimmed,
        department_id: editingDepartmentId ? Number(editingDepartmentId) : undefined
      });
      await loadData();
      cancelEdit();
    } catch (error) {
      console.error("Failed to edit position:", error);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeletePosition(positionId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this position?"
    );
    if (!confirmed) return;

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
        <h2
          className="mb-4 text-base font-semibold"
          style={{ color: "#1a1a2e" }}
        >
          Add Position
        </h2>

        <form
          onSubmit={handleCreatePosition}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: "#6b7280" }}
            >
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
            <label
              className="text-xs font-medium"
              style={{ color: "#6b7280" }}
            >
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
            style={{
              background: "linear-gradient(135deg, #6c63ff, #a78bfa)",
              border: "none",
            }}
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
        <div className="px-6 py-4" style={{ borderBottom: "1px solid #e8eaf0" }}>
          <h2
            className="text-base font-semibold"
            style={{ color: "#1a1a2e" }}
          >
            All Positions
          </h2>
        </div>

        {positions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <BriefcaseBusiness
              style={{ width: "40px", height: "40px", color: "#e8eaf0" }}
            />
            <p className="text-sm" style={{ color: "#9ca3af" }}>
              No positions found.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#f0f2f8" }}>
            {positions.map((position) => (
              <div
                key={position.id}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[#fafbff]"
              >
                {/* Left: icon + name/dept (or rename input) */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "#ede8ff" }}
                  >
                    <BriefcaseBusiness
                      style={{ width: "16px", height: "16px", color: "#6c63ff" }}
                    />
                  </div>

                  {editingId === position.id ? (
                    /* Inline edit */
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex flex-col gap-1 w-full max-w-[240px]">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(position.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="rounded-xl text-sm h-8"
                          style={{
                            border: "1px solid #6c63ff",
                            background: "#f0f2f8",
                          }}
                          autoFocus
                          placeholder="Position title"
                        />
                        <select
                          value={editingDepartmentId}
                          onChange={(e) => setEditingDepartmentId(e.target.value)}
                          className="rounded-xl px-2 py-1 text-xs"
                          style={{
                            border: "1px solid #6c63ff",
                            background: "#f0f2f8",
                            color: "#1a1a2e",
                            outline: "none",
                          }}
                        >
                          <option value="">No department</option>
                          {departments.map((dep) => (
                            <option key={dep.id} value={dep.id}>{dep.name}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(position.id)}
                        disabled={savingEdit}
                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-green-50 disabled:opacity-50"
                        title="Save"
                      >
                        <Check
                          style={{ width: "14px", height: "14px", color: "#16a34a" }}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-red-50"
                        title="Cancel"
                      >
                        <X
                          style={{ width: "14px", height: "14px", color: "#ef4444" }}
                        />
                      </button>
                    </div>
                  ) : (
                    /* Normal display — click name to go to details */
                    <Link
                      to={`/positions/${position.id}`}
                      className="min-w-0 flex-1 group"
                    >
                      <p
                        className="text-sm font-semibold group-hover:text-[#6c63ff] transition-colors"
                        style={{ color: "#1a1a2e" }}
                      >
                        {position.title}
                      </p>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>
                        {position.department?.name ?? "No department"}
                      </p>
                    </Link>
                  )}
                </div>

                {/* Right: action buttons */}
                {editingId !== position.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    {/* View details */}
                    <Link
                      to={`/positions/${position.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#ede8ff]"
                      title="View skills"
                    >
                      <ChevronRight
                        style={{ width: "15px", height: "15px", color: "#6c63ff" }}
                      />
                    </Link>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => startEdit(position)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#ede8ff]"
                      title="Edit position"
                    >
                      <Pencil
                        style={{ width: "14px", height: "14px", color: "#6c63ff" }}
                      />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeletePosition(position.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                      title="Delete position"
                    >
                      <Trash2
                        style={{ width: "15px", height: "15px", color: "#ef4444" }}
                      />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PositionsPage;
