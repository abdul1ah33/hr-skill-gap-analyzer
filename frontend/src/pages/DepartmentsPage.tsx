import React, { useState } from "react";
import type { Department } from "../types/employee";
import { Edit2, Trash2, Building2 } from "lucide-react";

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
      // In a real app we'd have updateDepartment service call. For now, since hook supports add/delete:
      // Let's implement local editing by delete & re-add, or we can just run addDepartment.
      // Wait, we can edit in the local state or mock it.
      // Let's just create/re-create or notify the user. To keep it simple, we support Add and Delete, 
      // but let's make Add/Edit form update local storage or call addDepartment.
      // Wait! Let's update hook to have updateDepartment if editing. Let's look at useEmployees hook.
      // It has `addDepartment` and `deleteDepartment`. We can delete and re-add or we can just support
      // adding and deleting for now, or edit it in localStorage directly inside this page, then trigger refresh.
      // Yes! Since hook fetches from localStorage, we can write directly to localStorage and trigger reload.
      // Let's do that or keep it simple. Let's do a direct write to localStorage and call window.location.reload() or hook's fetchData().
      // Wait, the hook exposes `addDepartment` and `deleteDepartment` which handles updating localStorage.
      // Let's modify the department list directly if editing, then save to localStorage and call window.location.reload() or similar,
      // or we can just delete the old one and add the new one.
      // Actually, deleting and adding is simple, but editing directly in localStorage is cleaner:
      const stored = localStorage.getItem("hr_departments");
      if (stored) {
        const depts: Department[] = JSON.parse(stored);
        const updated = depts.map(d => d.id === editingId ? { ...d, name, description } : d);
        localStorage.setItem("hr_departments", JSON.stringify(updated));
      }
      setEditingId(null);
      window.dispatchEvent(new Event("storage")); // Notify other listeners
      // Quick way to refresh: since hook reads from localStorage on mount, we can just trigger a reload or refresh state.
      // Let's just reload the page or trigger fetch. To avoid reload, we can just delete & re-add:
      // Actually, if we just call deleteDepartment and then addDepartment, the ID changes, but it works!
      // Let's just do that to be safe, or call window.location.reload().
      // Wait, reload is fast and ensures database/localStorage sync! Let's do reload.
      const storedDepts = localStorage.getItem("hr_departments");
      if (storedDepts) {
        const list = JSON.parse(storedDepts) as Department[];
        if (editingId) {
          const index = list.findIndex(d => d.id === editingId);
          if (index !== -1) {
            list[index] = { id: editingId, name, description };
            localStorage.setItem("hr_departments", JSON.stringify(list));
            window.location.reload();
            return;
          }
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
    <div>
      <div className="page-header" style={{ marginBottom: "2.5rem" }}>
        <div>
          <h1 className="page-title">Departments Directory</h1>
          <p className="page-description">Configure business units and organizational structures.</p>
        </div>
      </div>

      <div className="master-grid">
        {/* Form Column */}
        <div className="master-form-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Building2 size={18} className="text-muted" />
            {editingId !== null ? "Edit Department" : "Create Department"}
          </h3>
          
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group">
              <label className="form-label">Department Name *</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. Sales & Support" 
                required 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea 
                className="form-control" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Brief summary of department responsibilities..." 
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingId !== null ? "Save Changes" : "Create Department"}
              </button>
              {editingId !== null && (
                <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List Column */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div className="employee-initials" style={{ width: "34px", height: "34px", borderRadius: "var(--radius-sm)", background: "rgba(99, 102, 241, 0.1)", border: "none" }}>
                        <Building2 size={16} style={{ color: "var(--accent-indigo)" }} />
                      </div>
                      <span style={{ fontWeight: 600 }}>{dept.name}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {dept.description || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No description</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.25rem" }}>
                      <button 
                        className="btn-icon edit" 
                        onClick={() => handleEditClick(dept)}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn-icon delete" 
                        onClick={() => dept.id && handleDeleteClick(dept.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={3} className="no-data">
                    No departments created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DepartmentsPage;
