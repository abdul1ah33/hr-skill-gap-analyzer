import React, { useState } from "react";
import type { Employee, Position } from "../types/employee";
import {
  Sparkles,
  CheckCircle,
  AlertTriangle,
  XCircle,
  GraduationCap,
  Download,
  Play,
  ChevronRight,
  AlertOctagon,
} from "lucide-react";
import { Card, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";

interface AIAssessmentPageProps {
  employees: Employee[];
  positions: Position[];
}

interface MatchItem {
  skill: string;
  employeeLevel: string;
  requiredLevel: string;
  essential: boolean;
  aliasMatched?: string;
}

export const AIAssessmentPage: React.FC<AIAssessmentPageProps> = ({
  employees,
  positions,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<number | "">(employees[0]?.id || "");
  const [selectedPositionId, setSelectedPositionId] = useState<number | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const selectedEmployee = employees.find((e) => e.id === Number(selectedEmpId));
  const targetPosition =
    positions.find((p) => p.id === Number(selectedPositionId)) ||
    positions.find((p) => p.id === selectedEmployee?.roleId) ||
    positions[0];

  // Auto-select employee's own position when employee changes
  React.useEffect(() => {
    if (selectedEmployee) {
      setSelectedPositionId(selectedEmployee.roleId || "");
      setReportGenerated(false);
      setAssessmentData(null);
      setApiError(null);
    }
  }, [selectedEmployee?.id]);

  const handleRunAssessment = async () => {
    if (!selectedEmployee) return;
    setIsProcessing(true);
    setReportGenerated(false);
    setApiError(null);

    try {
      // Use the axios instance so Authorization header is automatically attached
      // Pass position_id as a query param so we can assess against a target position
      const params = selectedPositionId ? { position_id: Number(selectedPositionId) } : {};
      const { data } = await api.post(
        `/assessment/employee/${selectedEmployee.id}/assess`,
        null,
        { params }
      );
      setAssessmentData(data);
      setReportGenerated(true);
    } catch (error: any) {
      console.error("Assessment API error:", error);
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        "Unknown error";
      setApiError(`Assessment failed: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Use real assessment data or fallback to mock data
  const matchedSkills: MatchItem[] = assessmentData?.matched || [];
  const needsImprovement: MatchItem[] = assessmentData?.needs_improvement || [];
  const missingSkills: MatchItem[] = assessmentData?.missing || [];
  const matchPercentage = assessmentData?.match_percentage || 0;
  const aiReport = assessmentData?.ai_report || null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-pulse" />
            AI Skill Assessment & Gap Analysis
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Flagship AI engine evaluating employee capabilities against position requirements using bidirectional skill alias resolution.
          </p>
        </div>

        {reportGenerated && (
          <Button variant="outline" onClick={() => window.print()} className="gap-2 text-xs">
            <Download className="w-4 h-4" /> Export Report (PDF)
          </Button>
        )}
      </div>

      {/* API Error Banner */}
      {apiError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm"
        >
          <AlertOctagon className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold">Assessment Error</p>
            <p className="text-xs opacity-80 mt-0.5">{apiError}</p>
          </div>
        </motion.div>
      )}

      {/* Selector Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <div>
              <label className="font-bold text-xs text-slate-700 dark:text-slate-300 block mb-1.5">
                1. Select Target Employee
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => {
                  setSelectedEmpId(Number(e.target.value));
                  setReportGenerated(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.employeeNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-xs text-slate-700 dark:text-slate-300 block mb-1.5">
                2. Target Position Profile
              </label>
              <select
                value={selectedPositionId}
                onChange={(e) => {
                  setSelectedPositionId(Number(e.target.value));
                  setReportGenerated(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.level || "Not specified"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            variant="gradient"
            size="lg"
            onClick={handleRunAssessment}
            disabled={isProcessing || !selectedEmployee}
            className="gap-2 shadow-lg shadow-purple-500/30"
          >
            {isProcessing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Applying Alias Engine...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run AI Gap Analysis</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Animated Loading State */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-12 rounded-3xl bg-slate-900 border border-purple-900/40 text-center space-y-4 text-white shadow-2xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-purple mx-auto flex items-center justify-center shadow-lg shadow-purple-500/50">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-xl font-extrabold tracking-wide">Executing AI Skill Gap Engine</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Normalizing employee skills against canonical taxonomy... Checking 193 skill aliases across software, engineering, and finance domains.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assessment Output Report */}
      {reportGenerated && selectedEmployee && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Top Overall Score Card */}
          <Card className="p-6 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white border-purple-900/50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <Badge variant="primary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  Assessment Completed
                </Badge>
                <h2 className="text-2xl font-black">
                  Competency Evaluation: {selectedEmployee.firstName} {selectedEmployee.lastName}
                </h2>
                <p className="text-xs text-slate-300">
                  Target Role: <span className="font-bold text-white">{targetPosition.title}</span> • Evaluated using Skill Alias System.
                </p>
              </div>

              {/* Match Score Gauge */}
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-purple-400"
                      strokeDasharray={`${matchPercentage}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-lg font-black">{matchPercentage}%</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-purple-300">Overall Match Score</p>
                  <p className="text-[11px] text-slate-300">
                    {matchedSkills.length + needsImprovement.length + missingSkills.length === 0
                      ? "No skills defined for position"
                      : matchPercentage >= 75
                      ? "Strong candidate alignment"
                      : matchPercentage >= 40
                      ? "Moderate candidate alignment"
                      : "Low alignment - Gap identified"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {matchedSkills.length + needsImprovement.length + missingSkills.length === 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between">
              <span>
                <strong>Notice:</strong> The selected position profile has 0 required skills configured in the system. Go to the <strong>Positions</strong> page to assign required skills for an accurate assessment.
              </span>
            </div>
          )}

          {/* 3 Columns: Matched, Needs Improvement, Missing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Matched Skills */}
            <Card className="p-5 border-emerald-200 dark:border-emerald-950">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Matched Skills ({matchedSkills.length})</h3>
              </div>
              <div className="space-y-2.5">
                {matchedSkills.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{m.skill}</span>
                      <Badge variant="success">Matched</Badge>
                    </div>
                    {m.aliasMatched && (
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                        Alias Matched via: "{m.aliasMatched}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Needs Improvement */}
            <Card className="p-5 border-amber-200 dark:border-amber-950">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Needs Improvement ({needsImprovement.length})</h3>
              </div>
              <div className="space-y-2.5">
                {needsImprovement.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{m.skill}</span>
                      <Badge variant="warning">Upskill Needed</Badge>
                    </div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                      Current: {m.employeeLevel} • Required: {m.requiredLevel}
                    </p>
                    {m.aliasMatched && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                        Matched via profile skill: "{m.aliasMatched}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Missing Skills */}
            <Card className="p-5 border-rose-200 dark:border-rose-950">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Missing Requirements ({missingSkills.length})</h3>
              </div>
              <div className="space-y-2.5">
                {missingSkills.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{m.skill}</span>
                      <Badge variant="danger">{m.essential ? "Essential" : "Recommended"}</Badge>
                    </div>
                    <p className="text-[10px] text-rose-700 dark:text-rose-400 mt-1">
                      Not found in profile or aliases.
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* AI Generated Report */}
          {aiReport && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-6 h-6 text-purple-600" />
                <div>
                  <CardTitle>AI Assessment Report</CardTitle>
                  <CardDescription>Comprehensive analysis generated by AI</CardDescription>
                </div>
              </div>

              <div className="space-y-6">
                {/* Skill Assessment */}
                {aiReport["Skill Assessment"] && (
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">Skill Assessment</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {typeof aiReport["Skill Assessment"] === "string" ? aiReport["Skill Assessment"] : JSON.stringify(aiReport["Skill Assessment"])}
                    </p>
                  </div>
                )}

                {/* Strengths */}
                {aiReport["Strengths"] && (
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">Strengths</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {typeof aiReport["Strengths"] === "string" ? aiReport["Strengths"] : JSON.stringify(aiReport["Strengths"])}
                    </p>
                  </div>
                )}

                {/* Skill Gaps */}
                {aiReport["Skill Gaps"] && (
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">Skill Gaps</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {typeof aiReport["Skill Gaps"] === "string" ? aiReport["Skill Gaps"] : JSON.stringify(aiReport["Skill Gaps"])}
                    </p>
                  </div>
                )}

                {/* Development Areas */}
                {aiReport["Development Areas"] && (
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">Development Areas</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {typeof aiReport["Development Areas"] === "string" ? aiReport["Development Areas"] : JSON.stringify(aiReport["Development Areas"])}
                    </p>
                  </div>
                )}

                {/* Training Priorities */}
                {aiReport["Training Priorities"] && (
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">Training Priorities</h4>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-none">
                      {Array.isArray(aiReport["Training Priorities"])
                        ? aiReport["Training Priorities"].map((priority: any, idx: number) => {
                            let text = "";
                            let duration = "";
                            if (typeof priority === "string") {
                              try {
                                const parsed = JSON.parse(priority);
                                text = parsed["Suggested training"] || parsed["training"] || priority;
                                duration = parsed["Estimated duration"] ? ` (${parsed["Estimated duration"]})` : "";
                              } catch {
                                text = priority;
                              }
                            } else if (typeof priority === "object" && priority !== null) {
                              text = priority["Suggested training"] || priority.title || priority.name || JSON.stringify(priority);
                              duration = priority["Estimated duration"] ? ` (${priority["Estimated duration"]})` : "";
                            }
                            return (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{text}</span>
                                {duration && <span className="text-[10px] text-slate-400">{duration}</span>}
                              </li>
                            );
                          })
                        : <li className="font-semibold text-slate-800 dark:text-slate-200">{String(aiReport["Training Priorities"])}</li>}
                    </ul>
                  </div>
                )}

                {/* Recommended Learning Plan */}
                {aiReport["Recommended Learning Plan"] && (
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">Recommended Learning Plan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.isArray(aiReport["Recommended Learning Plan"]) ? (
                        aiReport["Recommended Learning Plan"].map((plan: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                  {plan["Suggested training"] || plan["training"] || plan["course"] || "Recommended Training"}
                                </h4>
                                <Badge variant="primary">{idx === 0 ? "High Priority" : "Medium Priority"}</Badge>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Duration: {plan["Estimated duration"] || plan["duration"] || "N/A"} • Outcome: {plan["Expected outcome"] || plan["outcome"] || "Skill improvement"}
                              </p>
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-semibold">
                              <span className="text-slate-400">AI Recommended</span>
                              <Button variant="outline" size="sm" className="gap-1 text-xs">
                                Assign Course <ChevronRight className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                          {String(aiReport["Recommended Learning Plan"])}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Final Recommendation */}
                {aiReport["Final Recommendation"] && (
                  <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">Final Recommendation</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {typeof aiReport["Final Recommendation"] === "string" ? aiReport["Final Recommendation"] : JSON.stringify(aiReport["Final Recommendation"])}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AIAssessmentPage;
