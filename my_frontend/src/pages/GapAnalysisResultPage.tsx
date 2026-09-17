import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEmployeeById } from "../services/employeeService";
import { getSkillGapAnalysis } from "../services/gapAnalysisService";
import type { Employee } from "../types/employee";
import type { SkillGapResult } from "../types/gapAnalysis";
import { Button } from "../components/ui/button";
import {
  ArrowLeft,
  Zap,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Star,
  BookOpen,
  ChevronRight,
  BarChart3,
  Sparkles,
  RefreshCw,
  Clock,
  Target,
  Link2,
  ArrowLeftRight,
  ShieldCheck,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function useCounter(target: number, duration = 1400) {
  const [v, setV] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (target === 0 || started.current) return;
    started.current = true;
    let start: number | null = null;
    const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setV(Math.round(ease(p) * target));
      if (p < 1) requestAnimationFrame(step);
      else setV(target);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return v;
}

function scoreColor(score: number) {
  if (score >= 85) return { text: "#16a34a", bg: "#dcfce7", ring: "#16a34a" };
  if (score >= 65) return { text: "#d97706", bg: "#fef3c7", ring: "#d97706" };
  return { text: "#dc2626", bg: "#fee2e2", ring: "#dc2626" };
}

function statusConfig(status: string) {
  if (status === "Ready")          return { icon: CheckCircle2, color: "#16a34a", bg: "#dcfce7", label: "Ready" };
  if (status === "Needs Upskilling") return { icon: TrendingUp,   color: "#d97706", bg: "#fef3c7", label: "Needs Upskilling" };
  return { icon: XCircle, color: "#dc2626", bg: "#fee2e2", label: "Not a Fit" };
}

function priorityBadge(priority: "Essential" | "Optional") {
  return priority === "Essential"
    ? { className: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400", label: "Essential" }
    : { className: "bg-muted text-muted-foreground", label: "Optional" };
}

const levelOrder: Record<string, number> = {
  Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4,
};
const LEVEL_COLORS: Record<string, string> = {
  Beginner:     "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  Intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Advanced:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Expert:       "bg-accent text-primary",
};
function LevelBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-xs italic" style={{ color: "var(--muted-foreground)" }}>None</span>;
  const cls = LEVEL_COLORS[level] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>{level}</span>
  );
}

// ─── Score Ring SVG ───────────────────────────────────────────────────────────

function ScoreRing({ score, size = 140, stroke = 10 }: { score: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const displayed = useCounter(score, 1600);
  const dash = circ * (displayed / 100);
  const c = scoreColor(score);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={c.ring} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.6s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="relative flex flex-col items-center">
        <span className="text-4xl font-black" style={{ color: c.text, lineHeight: 1 }}>{displayed}</span>
        <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>/ 100</span>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, accent = "#6c63ff", headerExtra, children }: {
  title: string;
  icon: React.FC<{ style?: React.CSSProperties }>;
  accent?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: accent + "18" }}>
          <Icon style={{ width: 16, height: 16, color: accent }} />
        </div>
        <h2 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{title}</h2>
        {headerExtra && <div className="ml-auto pr-4">{headerExtra}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Skill row shared ─────────────────────────────────────────────────────────

function SkillRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
      style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function AnalysisSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[180, 120, 280, 220].map((h, i) => (
        <div key={i} className="rounded-2xl" style={{ height: h, background: "var(--muted)" }} />
      ))}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function LevelBar({ from, to }: { from: string | null; to: string }) {
  const levels = ["Beginner", "Intermediate", "Advanced", "Expert"];
  return (
    <div className="flex items-center gap-1">
      {levels.map((l) => {
        const toIdx   = levels.indexOf(to);
        const fromIdx = from ? levels.indexOf(from) : -1;
        const idx     = levels.indexOf(l);
        const active  = idx <= toIdx;
        const current = from && idx <= fromIdx;
        return (
          <div
            key={l}
            className="h-1.5 flex-1 rounded-full transition-all duration-700"
            style={{
              background: current ? "var(--primary)" : active ? "var(--border)" : "var(--muted)",
              opacity: active ? 1 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Main page
// ═══════════════════════════════════════════════════════════════════════════════

export default function GapAnalysisResultPage() {
  const { id } = useParams();
  const employeeId = Number(id);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [result, setResult] = useState<SkillGapResult | null>(null);
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    getEmployeeById(employeeId).then(setEmployee).catch(console.error);
  }, [employeeId]);

  async function runAnalysis() {
    try {
      setAnalysisState("loading");
      setResult(null);
      const data = await getSkillGapAnalysis(employeeId);
      setResult(data);
      setAnalysisState("done");
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail ?? "Analysis failed. Please try again.");
      setAnalysisState("error");
    }
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>Loading employee…</div>
      </div>
    );
  }

  const initials = `${employee.first_name[0]}${employee.last_name[0]}`;
  const ga = result?.gap_analysis;
  const sd = result?.skill_diff;

  const totalRequired = (sd?.matched.length ?? 0) + (sd?.needs_improvement.length ?? 0) + (sd?.unmatched.length ?? 0);
  const matchedCount  = sd?.matched.length ?? 0;
  const gapsCount     = (sd?.needs_improvement.length ?? 0) + (sd?.unmatched.length ?? 0);
  const bonusCount    = sd?.additional_skills.length ?? 0;

  const st = ga ? statusConfig(ga.readiness_status) : null;

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .reveal-section {
          opacity: 0;
          animation: fadeSlideUp 0.55s ease both;
        }
      `}</style>

      <div className="space-y-6">

        {/* ── back ── */}
        <Link
          to="/gap-analysis"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: "var(--accent)", color: "var(--primary)", border: "1px solid var(--accent)" }}
        >
          <ArrowLeft style={{ width: 15, height: 15 }} />
          Back to Gap Analysis
        </Link>

        {/* ── employee header ── */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6"
          style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white"
              style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)" }}
            >
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-black" style={{ color: "var(--foreground)" }}>
                {employee.first_name} {employee.last_name}
              </h1>
              <p className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
                {employee.position?.title ?? "No position"}
              </p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {employee.department?.name ?? "—"} · {employee.employee_number}
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={runAnalysis}
            disabled={analysisState === "loading" || !employee.position}
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90 disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none", boxShadow: "0 4px 20px rgba(108,99,255,0.4)" }}
          >
            {analysisState === "loading" ? (
              <>
                <RefreshCw style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
                Analysing…
              </>
            ) : analysisState === "done" ? (
              <>
                <RefreshCw style={{ width: 15, height: 15 }} />
                Re-run Analysis
              </>
            ) : (
              <>
                <Zap style={{ width: 15, height: 15 }} />
                Run Gap Analysis
              </>
            )}
          </Button>
        </div>

        {/* ── loading ── */}
        {analysisState === "loading" && (
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 rounded-2xl p-5"
              style={{ background: "linear-gradient(135deg,#1a1a2e,#2d2b55)", border: "1px solid #6c63ff33" }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#6c63ff22" }}>
                <Sparkles style={{ width: 20, height: 20, color: "#a78bfa", animation: "spin 2s linear infinite" }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">AI is crunching the numbers…</p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Comparing skills against position requirements via Gemini</p>
              </div>
            </div>
            <AnalysisSkeleton />
          </div>
        )}

        {/* ── error ── */}
        {analysisState === "error" && (
          <div className="rounded-2xl p-5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <p className="text-sm font-bold text-red-700 dark:text-red-400">Analysis Failed</p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* ── idle (not yet run) ── */}
        {analysisState === "idle" && (
          <div
            className="flex flex-col items-center gap-4 rounded-2xl py-20"
            style={{ background: "var(--card)", border: "2px dashed var(--border)" }}
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg,#6c63ff18,#a78bfa18)" }}
            >
              <BarChart3 style={{ width: 28, height: 28, color: "var(--primary)" }} />
            </div>
            <div className="text-center">
              <p className="text-base font-bold" style={{ color: "var(--foreground)" }}>Ready to Analyse</p>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Press <strong>"Run Gap Analysis"</strong> to generate the AI report
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            Results — only shown when done
        ════════════════════════════════════════════════════ */}
        {analysisState === "done" && ga && sd && (

          <div className="space-y-6">

            {/* ── 1. Score & Status hero ── */}
            <div
              className="reveal-section"
              style={{ animationDelay: "0ms" }}
            >
              <div
                className="relative overflow-hidden rounded-3xl p-8"
                style={{ background: "linear-gradient(135deg,#1a1a2e 0%,#2d2b55 100%)", border: "1px solid #6c63ff33" }}
              >
                {/* bg grid */}
                <div style={{ position:"absolute",inset:0,pointerEvents:"none",backgroundImage:"linear-gradient(#6c63ff11 1px,transparent 1px),linear-gradient(90deg,#6c63ff11 1px,transparent 1px)",backgroundSize:"36px 36px" }} />

                <div className="relative flex flex-wrap items-center gap-8">

                  {/* ring */}
                  <div className="flex flex-col items-center gap-2">
                    <ScoreRing score={ga.readiness_score} />
                    <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Readiness Score</span>
                  </div>

                  {/* status + summary */}
                  <div className="flex-1" style={{ minWidth: 220 }}>
                    {st && (
                      <div
                        className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                        style={{ background: st.color + "22", border: `1px solid ${st.color}44` }}
                      >
                        <st.icon style={{ width: 14, height: 14, color: st.color }} />
                        <span className="text-xs font-bold" style={{ color: st.color }}>{st.label}</span>
                      </div>
                    )}

                    <h2 className="mb-3 text-xl font-black text-white">Executive Summary</h2>
                    <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>
                      {ga.managerial_summary}
                    </p>
                  </div>

                  {/* mini stats */}
                  <div className="flex gap-3 flex-wrap">
                    {[
                      { label: "Matched",    value: matchedCount, color: "#16a34a" },
                      { label: "Gaps",       value: gapsCount,    color: "#dc2626" },
                      { label: "Bonus Skills", value: bonusCount, color: "#6c63ff" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex flex-col items-center rounded-2xl px-4 py-3 gap-1" style={{ background: "#ffffff0a", border: "1px solid #ffffff15" }}>
                        <span className="text-2xl font-black" style={{ color }}>{value}</span>
                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</span>
                      </div>
                    ))}
                    <div className="flex flex-col items-center rounded-2xl px-4 py-3 gap-1" style={{ background: "#ffffff0a", border: "1px solid #ffffff15" }}>
                      <span className="text-2xl font-black" style={{ color: "#a78bfa" }}>{totalRequired}</span>
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Required Skills</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 2. Core Strengths ── */}
            {ga.core_strengths && ga.core_strengths.length > 0 && (
              <div className="reveal-section" style={{ animationDelay: "80ms" }}>
                <Section title="Core Strengths" icon={Sparkles} accent="#6c63ff">
                  <div className="space-y-2">
                    {ga.core_strengths.map((strength, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-xl px-4 py-3"
                        style={{ background: "var(--accent)", border: "1px solid var(--accent)" }}
                      >
                        <Star style={{ width: 14, height: 14, color: "var(--primary)", fill: "var(--primary)", flexShrink: 0, marginTop: 2 }} />
                        <span className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{strength}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {/* ── 3. Matched Skills ── */}
            {sd.matched.length > 0 && (
              <div className="reveal-section" style={{ animationDelay: "160ms" }}>
                <Section
                  title={`Matched Skills (${sd.matched.length})`}
                  icon={CheckCircle2}
                  accent="#16a34a"
                  headerExtra={
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold tracking-wide rounded-md px-2 py-1 bg-muted text-muted-foreground"
                        style={{ border: "1px solid var(--border)" }}
                      >
                        Current
                      </span>
                      <ChevronRight style={{ width: 11, height: 11, color: "var(--muted-foreground)" }} />
                      <span
                        className="text-xs font-bold tracking-wide rounded-md px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-800"
                      >
                        Required
                      </span>
                    </div>
                  }
                >
                  <div className="space-y-2">
                    {sd.matched.map((sk, i) => {
                      const pb = priorityBadge(sk.priority);
                      return (
                        <SkillRow key={i}>
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" style={{ width: 15, height: 15, flexShrink: 0 }} />
                            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{sk.skill}</span>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${pb.className}`}>{pb.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex w-16 justify-center">
                              <LevelBadge level={sk.employee_level} />
                            </div>
                            <ChevronRight style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} />
                            <div className="flex w-16 justify-center">
                              <LevelBadge level={sk.required_level} />
                            </div>
                          </div>
                        </SkillRow>
                      );
                    })}
                  </div>
                </Section>
              </div>
            )}

            {/* ── 3b. Reconciled Skills ── */}
            {ga.reconciled_skills && ga.reconciled_skills.length > 0 && (
              <div className="reveal-section" style={{ animationDelay: "240ms" }}>
                <Section
                  title={`Reconciled Skills (${ga.reconciled_skills.length})`}
                  icon={ShieldCheck}
                  accent="#0891b2"
                  headerExtra={
                    <span
                      className="text-xs font-bold tracking-wide rounded-md px-2 py-1 bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-800"
                    >
                      AI Verified
                    </span>
                  }
                >
                  <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                    These required skills were initially flagged as missing by exact-name matching, but our AI
                    determined the employee already possesses an equivalent skill under a different name — some are
                    now counted as matched, while others still need improvement to fully meet the required level.
                  </p>
                  <div className="space-y-3">
                    {ga.reconciled_skills.map((rs, i) => {
                      const isMatched = rs.match_status === "Matched";
                      const statusClass = isMatched
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
                      return (
                        <div
                          key={i}
                          className="rounded-xl p-4 space-y-3 bg-cyan-50 border border-cyan-200 dark:bg-cyan-500/10 dark:border-cyan-800"
                        >
                          <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-card border border-cyan-200 dark:border-cyan-800">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">Employee has</span>
                              <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{rs.employee_skill}</span>
                            </div>

                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/15">
                              <ArrowLeftRight className="text-cyan-700 dark:text-cyan-400" style={{ width: 12, height: 12 }} />
                            </div>

                            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-card border border-cyan-200 dark:border-cyan-800">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">Satisfies requirement</span>
                              <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{rs.target_skill}</span>
                            </div>

                            <span className={`ml-auto flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
                              {isMatched
                                ? <CheckCircle2 style={{ width: 11, height: 11 }} />
                                : <TrendingUp style={{ width: 11, height: 11 }} />
                              }
                              {isMatched ? "Counted as Matched" : "Needs Improvement"}
                            </span>
                          </div>

                          <p className="text-sm leading-relaxed text-cyan-800 dark:text-cyan-300">
                            {rs.justification}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              </div>
            )}

            {/* ── 4. Needs Improvement ── */}
            {sd.needs_improvement.length > 0 && (
              <div className="reveal-section" style={{ animationDelay: "320ms" }}>
                <Section title={`Needs Improvement (${sd.needs_improvement.length})`} icon={TrendingUp} accent="#d97706">
                  <div className="space-y-3">
                    {sd.needs_improvement.map((sk, i) => {
                      const pb = priorityBadge(sk.priority);
                      const gap = (levelOrder[sk.required_level] ?? 0) - (levelOrder[sk.employee_level] ?? 0);
                      return (
                        <div key={i} className="rounded-xl p-4 space-y-2 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-800">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="text-amber-700 dark:text-amber-400" style={{ width: 14, height: 14 }} />
                              <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{sk.skill}</span>
                              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${pb.className}`}>{pb.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <LevelBadge level={sk.employee_level} />
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">→</span>
                              <LevelBadge level={sk.required_level} />
                              {gap > 0 && (
                                <span className="rounded-md px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                                  +{gap} tier{gap > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                          <LevelBar from={sk.employee_level} to={sk.required_level} />
                        </div>
                      );
                    })}
                  </div>
                </Section>
              </div>
            )}

            {/* ── 5. Missing Skills ── */}
            {sd.unmatched.length > 0 && (
              <div className="reveal-section" style={{ animationDelay: "400ms" }}>
                <Section title={`Missing Skills (${sd.unmatched.length})`} icon={XCircle} accent="#dc2626">
                  <div className="space-y-2">
                    {sd.unmatched.map((sk, i) => {
                      const pb = priorityBadge(sk.priority);
                      return (
                        <SkillRow key={i}>
                          <div className="flex items-center gap-3">
                            <XCircle className="text-red-600 dark:text-red-400" style={{ width: 15, height: 15, flexShrink: 0 }} />
                            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{sk.skill}</span>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${pb.className}`}>{pb.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <LevelBadge level={sk.required_level} />
                          </div>
                        </SkillRow>
                      );
                    })}
                  </div>
                </Section>
              </div>
            )}

            {/* ── 6. Top-Priority Upskill Pathway ── */}
            {ga.upskill_pathways.length > 0 && (() => {
              const up = ga.upskill_pathways[0];
              const pb  = priorityBadge(up.priority);
              const isNI = up.gap_type === "Needs Improvement";
              return (
                <div className="reveal-section" style={{ animationDelay: "480ms" }}>
                  <Section title="Top Priority Upskill Pathway" icon={BookOpen} accent="#6c63ff">
                    <div
                      className="relative rounded-2xl p-5 space-y-5"
                      style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                    >
                      {/* Priority badge top-right */}
                      <div
                        className="absolute right-4 top-4 flex items-center gap-1 rounded-full px-3 py-1"
                        style={{ background: "#6c63ff18", border: "1px solid #6c63ff33" }}
                      >
                        <Target style={{ width: 11, height: 11, color: "var(--primary)" }} />
                        <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>Priority #1</span>
                      </div>

                      {/* Skill name + badges */}
                      <div className="flex flex-wrap items-center gap-2 pr-28">
                        <span className="text-base font-black" style={{ color: "var(--foreground)" }}>{up.skill}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${isNI ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"}`}
                        >
                          {up.gap_type}
                        </span>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${pb.className}`}>
                          {pb.label}
                        </span>
                      </div>

                      {/* Tactical Steps */}
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Tactical Steps</p>
                        <ol className="space-y-2">
                          {up.tactical_steps.map((step, si) => (
                            <li key={si} className="flex items-start gap-3">
                              <span
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black text-white mt-0.5"
                                style={{ background: "linear-gradient(135deg,#6c63ff,#a78bfa)" }}
                              >
                                {si + 1}
                              </span>
                              <span className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Timeline */}
                      <div
                        className="flex items-center gap-3 rounded-xl px-4 py-3 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-800"
                      >
                        <Clock className="text-emerald-600 dark:text-emerald-400" style={{ width: 15, height: 15, flexShrink: 0 }} />
                        <div>
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Estimated Timeline</p>
                          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{up.estimated_timeline}</p>
                        </div>
                      </div>

                      {/* Suggested Resources */}
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <Link2 style={{ width: 13, height: 13, color: "var(--primary)" }} />
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Suggested Resources</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {up.suggested_resources.map((res, ri) => (
                            <span
                              key={ri}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                              style={{ background: "var(--accent)", color: "var(--primary)", border: "1px solid var(--accent)" }}
                            >
                              {res}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Section>
                </div>
              );
            })()}

            {/* ── 7. Bonus Skills ── */}
            {ga.bonus_skills_analysis.length > 0 && (
              <div className="reveal-section" style={{ animationDelay: "560ms" }}>
                <Section title={`Bonus Skills Analysis (${ga.bonus_skills_analysis.length})`} icon={Star} accent="#f59e0b">
                  <div className="space-y-2">
                    {ga.bonus_skills_analysis.map((bs, i) => (
                      <div
                        key={i}
                        className={`flex flex-wrap items-start gap-4 rounded-xl p-4 border ${
                          bs.is_relevant
                            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-800"
                            : "bg-muted border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          {bs.is_relevant
                            ? <Star className="text-amber-500 dark:text-amber-400" style={{ width: 14, height: 14, fill: "currentColor" }} />
                            : <AlertTriangle style={{ width: 14, height: 14, color: "var(--muted-foreground)" }} />
                          }
                          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{bs.skill}</span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                              bs.is_relevant
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {bs.is_relevant ? "Relevant" : "Irrelevant"}
                          </span>
                        </div>
                        <p className="flex-1 text-sm" style={{ color: "var(--muted-foreground)" }}>{bs.leverage_evaluation}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {/* ── 8. Remaining Essential Upskill Pathways ── */}
            {ga.upskill_pathways.slice(1).filter(up => up.priority === "Essential").length > 0 && (() => {
              const essentials = ga.upskill_pathways.slice(1).filter(up => up.priority === "Essential");
              return (
                <div className="reveal-section" style={{ animationDelay: "640ms" }}>
                  <Section title={`Additional Essential Upskill Pathways (${essentials.length})`} icon={BookOpen} accent="#dc2626">
                    <div className="space-y-4">
                      {essentials.map((up, idx) => {
                        const pb   = priorityBadge(up.priority);
                        const isNI = up.gap_type === "Needs Improvement";
                        return (
                          <div
                            key={idx}
                            className="relative rounded-2xl p-5 space-y-5"
                            style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                          >
                            {/* Badge top-right */}
                            <div
                              className="absolute right-4 top-4 flex items-center gap-1 rounded-full px-3 py-1"
                              style={{ background: "#dc262618", border: "1px solid #dc262633" }}
                            >
                              <Target className="text-red-600 dark:text-red-400" style={{ width: 11, height: 11 }} />
                              <span className="text-xs font-bold text-red-600 dark:text-red-400">Essential</span>
                            </div>

                            {/* Skill name + badges */}
                            <div className="flex flex-wrap items-center gap-2 pr-28">
                              <span className="text-base font-black" style={{ color: "var(--foreground)" }}>{up.skill}</span>
                              <span
                                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${isNI ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"}`}
                              >
                                {up.gap_type}
                              </span>
                              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${pb.className}`}>
                                {pb.label}
                              </span>
                            </div>

                            {/* Tactical Steps */}
                            <div>
                              <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Tactical Steps</p>
                              <ol className="space-y-2">
                                {up.tactical_steps.map((step, si) => (
                                  <li key={si} className="flex items-start gap-3">
                                    <span
                                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black text-white mt-0.5"
                                      style={{ background: "linear-gradient(135deg,#6c63ff,#a78bfa)" }}
                                    >
                                      {si + 1}
                                    </span>
                                    <span className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Timeline */}
                            <div
                              className="flex items-center gap-3 rounded-xl px-4 py-3 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-800"
                            >
                              <Clock className="text-emerald-600 dark:text-emerald-400" style={{ width: 15, height: 15, flexShrink: 0 }} />
                              <div>
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Estimated Timeline</p>
                                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{up.estimated_timeline}</p>
                              </div>
                            </div>

                            {/* Suggested Resources */}
                            <div>
                              <div className="mb-2 flex items-center gap-2">
                                <Link2 style={{ width: 13, height: 13, color: "var(--primary)" }} />
                                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Suggested Resources</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {up.suggested_resources.map((res, ri) => (
                                  <span
                                    key={ri}
                                    className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                                    style={{ background: "var(--accent)", color: "var(--primary)", border: "1px solid var(--accent)" }}
                                  >
                                    {res}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                </div>
              );
            })()}

            {/* ── 9. Optional Upskill Pathways ── */}
            {ga.upskill_pathways.filter(up => up.priority === "Optional").length > 0 && (() => {
              const optionals = ga.upskill_pathways.filter(up => up.priority === "Optional");
              return (
                <div className="reveal-section" style={{ animationDelay: "720ms" }}>
                  <Section title={`Optional Upskill Pathways (${optionals.length})`} icon={BookOpen} accent="#6b7280">
                    <div className="space-y-4">
                      {optionals.map((up, idx) => {
                        const pb   = priorityBadge(up.priority);
                        const isNI = up.gap_type === "Needs Improvement";
                        return (
                          <div
                            key={idx}
                            className="relative rounded-2xl p-5 space-y-5"
                            style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                          >
                            {/* Badge top-right */}
                            <div
                              className="absolute right-4 top-4 flex items-center gap-1 rounded-full px-3 py-1 bg-muted"
                              style={{ border: "1px solid var(--border)" }}
                            >
                              <Target style={{ width: 11, height: 11, color: "var(--muted-foreground)" }} />
                              <span className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>Optional</span>
                            </div>

                            {/* Skill name + badges */}
                            <div className="flex flex-wrap items-center gap-2 pr-28">
                              <span className="text-base font-black" style={{ color: "var(--foreground)" }}>{up.skill}</span>
                              <span
                                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${isNI ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"}`}
                              >
                                {up.gap_type}
                              </span>
                              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${pb.className}`}>
                                {pb.label}
                              </span>
                            </div>

                            {/* Tactical Steps */}
                            <div>
                              <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Tactical Steps</p>
                              <ol className="space-y-2">
                                {up.tactical_steps.map((step, si) => (
                                  <li key={si} className="flex items-start gap-3">
                                    <span
                                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black text-white mt-0.5"
                                      style={{ background: "linear-gradient(135deg,#9ca3af,#d1d5db)" }}
                                    >
                                      {si + 1}
                                    </span>
                                    <span className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Timeline */}
                            <div
                              className="flex items-center gap-3 rounded-xl px-4 py-3 bg-muted"
                              style={{ border: "1px solid var(--border)" }}
                            >
                              <Clock style={{ width: 15, height: 15, color: "var(--muted-foreground)", flexShrink: 0 }} />
                              <div>
                                <p className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>Estimated Timeline</p>
                                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{up.estimated_timeline}</p>
                              </div>
                            </div>

                            {/* Suggested Resources */}
                            <div>
                              <div className="mb-2 flex items-center gap-2">
                                <Link2 style={{ width: 13, height: 13, color: "var(--muted-foreground)" }} />
                                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Suggested Resources</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {up.suggested_resources.map((res, ri) => (
                                  <span
                                    key={ri}
                                    className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-muted text-muted-foreground"
                                    style={{ border: "1px solid var(--border)" }}
                                  >
                                    {res}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                </div>
              );
            })()}

          </div>
        )}
      </div>
    </>
  );
}
