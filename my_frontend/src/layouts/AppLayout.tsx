import {
  LayoutDashboard,
  Users,
  Building2,
  BriefcaseBusiness,
  Sparkles,
  Settings,
  Search,
  Bell,
  LogOut,
  BarChart3,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const navigation = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Employees",
    path: "/employees",
    icon: Users,
  },
  {
    name: "Departments",
    path: "/departments",
    icon: Building2,
  },
  {
    name: "Positions",
    path: "/positions",
    icon: BriefcaseBusiness,
  },
  {
    name: "Gap Analysis",
    path: "/gap-analysis",
    icon: BarChart3,
  },
  {
    name: "Skills",
    path: "/skills",
    icon: Sparkles,
  },
];

export default function AppLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("access_token");
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen w-full" style={{ background: "#f0f2f8" }}>
      {/* Sidebar */}
      <aside
        className="flex w-64 shrink-0 flex-col"
        style={{
          background: "#ffffff",
          borderRight: "1px solid #e8eaf0",
          boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* Logo */}
        <div
          className="flex h-16 items-center px-6"
          style={{ borderBottom: "1px solid #e8eaf0" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
              style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)" }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold" style={{ color: "#1a1a2e", letterSpacing: "-0.01em" }}>
                HR Skill Gap
              </h1>
              <p className="text-[11px]" style={{ color: "#9ca3af" }}>
                Analytics Platform
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "text-white shadow-md"
                      : "hover:bg-[#f0f2f8]"
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        background: "linear-gradient(135deg, #6c63ff, #a78bfa)",
                        color: "#ffffff",
                      }
                    : { color: "#6b7280" }
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" style={{ width: "18px", height: "18px" }} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom – Settings */}
        <div className="px-4 pb-4 space-y-1" style={{ borderTop: "1px solid #e8eaf0", paddingTop: "16px" }}>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive ? "text-white shadow-md" : "hover:bg-[#f0f2f8]"
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { background: "linear-gradient(135deg, #6c63ff, #a78bfa)", color: "#ffffff" }
                : { color: "#6b7280" }
            }
          >
            <Settings style={{ width: "18px", height: "18px" }} />
            Settings
          </NavLink>

          {/* User profile footer */}
          <div
            className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3"
            style={{ background: "#f0f2f8" }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)" }}
            >
              HR
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: "#1a1a2e" }}>
                HR Manager
              </p>
              <p className="truncate text-xs" style={{ color: "#9ca3af" }}>
                Administrator
              </p>
            </div>
            {/* Logout button */}
            <button
              onClick={handleLogout}
              title="Logout"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
            >
              <LogOut style={{ width: "15px", height: "15px", color: "#ef4444" }} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header
          className="flex h-16 shrink-0 items-center justify-between px-8"
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e8eaf0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {/* Page title injected via context or left as branding */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-2"
              style={{ background: "#f0f2f8", border: "1px solid #e8eaf0" }}
            >
              <Search style={{ width: "15px", height: "15px", color: "#9ca3af" }} />
              <span className="text-sm" style={{ color: "#9ca3af" }}>
                Search...
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-[#f0f2f8]"
              style={{ border: "1px solid #e8eaf0" }}
            >
              <Bell style={{ width: "17px", height: "17px", color: "#6b7280" }} />
            </button>

            {/* Avatar */}
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)" }}
            >
              HR
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}