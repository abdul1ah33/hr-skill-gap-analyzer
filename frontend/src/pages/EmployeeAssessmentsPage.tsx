import React, { useState } from "react";
import { 
  ClipboardCheck, 
  Play, 
  CheckCircle, 
  Clock, 
  Award, 
  FileText, 
  BookOpen 
} from "lucide-react";

export interface AssessmentItem {
  id: number;
  title: string;
  category: string;
  durationMinutes: number;
  dueDate: string;
  status: "Completed" | "Pending";
  score?: string;
  description: string;
}

const MOCK_ASSESSMENTS: AssessmentItem[] = [
  {
    id: 1,
    title: "AI Safety & Workplace Ethics 2026",
    category: "Compliance & Safety",
    durationMinutes: 30,
    dueDate: "2026-08-15",
    status: "Pending",
    description: "Annual mandatory training on ethical AI usage, data privacy policies, and security best practices."
  },
  {
    id: 2,
    title: "Quarterly Technical Competency Review",
    category: "Performance Assessment",
    durationMinutes: 45,
    dueDate: "2026-08-30",
    status: "Pending",
    description: "Evaluate core technical capabilities, codebase knowledge, and recent project achievements."
  },
  {
    id: 3,
    title: "Information Security Awareness",
    category: "Security",
    durationMinutes: 20,
    dueDate: "2026-06-10",
    status: "Completed",
    score: "96%",
    description: "Phishing prevention, password hygiene, and cloud infrastructure security principles."
  },
  {
    id: 4,
    title: "Cross-functional Leadership & Communication",
    category: "Professional Development",
    durationMinutes: 40,
    dueDate: "2026-05-20",
    status: "Completed",
    score: "92%",
    description: "Assessment on team communication dynamics, project ownership, and conflict resolution."
  }
];

export const EmployeeAssessmentsPage: React.FC = () => {
  const [assessments] = useState<AssessmentItem[]>(MOCK_ASSESSMENTS);

  const completedCount = assessments.filter((a) => a.status === "Completed").length;
  const pendingCount = assessments.filter((a) => a.status === "Pending").length;

  const handleStartAssessment = (assessment: AssessmentItem) => {
    alert(`Starting assessment: "${assessment.title}". This module will connect to backend evaluation APIs.`);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Assessments</h1>
          <p className="page-description">Complete assigned skills, compliance, and performance evaluations</p>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Available Assessments</span>
            <div className="stat-icon">
              <ClipboardCheck size={20} />
            </div>
          </div>
          <div className="stat-value">{assessments.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Pending</span>
            <div className="stat-icon" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", color: "var(--accent-amber)" }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "var(--accent-amber)" }}>{pendingCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Completed</span>
            <div className="stat-icon" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--accent-emerald)" }}>
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "var(--accent-emerald)" }}>{completedCount}</div>
        </div>
      </div>

      {/* Assessment List Section */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>
        Assigned Modules
      </h2>

      <div className="assessments-grid">
        {assessments.map((item) => (
          <div key={item.id} className="assessment-card">
            <div className="assessment-card-header">
              <div className="assessment-icon-box">
                <BookOpen size={22} className="text-accent" />
              </div>
              <span className={`badge ${item.status === "Completed" ? "badge-completed" : "badge-pending"}`}>
                {item.status === "Completed" ? (
                  <>
                    <CheckCircle size={14} style={{ marginRight: 4 }} /> Completed
                  </>
                ) : (
                  <>
                    <Clock size={14} style={{ marginRight: 4 }} /> Pending
                  </>
                )}
              </span>
            </div>

            <h3 className="assessment-card-title">{item.title}</h3>
            <p className="assessment-card-desc">{item.description}</p>

            <div className="assessment-meta-list">
              <div className="assessment-meta-item">
                <FileText size={14} /> <span>{item.category}</span>
              </div>
              <div className="assessment-meta-item">
                <Clock size={14} /> <span>{item.durationMinutes} mins</span>
              </div>
              <div className="assessment-meta-item">
                <Award size={14} /> 
                <span>{item.status === "Completed" ? `Score: ${item.score}` : `Due: ${item.dueDate}`}</span>
              </div>
            </div>

            <div className="assessment-card-footer">
              {item.status === "Pending" ? (
                <button
                  onClick={() => handleStartAssessment(item)}
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Play size={16} /> Start Assessment
                </button>
              ) : (
                <button
                  disabled
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "center", opacity: 0.7, cursor: "default" }}
                >
                  <CheckCircle size={16} /> Assessment Completed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmployeeAssessmentsPage;
