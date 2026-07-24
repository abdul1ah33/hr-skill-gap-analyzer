import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  allowedRoles?: Array<"HR" | "Employee">;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)"
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect based on role if trying to access unauthorized route
    if (role === "HR") {
      return <Navigate to="/dashboard" replace />;
    } else if (role === "Employee") {
      return <Navigate to="/employee/profile" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
