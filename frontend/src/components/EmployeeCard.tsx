import React from "react";
import type { Employee, Department, Position } from "../types/employee";
import { X, Calendar, DollarSign, Briefcase, Award, GraduationCap, MapPin, Mail, Phone, ShieldCheck } from "lucide-react";

interface EmployeeCardProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  positions: Position[];
  employees: Employee[];
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  isOpen,
  onClose,
  departments,
  positions,
  employees,
}) => {
  if (!isOpen || !employee) return null;

  const getDepartmentName = (id: number) => {
    const dept = departments.find((d) => d.id === id);
    return dept ? dept.name : `Dept #${id}`;
  };

  const getPositionTitle = (id: number) => {
    const pos = positions.find((p) => p.id === id);
    return pos ? pos.title : `Role #${id}`;
  };

  const getManagerName = (id?: number) => {
    if (!id) return "None (Top Level)";
    const mgr = employees.find((e) => e.id === id);
    return mgr ? `${mgr.firstName} ${mgr.lastName}` : `Manager #${id}`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "badge badge-active";
      case "on leave":
      case "leave":
        return "badge badge-on-leave";
      case "terminated":
      case "inactive":
        return "badge badge-terminated";
      default:
        return "badge";
    }
  };

  const initials = `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "700px" }}>
        <div className="modal-header">
          <h3 className="modal-title">Employee Profile Card</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-avatar-container">
              <div className="detail-avatar">{initials}</div>
              <span className={getStatusBadgeClass(employee.status)}>
                {employee.status}
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                {employee.employeeNumber}
              </span>
            </div>

            <div className="detail-sections">
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.25rem" }}>
                  {employee.firstName} {employee.lastName}
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Briefcase size={16} /> {getPositionTitle(employee.roleId)}
                </p>
              </div>

              {/* Personal Information */}
              <div className="detail-section">
                <h4 className="detail-section-title">Personal Information</h4>
                <div className="detail-items">
                  <div className="detail-item">
                    <span className="detail-label">Email Address</span>
                    <span className="detail-value" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Mail size={14} className="text-muted" /> {employee.email || "N/A"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Phone size={14} className="text-muted" /> {employee.phone || "N/A"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Gender & DoB</span>
                    <span className="detail-value">
                      {employee.gender || "N/A"} {employee.birthDate ? `| ${employee.birthDate}` : ""}
                    </span>
                  </div>
                  <div className="detail-item" style={{ gridColumn: "span 2" }}>
                    <span className="detail-label">Address</span>
                    <span className="detail-value" style={{ display: "flex", alignItems: "flex-start", gap: "0.3rem" }}>
                      <MapPin size={14} style={{ marginTop: "3px" }} className="text-muted" /> {employee.address || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="detail-section">
                <h4 className="detail-section-title">Employment Information</h4>
                <div className="detail-items">
                  <div className="detail-item">
                    <span className="detail-label">Department</span>
                    <span className="detail-value">{getDepartmentName(employee.departmentId)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Reports To (Manager)</span>
                    <span className="detail-value">{getManagerName(employee.managerId)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Employment Type</span>
                    <span className="detail-value">{employee.employmentType || "Full-time"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Hire Date</span>
                    <span className="detail-value" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Calendar size={14} className="text-muted" /> {employee.hireDate}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Salary (Monthly)</span>
                    <span className="detail-value" style={{ display: "flex", alignItems: "center", gap: "0.1rem" }}>
                      <DollarSign size={14} className="text-muted" /> {employee.salary?.toLocaleString() || "0"}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI & Talent Profiles */}
              <div className="detail-section">
                <h4 className="detail-section-title">AI & Skills Information</h4>
                <div className="detail-items">
                  <div className="detail-item">
                    <span className="detail-label">Experience</span>
                    <span className="detail-value" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <ShieldCheck size={14} className="text-muted" /> {employee.yearsExperience || 0} Years
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Education</span>
                    <span className="detail-value" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <GraduationCap size={14} className="text-muted" /> {employee.educationLevel || "N/A"}
                    </span>
                  </div>
                  <div className="detail-item" style={{ gridColumn: "span 2" }}>
                    <span className="detail-label">Certifications</span>
                    <span className="detail-value" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Award size={14} className="text-muted" /> {employee.certifications || "None"}
                    </span>
                  </div>
                  <div className="detail-item" style={{ gridColumn: "span 2" }}>
                    <span className="detail-label">Skills Stack</span>
                    <div className="skills-tags-container" style={{ marginTop: "0.5rem" }}>
                      {employee.skills && employee.skills.length > 0 ? (
                        employee.skills.map((skill) => (
                          <span className="skill-tag" key={skill} style={{ border: "none", backgroundColor: "rgba(99,102,241,0.15)", color: "var(--accent-indigo)", fontWeight: 500 }}>
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          No skills assigned.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCard;
