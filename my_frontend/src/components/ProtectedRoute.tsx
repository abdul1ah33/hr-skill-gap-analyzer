import { Navigate, Outlet } from "react-router-dom";

import { getRole, getToken, homePathFor, type UserRole } from "../lib/auth";

interface ProtectedRouteProps {
  /** Roles allowed here; omit to allow any logged-in user. */
  roles?: UserRole[];
}

function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const role = getRole();

  if (!getToken() || role === null) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to={homePathFor(role)} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
