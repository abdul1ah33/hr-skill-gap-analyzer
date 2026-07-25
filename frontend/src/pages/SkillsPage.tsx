import React, { useState } from "react";
import type { Skill } from "../types/employee";
import { Award, Edit2, Trash2 } from "lucide-react";

interface SkillsPageProps {
  skills: Skill[];
  addSkill: (skill: Partial<Skill>) => Promise<void>;
  editSkill: (id: number, skill: Partial<Skill>) => Promise<void>;
  deleteSkill: (id: number) => Promise<void>;
}

export const SkillsPage: React.FC<SkillsPageProps> = ({
  skills,
  addSkill,
  editSkill,
  deleteSkill,
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technical");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingId !== null) {
        await editSkill(editingId, { name, category, description });
        setEditingId(null);
      } else {
        await addSkill({ name, category, description });
      }
      setName("");
      setDescription("");
      setCategory("Technical");
    } catch (err) {
      console.error("Error saving skill", err);
    }
  };

  const handleEditClick = (skill: Skill) => {
    if (skill.id) {
      setEditingId(skill.id);
      setName(skill.name);
      setCategory(skill.category || "Technical");
      setDescription(skill.description || "");
    }
  };

  const handleDeleteClick = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this skill template?")) {
      await deleteSkill(id);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setCategory("Technical");
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "2.5rem" }}>
        <div>
          <h1 className="page-title">Skills Inventory</h1>
          <p className="page-description">Manage standard skill definitions and AI talent taxonomy categories.</p>
        </div>
      </div>

      <div className="master-grid">
        {/* Form Column */}
        <div className="master-form-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Award size={18} className="text-muted" />
            {editingId !== null ? "Edit Skill" : "Create Skill"}
          </h3>
          
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group">
              <label className="form-label">Skill Name *</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. Node.js, Leadership" 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Skill Category</label>
              <select
                className="form-control"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="Technical">Technical</option>
                <option value="HR & Recruiting">HR & Recruiting</option>
                <option value="Management & Soft Skills">Management & Soft Skills</option>
                <option value="Design & Creative">Design & Creative</option>
                <option value="Marketing & Growth">Marketing & Growth</option>
                <option value="Finance & Legal">Finance & Legal</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Skill Description</label>
              <textarea 
                className="form-control" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Definition or assessment standard for this skill..." 
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingId !== null ? "Save Changes" : "Create Skill"}
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
                <th>Skill Name</th>
                <th>Category</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.map(skill => (
                <tr key={skill.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div className="employee-initials" style={{ width: "34px", height: "34px", borderRadius: "var(--radius-sm)", background: "rgba(139, 92, 246, 0.1)", border: "none" }}>
                        <Award size={16} style={{ color: "var(--accent-violet)" }} />
                      </div>
                      <span style={{ fontWeight: 600 }}>{skill.name}</span>
                    </div>
                  </td>
                  <td>
                    <span 
                      style={{ 
                        fontSize: "0.8rem", 
                        padding: "0.2rem 0.5rem", 
                        backgroundColor: "var(--bg-tertiary)", 
                        color: "var(--text-secondary)", 
                        borderRadius: "var(--radius-sm)",
                        fontWeight: 500
                      }}
                    >
                      {skill.category || "Technical"}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {skill.description || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No description</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.25rem" }}>
                      <button 
                        className="btn-icon edit" 
                        onClick={() => handleEditClick(skill)}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn-icon delete" 
                        onClick={() => skill.id && handleDeleteClick(skill.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {skills.length === 0 && (
                <tr>
                  <td colSpan={4} className="no-data">
                    No skills created yet.
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

export default SkillsPage;
