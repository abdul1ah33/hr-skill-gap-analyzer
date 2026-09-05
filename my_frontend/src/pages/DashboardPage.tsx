import { useEffect, useState, useRef } from "react";
import { Users, BriefcaseBusiness, Building2, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getEmployeeCount } from "../services/employeeService";
import { getDepartmentCount } from "../services/departmentService";
import { getPositionCount } from "../services/positionService";

// ── Animated counter hook ─────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  iconColor: string;
  href: string;
  delay: number;
  animateIn: boolean;
}

function StatCard({ label, value, icon: Icon, gradient, iconBg, iconColor, href, delay, animateIn }: StatCardProps) {
  const count = useCountUp(value, 1000, animateIn);
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(href)}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      style={{
        background: "#ffffff",
        border: "1px solid #e8eaf0",
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        opacity: animateIn ? 1 : 0,
        transform: animateIn ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(108,99,255,0.15)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 16px rgba(0,0,0,0.06)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      <div className="h-1 w-full" style={{ background: gradient }} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9ca3af" }}>
              {label}
            </p>
            <p className="mt-2 text-4xl font-bold" style={{ color: "#1a1a2e" }}>
              {animateIn ? count : 0}
            </p>
          </div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110"
            style={{ background: iconBg }}
          >
            <Icon style={{ width: "22px", height: "22px", color: iconColor }} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1 text-xs font-medium" style={{ color: iconColor }}>
          <span>View all</span>
          <ArrowRight
            style={{ width: "13px", height: "13px" }}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </div>
      </div>
    </div>
  );
}

// ── Quick action card ─────────────────────────────────────────────────────────
interface QuickActionProps {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bg: string;
  delay: number;
  animateIn: boolean;
}

function QuickAction({ label, description, icon: Icon, href, color, bg, delay, animateIn }: QuickActionProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className="flex w-full items-center gap-4 rounded-2xl p-4 text-left"
      style={{
        background: bg,
        border: `1px solid ${color}22`,
        opacity: animateIn ? 1 : 0,
        transform: animateIn ? "translateX(0)" : "translateX(-16px)",
        transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = `${color}18`;
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.01)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = bg;
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${color}22` }}
      >
        <Icon style={{ width: "18px", height: "18px", color }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>{label}</p>
        <p className="text-xs" style={{ color: "#9ca3af" }}>{description}</p>
      </div>
      <ArrowRight style={{ width: "16px", height: "16px", color: "#d1d5db", marginLeft: "auto", flexShrink: 0 }} />
    </button>
  );
}

// ── Floating orbs background decoration ──────────────────────────────────────
function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div
        className="absolute rounded-full"
        style={{
          width: 180, height: 180,
          background: "radial-gradient(circle, rgba(108,99,255,0.35) 0%, transparent 70%)",
          top: -40, right: -40,
          animation: "float1 6s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 120, height: 120,
          background: "radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)",
          bottom: 10, left: 30,
          animation: "float2 8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ── Main dashboard page ───────────────────────────────────────────────────────
function DashboardPage() {
  const [counts, setCounts] = useState({ employees: 0, departments: 0, positions: 0 });
  const [loading, setLoading] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    Promise.all([getEmployeeCount(), getDepartmentCount(), getPositionCount()])
      .then(([employees, departments, positions]) => {
        setCounts({ employees, departments, positions });
      })
      .catch((err) => {
        console.error("Dashboard count fetch failed:", err);
      })
      .finally(() => {
        setLoading(false);
        setTimeout(() => setAnimateIn(true), 80);
      });
  }, []);

  const stats = [
    {
      label: "Total Employees",
      value: counts.employees,
      icon: Users,
      gradient: "linear-gradient(90deg, #6c63ff, #a78bfa)",
      iconBg: "#ede8ff",
      iconColor: "#6c63ff",
      href: "/employees",
    },
    {
      label: "Departments",
      value: counts.departments,
      icon: Building2,
      gradient: "linear-gradient(90deg, #10b981, #34d399)",
      iconBg: "#d1fae5",
      iconColor: "#10b981",
      href: "/departments",
    },
    {
      label: "Positions",
      value: counts.positions,
      icon: BriefcaseBusiness,
      gradient: "linear-gradient(90deg, #f59e0b, #fbbf24)",
      iconBg: "#fff7ed",
      iconColor: "#f59e0b",
      href: "/positions",
    },
  ];

  const quickActions = [
    {
      label: "Add New Employee",
      description: "Onboard a team member",
      icon: Users,
      href: "/employees/add",
      color: "#6c63ff",
      bg: "#f5f3ff",
    },
    {
      label: "Run Gap Analysis",
      description: "Identify skill gaps",
      icon: TrendingUp,
      href: "/gap-analysis",
      color: "#10b981",
      bg: "#f0fdf4",
    },
    {
      label: "Manage Positions",
      description: "View & edit job roles",
      icon: BriefcaseBusiness,
      href: "/positions",
      color: "#f59e0b",
      bg: "#fffbeb",
    },
    {
      label: "Departments",
      description: "Organize your teams",
      icon: Building2,
      href: "/departments",
      color: "#3b82f6",
      bg: "#eff6ff",
    },
  ];

  return (
    <>
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%  { transform: translateY(-18px) rotate(8deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%  { transform: translateY(14px) rotate(-6deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(108,99,255,0.35); }
          70%  { transform: scale(1);    box-shadow: 0 0 0 10px rgba(108,99,255,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(108,99,255,0); }
        }
      `}</style>

      <div className="space-y-6">

        {/* ── Hero header ──────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            opacity: animateIn ? 1 : 0,
            transform: animateIn ? "translateY(0)" : "translateY(-16px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <FloatingOrbs />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles style={{ width: "16px", height: "16px", color: "#a78bfa" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#a78bfa" }}>
                  HR Intelligence Hub
                </span>
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "#ffffff" }}>
                Welcome back, HR Manager 👋
              </h1>
              <p className="mt-1 text-sm" style={{ color: "#94a3b8" }}>
                {loading ? "Loading your workforce data…" : "Here's a snapshot of your workforce today"}
              </p>
            </div>
            <div
              className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "rgba(108,99,255,0.2)", animation: "pulse-ring 2.5s ease-in-out infinite" }}
            >
              <TrendingUp style={{ width: "26px", height: "26px", color: "#a78bfa" }} />
            </div>
          </div>
        </div>

        {/* ── Stat cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {stats.map((stat, i) => (
            <StatCard
              key={stat.label}
              {...stat}
              delay={i * 100}
              animateIn={animateIn && !loading}
            />
          ))}
        </div>

        {/* ── Quick actions + CTA ──────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* Quick actions panel */}
          <div
            className="lg:col-span-2 rounded-2xl p-5 space-y-3"
            style={{
              background: "#ffffff",
              border: "1px solid #e8eaf0",
              boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
              opacity: animateIn ? 1 : 0,
              transform: animateIn ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.5s ease 350ms, transform 0.5s ease 350ms",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>Quick Actions</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {quickActions.map((qa, i) => (
                <QuickAction
                  key={qa.label}
                  {...qa}
                  delay={400 + i * 80}
                  animateIn={animateIn}
                />
              ))}
            </div>
          </div>

          {/* Skill gap CTA */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between"
            style={{
              background: "linear-gradient(135deg, #6c63ff 0%, #a78bfa 100%)",
              opacity: animateIn ? 1 : 0,
              transform: animateIn ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.5s ease 500ms, transform 0.5s ease 500ms",
            }}
          >
            <div className="pointer-events-none absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white opacity-10" />
            <div className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white opacity-10" />
            <div className="relative z-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Sparkles style={{ width: "18px", height: "18px", color: "#ffffff" }} />
              </div>
              <h3 className="mt-3 text-base font-bold text-white">Skill Gap Analysis</h3>
              <p className="mt-1 text-sm text-white/80">
                Identify training opportunities and close competency gaps across your workforce.
              </p>
            </div>
            <button
              onClick={() => navigate("/gap-analysis")}
              className="relative z-10 mt-4 inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105"
              style={{ color: "#6c63ff" }}
            >
              Start Analysis
              <ArrowRight style={{ width: "14px", height: "14px" }} />
            </button>
          </div>

        </div>

        {/* ── Shimmer loading bar ──────────────────────────────────── */}
        {loading && (
          <div
            className="rounded-full h-1 w-full"
            style={{
              background: "linear-gradient(90deg, #e8eaf0 25%, #f0f2f8 50%, #e8eaf0 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s infinite",
            }}
          />
        )}

      </div>
    </>
  );
}

export default DashboardPage;
