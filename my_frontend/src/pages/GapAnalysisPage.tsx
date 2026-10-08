import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployees } from "../services/employeeService";
import type { Employee } from "../types/employee";
import EmployeePicker from "../components/EmployeePicker";
import { TrendingUp, Zap, BarChart3, UserCircle2 } from "lucide-react";

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
      style={{ background: "var(--card)", border: "1px solid var(--border)", minWidth: 110 }}
    >
      <div
        className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: color + "1a" }}
      >
        <Icon style={{ width: 18, height: 18, color }} />
      </div>
      <span className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{value}</span>
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</span>
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

  const withPosition = employees.filter((e) => e.position).length;

  return (
    <>
      {/* inject keyframe once */}
      <style>{`
        @keyframes float {
          from { transform: translateY(0px) scale(1); opacity: 0.5; }
          to   { transform: translateY(-18px) scale(1.15); opacity: 1; }
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
              <p className="mt-3 max-w-sm text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
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
        <EmployeePicker
          employees={employees}
          loading={loading}
          title="Select Employee"
          subtitle="Choose an employee to run their gap analysis"
          actionLabel="Analyse"
          actionIcon={Zap}
          noPositionTitle="No position assigned — cannot run analysis"
          onSelect={(emp) => navigate(`/gap-analysis/${emp.id}`)}
        />
      </div>
    </>
  );
}
