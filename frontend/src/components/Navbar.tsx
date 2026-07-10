import React from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Briefcase, 
  Award 
} from "lucide-react";

export const Navbar: React.FC = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <Users size={28} style={{ stroke: "url(#indigo-violet-grad)" }} />
        <span>HR Assist AI</span>
        
        {/* SVG Gradient definition for Lucide icons */}
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
            to="/" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            end
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/employees" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <Users size={20} />
            <span>Employees</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/departments" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <Building2 size={20} />
            <span>Departments</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/roles" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <Briefcase size={20} />
            <span>Roles</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/skills" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <Award size={20} />
            <span>Skills</span>
          </NavLink>
        </li>
      </ul>
      
      <div className="sidebar-footer">
        <div className="user-avatar">HR</div>
        <div className="user-info">
          <span className="user-name">HR Manager</span>
          <span className="user-role">Administrator</span>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
