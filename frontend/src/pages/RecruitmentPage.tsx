import React, { useState } from "react";
import { UserPlus, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { motion } from "framer-motion";
import api from "../api/axios";

interface Candidate {
  id: number;
  name: string;
  role: string;
  matchScore: number;
  stage: "Applied" | "Screened" | "Interviewing" | "Offered" | "Hired";
  skills: string[];
}

const INITIAL_CANDIDATES: Candidate[] = [
  { id: 1, name: "Marcus Vance", role: "Senior Fullstack Engineer", matchScore: 94, stage: "Interviewing", skills: ["React", "Python", "Docker"] },
  { id: 2, name: "Elena Rostova", role: "HR Operations Lead", matchScore: 88, stage: "Applied", skills: ["Talent Acquisition", "SAP Payroll"] },
  { id: 3, name: "David Kim", role: "DevOps Engineer", matchScore: 91, stage: "Screened", skills: ["Kubernetes", "AWS", "CI/CD"] },
  { id: 4, name: "Sophia Martinez", role: "Financial Analyst", matchScore: 85, stage: "Offered", skills: ["Power BI", "Excel", "Budgeting"] },
];

export const RecruitmentPage: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const stages: Candidate["stage"][] = ["Applied", "Screened", "Interviewing", "Offered", "Hired"];

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/resume/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Success - add the new employee to candidates list
      const newCandidate: Candidate = {
        id: response.data.employee_id,
        name: "Imported from Resume",
        role: "New Position",
        matchScore: 95,
        stage: "Applied",
        skills: ["Imported Skills"],
      };

      setCandidates((prev) => [newCandidate, ...prev]);
      setUploadStatus({ type: 'success', message: 'Resume imported successfully! Employee created.' });
    } catch (error: any) {
      console.error('Resume upload failed:', error);
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to import resume. Please try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        handleFileUpload(file);
      } else {
        setUploadStatus({
          type: 'error',
          message: 'Please upload a PDF or DOCX file.'
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Recruitment & AI Resume Parsing
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ClickUp-inspired candidate pipeline, drag-and-drop recruitment Kanban, and automated resume skill extraction.
          </p>
        </div>

        {/* Resume Dropzone Button */}
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".pdf,.docx,.doc"
            className="hidden"
            disabled={isUploading}
          />
          <Button
            variant="gradient"
            className="gap-2 shadow-lg shadow-purple-500/20"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            {isUploading ? "Parsing Resume..." : "Upload Resume (PDF/DOCX)"}
          </Button>
        </div>

        {/* Upload Status Message */}
        {uploadStatus.type && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
            uploadStatus.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{uploadStatus.message}</span>
          </div>
        )}
      </div>

      {/* Resume Drop Area */}
      <Card
        className={`p-6 border-dashed border-2 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-purple-500 bg-purple-100 dark:bg-purple-950/30'
            : 'border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/10 hover:border-purple-400 dark:hover:border-purple-800'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="max-w-md mx-auto space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6 animate-bounce" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            {isDragging ? 'Drop Resume Here' : 'Drop Candidate Resumes Here'}
          </h3>
          <p className="text-xs text-slate-500">AI automatically extracts contact info, experience, and maps skills using Skill Alias Engine.</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Click or drag & drop PDF/DOCX files</p>
        </div>
      </Card>

      {/* ClickUp-Inspired Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageCandidates = candidates.filter((c) => c.stage === stage);
          return (
            <div key={stage} className="space-y-3 min-w-[240px]">
              {/* Stage Header */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{stage}</span>
                <Badge variant="primary">{stageCandidates.length}</Badge>
              </div>

              {/* Candidates Column */}
              <div className="space-y-3 min-h-[350px] p-2 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
                {stageCandidates.map((cand) => (
                  <motion.div key={cand.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="p-4 space-y-3 hover:border-purple-500/40 transition-all cursor-grab active:cursor-grabbing">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{cand.name}</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                          {cand.matchScore}% Match
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">{cand.role}</p>

                      <div className="flex flex-wrap gap-1">
                        {cand.skills.map((s) => (
                          <span key={s} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecruitmentPage;
