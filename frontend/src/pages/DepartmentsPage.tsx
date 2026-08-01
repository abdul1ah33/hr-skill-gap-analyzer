import React, { useState } from "react";
import type { Department } from "../types/employee";
import { Building2, Edit2, Trash2, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { motion } from "framer-motion";

interface DepartmentsPageProps {
  departments: Department[];
  addDepartment: (dept: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: number) => Promise<void>;
}

export const DepartmentsPage: React.FC<DepartmentsPageProps> = ({
  departments,
  addDepartment,
  deleteDepartment,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId !== null) {
      const storedDepts = localStorage.getItem("hr_departments");
      if (storedDepts) {
        const list = JSON.parse(storedDepts) as Department[];
        const index = list.findIndex((d) => d.id === editingId);
        if (index !== -1) {
          list[index] = { id: editingId, name, description };
          localStorage.setItem("hr_departments", JSON.stringify(list));
          window.location.reload();
          return;
        }
      }
    }

    await addDepartment({ name, description });
    setName("");
    setDescription("");
  };

  const handleEditClick = (dept: Department) => {
    if (dept.id) {
      setEditingId(dept.id);
      setName(dept.name);
      setDescription(dept.description || "");
    }
  };

  const handleDeleteClick = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      await deleteDepartment(id);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName("");
    setDescription("");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Departments & Divisions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure business units and organizational structures across the company.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <Card className="p-6 h-fit">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              {editingId !== null ? "Edit Department" : "Create Department"}
            </CardTitle>
            <CardDescription>
              {editingId !== null ? "Update department details" : "Add a new organizational department"}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Department Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engineering & Product"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of department scope and responsibilities..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="gradient" type="submit" className="flex-1">
                {editingId !== null ? "Save Changes" : "Create Department"}
              </Button>
              {editingId !== null && (
                <Button variant="outline" type="button" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Department Grid List */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {departments.map((dept, idx) => (
            <motion.div
              key={dept.id || idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-5 flex flex-col justify-between h-full hover:border-purple-500/40 transition-all group">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {dept.name}
                        </h3>
                        <Badge variant="secondary" className="mt-0.5">
                          ID: #{dept.id}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(dept)} title="Edit">
                        <Edit2 className="w-4 h-4 text-slate-400 hover:text-purple-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => dept.id && handleDeleteClick(dept.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">
                    {dept.description || "No description specified for this department."}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-500" /> Active Division
                  </span>
                  <Badge variant="success">Operational</Badge>
                </div>
              </Card>
            </motion.div>
          ))}

          {departments.length === 0 && (
            <div className="col-span-full py-16 text-center text-sm text-slate-400">
              No departments created yet. Use the form on the left to add one!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentsPage;
