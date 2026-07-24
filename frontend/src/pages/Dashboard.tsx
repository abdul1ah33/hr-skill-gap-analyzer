import React from "react";
import type { Employee, Department, Position, Skill } from "../types/employee";
import { Users, Building2, Briefcase, Award, TrendingUp, Calendar } from "lucide-react";

interface DashboardProps {
  employees: Employee[];
  departments: Department[];
  positions: Position[];
  skills: Skill[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  employees,
  departments,
  positions,
  skills,
}) => {
  // Stats calculations
  const totalEmployees = employees.length;
  const totalDepts = departments.length;
  const totalRoles = positions.length;
  
  const avgExperience = totalEmployees > 0 
    ? (employees.reduce((acc, curr) => acc + (curr.yearsExperience || 0), 0) / totalEmployees).toFixed(1)
    : "0";

  const activeEmployees = employees.filter(e => (e?.status || "").toLowerCase() === "active").length;
  const leaveEmployees = employees.filter(e => {
    const s = (e?.status || "").toLowerCase();
    return s === "on leave" || s === "leave";
  }).length;
  
  // Get recent 4 employees
  const recentEmployees = [...employees]
    .sort((a, b) => new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime())
    .slice(0, 4);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "2.5rem" }}>
        <div>
          <h1 className="page-title">HR AI Analytics</h1>
          <p className="page-description">Real-time overview of your workforce metrics and skill sets.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Total Headcount</span>
            <div className="stat-icon"><Users size={20} /></div>
          </div>
          <div className="stat-value">{totalEmployees}</div>
          <div className="stat-label">Active: {activeEmployees} | Leave: {leaveEmployees}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Departments</span>
            <div className="stat-icon"><Building2 size={20} /></div>
          </div>
          <div className="stat-value">{totalDepts}</div>
          <div className="stat-label">Business divisions</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Defined Roles</span>
            <div className="stat-icon"><Briefcase size={20} /></div>
          </div>
          <div className="stat-value">{totalRoles}</div>
          <div className="stat-label">Positions configured</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Avg Experience</span>
            <div className="stat-icon"><TrendingUp size={20} /></div>
          </div>
          <div className="stat-value">{avgExperience} <span style={{ fontSize: "1rem", fontWeight: "normal", color: "var(--text-secondary)" }}>Years</span></div>
          <div className="stat-label">Talent seniority level</div>
        </div>
      </div>

      <div className="master-grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
        {/* Recent Hires */}
        <div className="table-container" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Calendar size={18} className="text-muted" /> Recent Hires
          </h3>
          {recentEmployees.length === 0 ? (
            <div className="no-data" style={{ padding: "2rem" }}>
              <p>No employees entered yet.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {recentEmployees.map(emp => {
                const dept = departments.find(d => d.id === emp.departmentId)?.name || "N/A";
                const role = positions.find(p => p.id === emp.roleId)?.title || "N/A";
                return (
                  <div 
                    key={emp.id} 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between", 
                      padding: "0.85rem 1rem", 
                      backgroundColor: "rgba(255, 255, 255, 0.02)", 
                      borderRadius: "var(--radius-md)", 
                      border: "1px solid var(--border-light)" 
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div className="employee-initials" style={{ width: "34px", height: "34px", fontSize: "0.85rem" }}>
                        {emp.firstName ? emp.firstName[0] : "E"}{emp.lastName ? emp.lastName[0] : ""}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{emp.firstName} {emp.lastName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{role} • {dept}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>Hired {emp.hireDate}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--accent-emerald)" }}>{emp.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Skills breakdown */}
        <div className="table-container" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Award size={18} className="text-muted" /> Skills Directory
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <span>Skill Name</span>
              <span>Available Profiles</span>
            </div>
            {skills.slice(0, 5).map(skill => {
              const occurrences = employees.filter(e => e.skills?.includes(skill.name)).length;
              return (
                <div key={skill.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem" }}>
                  <span style={{ fontWeight: 500 }}>{skill.name}</span>
                  <span 
                    style={{ 
                      padding: "0.1rem 0.5rem", 
                      backgroundColor: occurrences > 0 ? "rgba(99, 102, 241, 0.15)" : "var(--bg-tertiary)", 
                      color: occurrences > 0 ? "var(--accent-indigo)" : "var(--text-muted)", 
                      borderRadius: "var(--radius-sm)", 
                      fontSize: "0.8rem",
                      fontWeight: 600
                    }}
                  >
                    {occurrences} {occurrences === 1 ? "Employee" : "Employees"}
                  </span>
                </div>
              );
            })}
            {skills.length > 5 && (
              <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                + {skills.length - 5} more skill profiles cataloged
              </div>
            )}
            {skills.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem", padding: "1rem" }}>
                No skills entered yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
