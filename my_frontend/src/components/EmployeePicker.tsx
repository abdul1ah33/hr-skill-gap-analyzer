import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Search, UserCircle2 } from "lucide-react";
import { Input } from "./ui/input";
import type { Employee } from "../types/employee";

interface Props {
  employees: Employee[];
  loading: boolean;
  title: string;
  subtitle: string;
  /** Shown on hover, e.g. "Analyse" */
  actionLabel: string;
  actionIcon: LucideIcon;
  /** Shown on employees without a position (they can't be selected) */
  noPositionTitle: string;
  onSelect: (employee: Employee) => void;
}

/** Searchable grid of employee cards; employees without a position are disabled. */
export default function EmployeePicker({
  employees,
  loading,
  title,
  subtitle,
  actionLabel,
  actionIcon: ActionIcon,
  noPositionTitle,
  onSelect,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.employee_number.toLowerCase().includes(q) ||
      (e.position?.title ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 #6c63ff33; }
          50%       { box-shadow: 0 0 0 10px #6c63ff00; }
        }
        .employee-card:hover .employee-card-hint {
          opacity: 1;
          transform: translateX(0);
        }
        .employee-card .employee-card-hint {
          opacity: 0;
          transform: translateX(8px);
          transition: all 0.2s ease;
        }
      `}</style>

      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
      >
        {/* toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>{title}</h2>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{subtitle}</p>
          </div>

          <div
            className="flex items-center gap-2 rounded-xl px-4 py-2"
            style={{ background: "var(--muted)", border: "1px solid var(--border)", minWidth: 260 }}
          >
            <Search style={{ width: 15, height: 15, color: "var(--muted-foreground)", flexShrink: 0 }} />
            <Input
              placeholder="Search by name, email, position…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 bg-transparent p-0 text-sm shadow-none outline-none focus-visible:ring-0"
              style={{ color: "var(--foreground)" }}
            />
          </div>
        </div>

        {/* employee cards */}
        <div className="p-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl" style={{ background: "var(--muted)" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <UserCircle2 style={{ width: 48, height: 48, color: "var(--border)" }} />
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No employees found.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((emp, idx) => {
                const initials = `${emp.first_name[0]}${emp.last_name[0]}`;
                const hasPosition = !!emp.position;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => onSelect(emp)}
                    disabled={!hasPosition}
                    title={!hasPosition ? noPositionTitle : undefined}
                    className="employee-card group relative flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: "var(--muted)",
                      border: "1px solid var(--border)",
                      animation: `slideUp 0.4s ease both`,
                      animationDelay: `${idx * 40}ms`,
                    }}
                    onMouseEnter={(e) => {
                      if (!hasPosition) return;
                      (e.currentTarget as HTMLElement).style.background = "var(--accent)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(108,99,255,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--muted)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    {/* avatar */}
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", animation: "pulse-ring 2.5s ease-in-out infinite" }}
                    >
                      {initials}
                    </div>

                    {/* info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold" style={{ color: "var(--foreground)" }}>
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="truncate text-xs" style={{ color: "var(--primary)", fontWeight: 600 }}>
                        {emp.position?.title ?? <span style={{ color: "var(--muted-foreground)" }}>No position</span>}
                      </p>
                      <p className="truncate text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                        {emp.department?.name ?? "—"} · {emp.employee_number}
                      </p>
                    </div>

                    {/* arrow hint */}
                    {hasPosition && (
                      <div className="employee-card-hint flex items-center gap-1 shrink-0">
                        <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>{actionLabel}</span>
                        <ActionIcon style={{ width: 13, height: 13, color: "var(--primary)" }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
