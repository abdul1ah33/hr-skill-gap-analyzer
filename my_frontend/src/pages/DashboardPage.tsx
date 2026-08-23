import { LayoutDashboard, Users, BriefcaseBusiness, Building2 } from "lucide-react";

const stats = [
  {
    label: "Total Employees",
    value: "—",
    icon: Users,
    iconBg: "#ede8ff",
    iconColor: "#6c63ff",
  },
  {
    label: "Departments",
    value: "—",
    icon: Building2,
    iconBg: "#d1fae5",
    iconColor: "#10b981",
  },
  {
    label: "Positions",
    value: "—",
    icon: BriefcaseBusiness,
    iconBg: "#fff7ed",
    iconColor: "#f59e0b",
  },
];

function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1a1a2e" }}>
          Dashboard
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>
          Welcome back, HR Manager
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl p-5"
              style={{
                background: "#ffffff",
                border: "1px solid #e8eaf0",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm" style={{ color: "#9ca3af" }}>
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold" style={{ color: "#1a1a2e" }}>
                    {stat.value}
                  </p>
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: stat.iconBg }}
                >
                  <Icon style={{ width: "22px", height: "22px", color: stat.iconColor }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder panel */}
      <div
        className="flex flex-col items-center justify-center rounded-2xl py-20"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <LayoutDashboard style={{ width: "48px", height: "48px", color: "#e8eaf0" }} />
        <p className="mt-4 text-sm font-medium" style={{ color: "#9ca3af" }}>
          Charts & analytics coming soon
        </p>
      </div>
    </div>
  );
}

export default DashboardPage;