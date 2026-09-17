import { useNavigate } from "react-router-dom";
import { Sun, Moon, Monitor, LogOut, Settings as SettingsIcon, User } from "lucide-react";

import { useTheme, type Theme } from "../contexts/ThemeContext";

const themeOptions: { value: Theme; label: string; description: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", description: "Bright background, dark text", icon: Sun },
  { value: "dark", label: "Dark", description: "Dark background, easy on the eyes", icon: Moon },
  { value: "system", label: "System", description: "Match your device setting", icon: Monitor },
];

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("access_token");
    navigate("/login");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ background: "var(--accent)" }}
        >
          <SettingsIcon style={{ width: "20px", height: "20px", color: "var(--primary)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            Settings
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Manage how the app looks and your account
          </p>
        </div>
      </div>

      {/* Appearance */}
      <section
        className="rounded-2xl p-5"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
        }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Appearance
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
          Choose how the HR Skill Gap platform looks on this device.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className="flex flex-col items-start gap-2 rounded-xl p-4 text-left transition-all duration-150"
                style={{
                  background: isActive ? "var(--accent)" : "var(--background)",
                  border: isActive ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                }}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{
                    background: isActive ? "var(--primary)" : "var(--muted)",
                  }}
                >
                  <Icon
                    style={{
                      width: "16px",
                      height: "16px",
                      color: isActive ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {option.label}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Account */}
      <section
        className="rounded-2xl p-5"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
        }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Account
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
          Your session on this device.
        </p>

        <div
          className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "var(--background)", border: "1px solid var(--border)" }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{ background: "linear-gradient(135deg, var(--primary), #a78bfa)", color: "var(--primary-foreground)" }}
          >
            <User style={{ width: "16px", height: "16px" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              HR Manager
            </p>
            <p className="truncate text-xs" style={{ color: "var(--muted-foreground)" }}>
              Administrator
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
            style={{ color: "var(--destructive)" }}
          >
            <LogOut style={{ width: "14px", height: "14px" }} />
            Log out
          </button>
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
