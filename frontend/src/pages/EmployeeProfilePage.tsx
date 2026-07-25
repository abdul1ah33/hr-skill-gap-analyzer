import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Calendar, 
  MapPin, 
  CreditCard, 
  DollarSign, 
  ShieldCheck, 
  Hash, 
  Loader2, 
  AlertCircle,
  RefreshCw
} from "lucide-react";

export const EmployeeProfilePage: React.FC = () => {
  const [profileData, setProfileData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const fetchProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/me/profile");
      setProfileData(response.data);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(
          typeof err.response.data.detail === "string"
            ? err.response.data.detail
            : JSON.stringify(err.response.data.detail)
        );
      } else {
        setError("Failed to load employee profile data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const formatValue = (val: any): string => {
    if (val === null || val === undefined || val === "") {
      return "Not Available";
    }
    return String(val);
  };

  const getFullName = (data: Record<string, any> | null): string => {
    if (!data) return "Not Available";
    if (data.full_name) return data.full_name;
    if (data.fullName) return data.fullName;
    if (data.first_name || data.last_name || data.firstName || data.lastName) {
      const first = data.first_name || data.firstName || "";
      const last = data.last_name || data.lastName || "";
      const combined = `${first} ${last}`.trim();
      return combined || "Not Available";
    }
    return "Not Available";
  };

  if (loading) {
    return (
      <div className="profile-loading-container">
        <Loader2 size={36} className="animate-spin text-accent" />
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Loading employee profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Profile</h1>
            <p className="page-description">View your employment details and personal information</p>
          </div>
        </div>
        <div className="auth-error-alert" style={{ margin: "2rem 0" }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
        <button onClick={fetchProfile} className="btn btn-secondary">
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  const p = profileData || {};

  const employeeNumber = formatValue(p.employee_number || p.employeeNumber);
  const fullName = getFullName(p);
  const email = formatValue(p.email || p.work_email || p.workEmail);
  const phone = formatValue(p.phone || p.phone_number || p.phoneNumber);
  const department = formatValue(
    typeof p.department === "object" ? p.department?.name : p.department || p.department_name || p.departmentName
  );
  const position = formatValue(
    typeof p.position === "object" ? p.position?.title : p.position || p.position_title || p.role || p.title
  );
  const status = formatValue(p.employment_status || p.status || p.employmentStatus);
  const hireDate = formatValue(p.hire_date || p.hireDate);
  const address = formatValue(p.address);
  const nationalId = formatValue(p.national_id || p.nationalId);
  const salary = p.salary !== undefined && p.salary !== null ? `$${Number(p.salary).toLocaleString()}` : "Not Available";
  const gender = formatValue(p.gender);
  const birthDate = formatValue(p.birth_date || p.birthDate);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-description">Personal & employment details overview</p>
        </div>
      </div>

      {/* Header Banner Card */}
      <div className="profile-hero-card">
        <div className="profile-hero-avatar">
          {fullName !== "Not Available"
            ? fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()
            : "EM"}
        </div>
        <div className="profile-hero-info">
          <h2 className="profile-hero-name">{fullName}</h2>
          <div className="profile-hero-subtitle">
            <span>{position}</span> • <span>{department}</span>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <span
              className={`badge ${
                status.toLowerCase().includes("active")
                  ? "badge-active"
                  : status.toLowerCase().includes("leave")
                  ? "badge-on-leave"
                  : "badge-terminated"
              }`}
            >
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="profile-grid">
        {/* Employment Information Card */}
        <div className="profile-card">
          <h3 className="profile-card-title">
            <Briefcase size={20} className="text-accent" />
            Employment Information
          </h3>
          <div className="profile-details-list">
            <div className="profile-detail-item">
              <span className="detail-label">
                <Hash size={16} /> Employee Number
              </span>
              <span className="detail-value">{employeeNumber}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label">
                <Building2 size={16} /> Department
              </span>
              <span className="detail-value">{department}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label">
                <Briefcase size={16} /> Position / Role
              </span>
              <span className="detail-value">{position}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label">
                <ShieldCheck size={16} /> Status
              </span>
              <span className="detail-value">{status}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label">
                <Calendar size={16} /> Hire Date
              </span>
              <span className="detail-value">{hireDate}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label">
                <DollarSign size={16} /> Salary
              </span>
              <span className="detail-value">{salary}</span>
            </div>
          </div>
        </div>

        {/* Personal Details Card */}
        <div className="profile-card">
          <h3 className="profile-card-title">
            <User size={20} className="text-accent" />
            Personal Details
          </h3>
          <div className="profile-details-list">
            <div className="profile-detail-item">
              <span className="detail-label">
                <User size={16} /> Full Name
              </span>
              <span className="detail-value">{fullName}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label">
                <Mail size={16} /> Email Address
              </span>
              <span className="detail-value">{email}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label">
                <Phone size={16} /> Phone Number
              </span>
              <span className="detail-value">{phone}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label">
                <CreditCard size={16} /> National ID
              </span>
              <span className="detail-value">{nationalId}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label">
                <User size={16} /> Gender
              </span>
              <span className="detail-value">{gender}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label">
                <Calendar size={16} /> Date of Birth
              </span>
              <span className="detail-value">{birthDate}</span>
            </div>
            <div className="profile-detail-item full-width">
              <span className="detail-label">
                <MapPin size={16} /> Residential Address
              </span>
              <span className="detail-value">{address}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfilePage;
