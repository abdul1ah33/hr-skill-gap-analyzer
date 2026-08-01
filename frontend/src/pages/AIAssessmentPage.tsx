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
} from "lucide-react";
import { Card, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  const selectedEmployee = employees.find((e) => e.id === Number(selectedEmpId));
  const targetPosition = positions.find((p) => p.id === selectedEmployee?.roleId) || positions[0];

  const handleRunAssessment = () => {
    if (!selectedEmployee) return;
    setIsProcessing(true);
    setReportGenerated(false);

    // Simulate AI & Skill Alias Resolution Processing
    setTimeout(() => {
      setIsProcessing(false);
      setReportGenerated(true);
    }, 2000);
  };

  // Mock Analysis Result leveraging Skill Alias engine
  const matchedSkills: MatchItem[] = [
    { skill: "Computer Programming", employeeLevel: "Advanced", requiredLevel: "Intermediate", essential: true, aliasMatched: "Python" },
    { skill: "Database Management", employeeLevel: "Expert", requiredLevel: "Advanced", essential: true, aliasMatched: "PostgreSQL" },
    { skill: "Version Control", employeeLevel: "Beginner", requiredLevel: "Intermediate", essential: true, aliasMatched: "Git" },
  ];

  const needsImprovement: MatchItem[] = [
    { skill: "Containerization", employeeLevel: "Beginner", requiredLevel: "Advanced", essential: false, aliasMatched: "Docker" },
  ];

  const missingSkills: MatchItem[] = [
    { skill: "AI & Machine Learning", employeeLevel: "None", requiredLevel: "Intermediate", essential: false },
    { skill: "Cloud Architecture", employeeLevel: "None", requiredLevel: "Advanced", essential: true },
  ];

  const matchPercentage = 78;

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
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center justify-between">
                <span>{targetPosition?.title || "Position Profile"}</span>
                <Badge variant="primary">{targetPosition?.level || "Mid-level"}</Badge>
              </div>
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
                  <p className="text-[11px] text-slate-300">Strong candidate alignment</p>
                </div>
              </div>
            </div>
          </Card>

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

          {/* Recommended Learning Plan Cards */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-6 h-6 text-purple-600" />
              <div>
                <CardTitle>Recommended AI Training & Learning Plan</CardTitle>
                <CardDescription>Tailored learning track based on missing competencies</CardDescription>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Cloud Architecture & AWS Mastery</h4>
                    <Badge variant="danger">High Priority</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comprehensive training covering cloud infrastructure, microservices design, and serverless deployment.
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <span className="text-slate-400">Est. Duration: 4 Weeks</span>
                  <Button variant="gradient" size="sm" className="gap-1 text-xs">
                    Assign Course <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Advanced Kubernetes & Orchestration</h4>
                    <Badge variant="warning">Medium Priority</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hands-on lab training on container orchestration, CI/CD integrations, and cluster monitoring.
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <span className="text-slate-400">Est. Duration: 2 Weeks</span>
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    Assign Course <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default AIAssessmentPage;
