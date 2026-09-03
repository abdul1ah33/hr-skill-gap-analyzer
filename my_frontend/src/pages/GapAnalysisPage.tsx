import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployees } from "../services/employeeService";
import type { Employee } from "../types/employee";
import { Input } from "../components/ui/input";
import { Search, TrendingUp, Zap, BarChart3, UserCircle2 } from "lucide-react";

/* ─── tiny animated counter hook ─────────────────────────────────── */
function useCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

/* ─── floating particle (pure CSS animation) ──────────────────────── */
function Particle({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #6c63ff44, #a78bfa44)",
        animation: `float ${3 + delay}s ease-in-out ${delay}s infinite alternate`,
        pointerEvents: "none",
      }}
    />
  );
}

const PARTICLES = [
  { x: 10, y: 20, delay: 0, size: 12 },
  { x: 80, y: 10, delay: 0.5, size: 8 },
  { x: 60, y: 80, delay: 1, size: 16 },
  { x: 30, y: 70, delay: 1.5, size: 10 },
  { x: 90, y: 50, delay: 0.8, size: 6 },
  { x: 5,  y: 55, delay: 1.2, size: 14 },
  { x: 50, y: 15, delay: 0.3, size: 8 },
];

/* ─── hero stat card ──────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.FC<{ style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-2xl px-5 py-4"
      style={{ background: "#ffffff", border: "1px solid #e8eaf0", minWidth: 110 }}
    >
      <div
        className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: color + "1a" }}
      >
        <Icon style={{ width: 18, height: 18, color }} />
      </div>
      <span className="text-xl font-bold" style={{ color: "#1a1a2e" }}>{value}</span>
      <span className="text-xs" style={{ color: "#9ca3af" }}>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Page                                                               */
/* ═══════════════════════════════════════════════════════════════════ */
export default function GapAnalysisPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [heroVisible, setHeroVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const totalCount = useCounter(employees.length, 1000);

  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* trigger hero reveal once */
  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.employee_number.toLowerCase().includes(q) ||
      (e.position?.title ?? "").toLowerCase().includes(q)
    );
  });

  const withPosition = employees.filter((e) => e.position).length;

  return (
    <>
      {/* inject keyframe once */}
      <style>{`
        @keyframes float {
          from { transform: translateY(0px) scale(1); opacity: 0.5; }
          to   { transform: translateY(-18px) scale(1.15); opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 #6c63ff33; }
          50%       { box-shadow: 0 0 0 10px #6c63ff00; }
        }
        .employee-card:hover .run-analysis-hint {
          opacity: 1;
          transform: translateX(0);
        }
        .employee-card .run-analysis-hint {
          opacity: 0;
          transform: translateX(8px);
          transition: all 0.2s ease;
        }
      `}</style>

      <div className="space-y-8">

        {/* ── HERO BANNER ─────────────────────────────────────────────── */}
        <div
          ref={heroRef}
          className="relative overflow-hidden rounded-3xl p-8"
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #2d2b55 50%, #1a1a2e 100%)",
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          {/* particles */}
          {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

          {/* grid overlay */}
          <div
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              backgroundImage: "linear-gradient(#6c63ff11 1px, transparent 1px), linear-gradient(90deg, #6c63ff11 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div style={{ animationDelay: "0.1s" }}>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: "#6c63ff33", border: "1px solid #6c63ff55" }}>
                <Zap style={{ width: 12, height: 12, color: "#a78bfa" }} />
                <span className="text-xs font-semibold" style={{ color: "#a78bfa" }}>AI-Powered Analysis</span>
              </div>
              <h1 className="text-4xl font-black leading-tight" style={{ color: "#ffffff" }}>
                Skill Gap
                <br />
                <span style={{ background: "linear-gradient(90deg, #6c63ff, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Intelligence
                </span>
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
                Identify exactly where each employee stands against their role requirements. Get AI-generated upskill pathways in seconds.
              </p>
            </div>

            {/* stat cards */}
            <div className="flex flex-wrap gap-3">
              <StatCard icon={UserCircle2}  label="Employees"    value={loading ? "—" : totalCount}      color="#6c63ff" />
              <StatCard icon={BarChart3}    label="Analysable"   value={loading ? "—" : withPosition}    color="#a78bfa" />
              <StatCard icon={TrendingUp}   label="AI Reports"   value="∞"                               color="#f59e0b" />
            </div>
          </div>
        </div>

        {/* ── SEARCH + LIST ────────────────────────────────────────────── */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{ background: "#ffffff", border: "1px solid #e8eaf0", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
        >
          {/* toolbar */}
          <div className="flex items-center justify-between gap-4 px-6 py-4" style={{ borderBottom: "1px solid #e8eaf0" }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "#1a1a2e" }}>Select Employee</h2>
              <p className="text-xs" style={{ color: "#9ca3af" }}>Choose an employee to run their gap analysis</p>
            </div>

            <div
              className="flex items-center gap-2 rounded-xl px-4 py-2"
              style={{ background: "#f0f2f8", border: "1px solid #e8eaf0", minWidth: 260 }}
            >
              <Search style={{ width: 15, height: 15, color: "#9ca3af", flexShrink: 0 }} />
              <Input
                placeholder="Search by name, email, position…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 bg-transparent p-0 text-sm shadow-none outline-none focus-visible:ring-0"
                style={{ color: "#1a1a2e" }}
              />
            </div>
          </div>

          {/* employee cards */}
          <div className="p-4">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl" style={{ background: "#f0f2f8" }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <UserCircle2 style={{ width: 48, height: 48, color: "#e8eaf0" }} />
                <p className="text-sm" style={{ color: "#9ca3af" }}>No employees found.</p>
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
                      onClick={() => navigate(`/gap-analysis/${emp.id}`)}
                      disabled={!hasPosition}
                      title={!hasPosition ? "No position assigned — cannot run analysis" : undefined}
                      className="employee-card group relative flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: "#f8f9ff",
                        border: "1px solid #e8eaf0",
                        animation: `slideUp 0.4s ease both`,
                        animationDelay: `${idx * 40}ms`,
                      }}
                      onMouseEnter={(e) => {
                        if (!hasPosition) return;
                        (e.currentTarget as HTMLElement).style.background = "#ede8ff";
                        (e.currentTarget as HTMLElement).style.borderColor = "#c4b8ff";
                        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(108,99,255,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "#f8f9ff";
                        (e.currentTarget as HTMLElement).style.borderColor = "#e8eaf0";
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
                        <p className="truncate text-sm font-bold" style={{ color: "#1a1a2e" }}>
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="truncate text-xs" style={{ color: "#6c63ff", fontWeight: 600 }}>
                          {emp.position?.title ?? <span style={{ color: "#d1d5db" }}>No position</span>}
                        </p>
                        <p className="truncate text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                          {emp.department?.name ?? "—"} · {emp.employee_number}
                        </p>
                      </div>

                      {/* arrow hint */}
                      {hasPosition && (
                        <div className="run-analysis-hint flex items-center gap-1 shrink-0">
                          <span className="text-xs font-semibold" style={{ color: "#6c63ff" }}>Analyse</span>
                          <Zap style={{ width: 13, height: 13, color: "#6c63ff" }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
