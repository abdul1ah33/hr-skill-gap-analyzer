import React, { useState } from "react";
import type { Position, Department } from "../types/employee";
import { Briefcase, Edit2, Trash2 } from "lucide-react";

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

  // Initialize departmentId when departments load
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
        const index = list.findIndex(p => p.id === editingId);
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
    const dept = departments.find(d => d.id === id);
    return dept ? dept.name : `Dept #${id}`;
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "2.5rem" }}>
        <div>
          <h1 className="page-title">Work Roles & Positions</h1>
          <p className="page-description">Define job levels, corporate titles, and department alignments.</p>
        </div>
      </div>

      <div className="master-grid">
        {/* Form Column */}
        <div className="master-form-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Briefcase size={18} className="text-muted" />
            {editingId !== null ? "Edit Position" : "Create Position"}
          </h3>
          
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group">
              <label className="form-label">Position Title *</label>
              <input 
                type="text" 
                className="form-control" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="e.g. Senior Frontend Engineer" 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department *</label>
              <select
                className="form-control"
                value={departmentId}
                onChange={e => setDepartmentId(Number(e.target.value))}
                required
              >
                <option value="" disabled>Select Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Seniority Level</label>
              <select
                className="form-control"
                value={level}
                onChange={e => setLevel(e.target.value)}
              >
                <option value="Junior">Junior</option>
                <option value="Mid-level">Mid-level</option>
                <option value="Senior">Senior</option>
                <option value="Manager">Manager</option>
                <option value="Director">Director</option>
                <option value="VP / Executive">VP / Executive</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Job Description</label>
              <textarea 
                className="form-control" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Key roles and responsibilities..." 
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingId !== null ? "Save Changes" : "Create Position"}
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
                <th>Title / Level</th>
                <th>Department</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(pos => (
                <tr key={pos.id}>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600 }}>{pos.title}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{pos.level || "Mid-level"}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.9rem" }}>{getDepartmentName(pos.departmentId)}</span>
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {pos.description || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No description</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.25rem" }}>
                      <button 
                        className="btn-icon edit" 
                        onClick={() => handleEditClick(pos)}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn-icon delete" 
                        onClick={() => pos.id && handleDeleteClick(pos.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {positions.length === 0 && (
                <tr>
                  <td colSpan={4} className="no-data">
                    No positions created yet.
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

export default RolesPage;
