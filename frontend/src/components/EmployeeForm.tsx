import React, { useState, useEffect } from "react";
import type { Employee, Department, Position, Skill } from "../types/employee";
import { X } from "lucide-react";

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeeData: Partial<Employee>) => void;
  employee?: Employee | null;
  departments: Department[];
  positions: Position[];
  skills: Skill[];
  employees: Employee[];
}

type FormTab = "personal" | "employment" | "skills";

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  employee,
  departments,
  positions,
  skills,
  employees,
}) => {
  const [activeTab, setActiveTab] = useState<FormTab>("personal");
  
  // Form fields state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("Male");
  
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [departmentId, setDepartmentId] = useState<number>(0);
  const [roleId, setRoleId] = useState<number>(0);
  const [managerId, setManagerId] = useState<number | undefined>(undefined);
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [salary, setSalary] = useState<number>(0);
  const [status, setStatus] = useState("Active");
  
  const [yearsExperience, setYearsExperience] = useState<number>(0);
  const [educationLevel, setEducationLevel] = useState("Bachelor's Degree");
  const [certifications, setCertifications] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Filter roles based on selected department
  const filteredPositions = positions.filter(pos => pos.departmentId === departmentId);

  // Initialize form with employee data if editing
  useEffect(() => {
    if (employee) {
      setFirstName(employee.firstName || "");
      setLastName(employee.lastName || "");
      setEmail(employee.email || "");
      setPersonalEmail(employee.personalEmail || "");
      setPhone(employee.phone || "");
      setAddress(employee.address || "");
      setBirthDate(employee.birthDate || "");
      setGender(employee.gender || "Male");
      setEmployeeNumber(employee.employeeNumber || "");
      setDepartmentId(employee.departmentId || (departments[0]?.id || 0));
      setRoleId(employee.roleId || 0);
      setManagerId(employee.managerId);
      setEmploymentType(employee.employmentType || "Full-time");
      setHireDate(employee.hireDate || "");
      setSalary(employee.salary || 0);
      setStatus(employee.status || "Active");
      setYearsExperience(employee.yearsExperience || 0);
      setEducationLevel(employee.educationLevel || "Bachelor's Degree");
      setCertifications(employee.certifications || "");
      setSelectedSkills(employee.skills || []);
    } else {
      // Reset form for adding
      setFirstName("");
      setLastName("");
      setEmail("");
      setPersonalEmail("");
      setPhone("");
      setAddress("");
      setBirthDate("");
      setGender("Male");
      
      // Auto-generate employee number
      const nextNum = employees.length > 0
        ? `EMP-${String(Math.max(...employees.map(e => parseInt(e.employeeNumber.replace("EMP-", "")) || 0)) + 1).padStart(3, "0")}`
        : "EMP-001";
      setEmployeeNumber(nextNum);
      
      const defaultDeptId = departments[0]?.id || 0;
      setDepartmentId(defaultDeptId);
      
      const deptPositions = positions.filter(p => p.departmentId === defaultDeptId);
      setRoleId(deptPositions[0]?.id || 0);
      
      setManagerId(undefined);
      setEmploymentType("Full-time");
      setHireDate(new Date().toISOString().split('T')[0]);
      setSalary(5000);
      setStatus("Active");
      setYearsExperience(0);
      setEducationLevel("Bachelor's Degree");
      setCertifications("");
      setSelectedSkills([]);
    }
    setActiveTab("personal");
  }, [employee, isOpen, departments, positions, employees]);

  // Adjust role when department changes
  const handleDepartmentChange = (deptId: number) => {
    setDepartmentId(deptId);
    const deptPositions = positions.filter(p => p.departmentId === deptId);
    if (deptPositions.length > 0) {
      setRoleId(deptPositions[0].id || 0);
    } else {
      setRoleId(0);
    }
  };

  const handleSkillToggle = (skillName: string) => {
    if (selectedSkills.includes(skillName)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skillName));
    } else {
      setSelectedSkills([...selectedSkills, skillName]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !employeeNumber || !departmentId || !roleId) {
      alert("Please fill in all required fields (First Name, Last Name, Email, Employee ID, Department, Role)");
      return;
    }
    
    onSubmit({
      firstName,
      lastName,
      email,
      personalEmail,
      phone,
      address,
      birthDate,
      gender,
      employeeNumber,
      departmentId,
      roleId,
      managerId: managerId || undefined,
      employmentType,
      hireDate,
      salary: Number(salary),
      status,
      yearsExperience: Number(yearsExperience),
      educationLevel,
      certifications,
      skills: selectedSkills,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">
            {employee ? `Edit Employee: ${employee.firstName} ${employee.lastName}` : "Add New Employee"}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="tabs-header" style={{ padding: "0 1.5rem" }}>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === "personal" ? "active" : ""}`}
            onClick={() => setActiveTab("personal")}
          >
            Personal Information
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === "employment" ? "active" : ""}`}
            onClick={() => setActiveTab("employment")}
          >
            Employment Information
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === "skills" ? "active" : ""}`}
            onClick={() => setActiveTab("skills")}
          >
            AI & Skills Information
          </button>
        </div>

        <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="modal-body">
            
            {activeTab === "personal" && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)} 
                    placeholder="e.g. Ahmed" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)} 
                    placeholder="e.g. Ali" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Work Email *</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="e.g. ahmed.ali@company.com" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Personal Email</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={personalEmail} 
                    onChange={e => setPersonalEmail(e.target.value)} 
                    placeholder="e.g. ahmed@gmail.com" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="e.g. +20123456789" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select 
                    className="form-control" 
                    value={gender} 
                    onChange={e => setGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={birthDate} 
                    onChange={e => setBirthDate(e.target.value)} 
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Address</label>
                  <textarea 
                    className="form-control" 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    placeholder="Residential address details..." 
                  />
                </div>
              </div>
            )}

            {activeTab === "employment" && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Employee ID *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={employeeNumber} 
                    onChange={e => setEmployeeNumber(e.target.value)} 
                    placeholder="e.g. EMP-001" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select 
                    className="form-control" 
                    value={departmentId} 
                    onChange={e => handleDepartmentChange(Number(e.target.value))}
                    required
                  >
                    <option value="" disabled>Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Role / Position *</label>
                  <select 
                    className="form-control" 
                    value={roleId} 
                    onChange={e => setRoleId(Number(e.target.value))}
                    required
                  >
                    <option value="" disabled>Select Role</option>
                    {filteredPositions.map(p => (
                      <option key={p.id} value={p.id}>{p.title} ({p.level || "N/A"})</option>
                    ))}
                    {filteredPositions.length === 0 && (
                      <option value="" disabled>No roles available for this department. Add them in Roles Page.</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Manager</label>
                  <select 
                    className="form-control" 
                    value={managerId || ""} 
                    onChange={e => setManagerId(e.target.value ? Number(e.target.value) : undefined)}
                  >
                    <option value="">No Manager (Top Level)</option>
                    {employees
                      .filter(e => e.id !== employee?.id) // Don't allow self-management
                      .map(e => (
                        <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Employment Type</label>
                  <select 
                    className="form-control" 
                    value={employmentType} 
                    onChange={e => setEmploymentType(e.target.value)}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hire Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={hireDate} 
                    onChange={e => setHireDate(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Salary (Monthly $)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={salary} 
                    onChange={e => setSalary(Number(e.target.value))} 
                    placeholder="5000" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Employment Status</label>
                  <select 
                    className="form-control" 
                    value={status} 
                    onChange={e => setStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === "skills" && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Years of Experience</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={yearsExperience} 
                    onChange={e => setYearsExperience(Number(e.target.value))} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Education Level</label>
                  <select 
                    className="form-control" 
                    value={educationLevel} 
                    onChange={e => setEducationLevel(e.target.value)}
                  >
                    <option value="High School">High School</option>
                    <option value="Associate's Degree">Associate's Degree</option>
                    <option value="Bachelor's Degree">Bachelor's Degree</option>
                    <option value="Master's Degree">Master's Degree</option>
                    <option value="Ph.D.">Ph.D.</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Certifications</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={certifications} 
                    onChange={e => setCertifications(e.target.value)} 
                    placeholder="e.g. AWS Solutions Architect, SHRM-CP, PMP (comma separated)" 
                  />
                </div>
                
                <div className="form-group full-width">
                  <label className="form-label">Employee Skills</label>
                  <div className="skills-selector">
                    <div className="skills-tags-container">
                      {selectedSkills.length === 0 ? (
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "0.2rem 0" }}>
                          No skills selected yet. Click skills below to add.
                        </span>
                      ) : (
                        selectedSkills.map(skill => (
                          <span className="skill-tag" key={skill}>
                            {skill}
                            <span 
                              className="skill-tag-remove" 
                              onClick={() => handleSkillToggle(skill)}
                            >
                              &times;
                            </span>
                          </span>
                        ))
                      )}
                    </div>
                    
                    <div className="skills-list">
                      {skills.map(skill => (
                        <button
                          key={skill.id}
                          type="button"
                          className={`skill-chip-option ${selectedSkills.includes(skill.name) ? "selected" : ""}`}
                          onClick={() => handleSkillToggle(skill.name)}
                        >
                          {skill.name}
                        </button>
                      ))}
                      {skills.length === 0 && (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          No master skills available. Create them on the Skills Page first!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            
            {activeTab !== "skills" ? (
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  if (activeTab === "personal") setActiveTab("employment");
                  else if (activeTab === "employment") setActiveTab("skills");
                }}
              >
                Next Step
              </button>
            ) : (
              <button type="submit" className="btn btn-primary">
                {employee ? "Save Changes" : "Add Employee"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;
