import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { User, ClipboardCheck, Users, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const EmployeeNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = user?.username || user?.email || "Employee";

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <Users size={28} style={{ stroke: "url(#indigo-violet-grad)" }} />
        <span>HR Assist AI</span>
        
        <svg width="0" height="0">
          <defs>
            <linearGradient id="indigo-violet-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      <ul className="sidebar-menu">
        <li>
          <NavLink 
            to="/employee/profile" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            end
          >
            <User size={20} />
            <span>My Profile</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/employee/assessments" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <ClipboardCheck size={20} />
            <span>Assessments</span>
          </NavLink>
        </li>
      </ul>
      
      <div className="sidebar-footer">
        <div className="user-avatar" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
          EM
        </div>
        <div className="user-info">
          <span className="user-name">{displayName}</span>
          <span className="user-role">Employee Portal</span>
        </div>
        <button 
          onClick={handleLogout} 
          className="logout-btn" 
          title="Logout"
          aria-label="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};

export default EmployeeNavbar;
