import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ClipboardCheck, LogOut, Sparkles } from "lucide-react";

import api from "../services/api";
import { logout } from "../lib/auth";

interface MyProfile {
  first_name: string;
  last_name: string;
  position?: { title: string } | null;
}

/** Layout for employee accounts (self-service portal). */
export default function EmployeeLayout() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MyProfile | null>(null);

  useEffect(() => {
    api
      .get<MyProfile>("/me/profile")
      .then((response) => setProfile(response.data))
      .catch(() => setProfile(null));
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initials = profile ? `${profile.first_name[0]}${profile.last_name[0]}` : "";

  return (
    <div className="min-h-screen w-full" style={{ background: "var(--background)" }}>
      <header
        className="flex h-16 items-center justify-between px-8"
        style={{
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
              style={{ background: "linear-gradient(135deg, var(--primary), #a78bfa)" }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                HR Skill Gap
              </h1>
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                Employee Portal
              </p>
            </div>
          </div>

          <NavLink
            to="/my/assessments"
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all hover:bg-[var(--sidebar-accent)]"
            style={({ isActive }) =>
              isActive
                ? { background: "linear-gradient(135deg, var(--primary), #a78bfa)", color: "#ffffff" }
                : { color: "var(--sidebar-foreground)" }
            }
          >
            <ClipboardCheck style={{ width: "16px", height: "16px" }} />
            My Assessments
          </NavLink>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <div className="text-right">
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {profile.position?.title ?? "Employee"}
              </p>
            </div>
          )}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--primary), #a78bfa)" }}
          >
            {initials}
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10"
          >
            <LogOut style={{ width: "16px", height: "16px", color: "var(--destructive)" }} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-8">
        <Outlet />
      </main>
    </div>
  );
}
