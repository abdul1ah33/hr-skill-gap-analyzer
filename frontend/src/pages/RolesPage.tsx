import React, { useState } from "react";
import type { Position, Department } from "../types/employee";
import { Briefcase, Edit2, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

interface RolesPageProps {
  positions: Position[];
  departments: Department[];
  addPosition: (pos: Partial<Position>) => Promise<void>;
  deletePosition: (id: number) => Promise<void>;
}

export const RolesPage: React.FC<RolesPageProps> = ({
  positions,
  departments,
  addPosition,
  deletePosition,
}) => {
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState<number>(departments[0]?.id || 0);
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("Mid-level");
  const [editingId, setEditingId] = useState<number | null>(null);

  React.useEffect(() => {
    if (departments.length > 0 && !departmentId) {
      setDepartmentId(departments[0].id || 0);
    }
  }, [departments, departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !departmentId) return;

    if (editingId !== null) {
      const storedPositions = localStorage.getItem("hr_positions");
      if (storedPositions) {
        const list = JSON.parse(storedPositions) as Position[];
        const index = list.findIndex((p) => p.id === editingId);
        if (index !== -1) {
          list[index] = { id: editingId, title, departmentId, description, level };
          localStorage.setItem("hr_positions", JSON.stringify(list));
          window.location.reload();
          return;
        }
      }
    }

    await addPosition({ title, departmentId, description, level });
    setTitle("");
    setDescription("");
    setLevel("Mid-level");
  };

  const handleEditClick = (pos: Position) => {
    if (pos.id) {
      setEditingId(pos.id);
      setTitle(pos.title);
      setDepartmentId(pos.departmentId);
      setDescription(pos.description || "");
      setLevel(pos.level || "Mid-level");
    }
  };

  const handleDeleteClick = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this position/role?")) {
      await deletePosition(id);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setLevel("Mid-level");
  };

  const getDepartmentName = (id: number) => {
    const dept = departments.find((d) => d.id === id);
    return dept ? dept.name : `Dept #${id}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Positions & Competency Profiles
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Define corporate job levels, position titles, and department alignments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <Card className="p-6 h-fit">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-600" />
              {editingId !== null ? "Edit Position" : "Create Position"}
            </CardTitle>
            <CardDescription>
              {editingId !== null ? "Update position specification" : "Add a new job position to the matrix"}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Position Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Fullstack Engineer"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Seniority Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Junior">Junior</option>
                <option value="Mid-level">Mid-level</option>
                <option value="Senior">Senior</option>
                <option value="Manager">Manager</option>
                <option value="Director">Director</option>
                <option value="VP / Executive">VP / Executive</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Job Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key role responsibilities & required experience..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="gradient" type="submit" className="flex-1">
                {editingId !== null ? "Save Changes" : "Create Position"}
              </Button>
              {editingId !== null && (
                <Button variant="outline" type="button" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Positions Table Column */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">Position Title</th>
                    <th className="py-3.5 px-4 font-semibold">Department</th>
                    <th className="py-3.5 px-4 font-semibold">Seniority</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {positions.map((pos) => (
                    <tr
                      key={pos.id}
                      className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{pos.title}</p>
                            <p className="text-xs text-slate-400 line-clamp-1">{pos.description || "No description"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant="secondary">{getDepartmentName(pos.departmentId)}</Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant="info">{pos.level || "Mid-level"}</Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(pos)} title="Edit">
                            <Edit2 className="w-4 h-4 text-slate-400 hover:text-purple-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => pos.id && handleDeleteClick(pos.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {positions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-16 text-center text-sm text-slate-400">
                        No positions defined yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RolesPage;
