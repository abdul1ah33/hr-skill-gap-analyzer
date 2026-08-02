import React, { useState } from "react";
import type { Position, Department, Skill } from "../types/employee";
import {
  Briefcase, Edit2, Trash2, Award, Plus, X, Loader2,
  ChevronDown, ChevronUp, Settings, AlertCircle, Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import {
  getPositionSkills,
  addPositionSkill,
  removePositionSkill,
  generatePositionSkills,
} from "../services/employeeService";
import { motion, AnimatePresence } from "framer-motion";

interface RolesPageProps {
  positions: Position[];
  departments: Department[];
  skills: Skill[];
  addPosition: (pos: Partial<Position>) => Promise<void>;
  deletePosition: (id: number) => Promise<void>;
}

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

export const RolesPage: React.FC<RolesPageProps> = ({
  positions,
  departments,
  skills,
  addPosition,
  deletePosition,
}) => {
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState<number>(departments[0]?.id || 0);
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("Mid-level");
  const [editingId, setEditingId] = useState<number | null>(null);

  // Position skill management
  const [expandedPositionId, setExpandedPositionId] = useState<number | null>(null);
  const [positionSkills, setPositionSkills] = useState<Record<number, any[]>>({});
  const [loadingSkills, setLoadingSkills] = useState<number | null>(null);
  const [addingSkill, setAddingSkill] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<number | "">("");
  const [requiredLevel, setRequiredLevel] = useState("Intermediate");
  const [importance] = useState(5);
  const [isEssential, setIsEssential] = useState(true);
  const [skillError, setSkillError] = useState("");
  const [generatingAi, setGeneratingAi] = useState<Record<number, boolean>>({});

  const handleAutoGenerateSkills = async (posId: number) => {
    setGeneratingAi(prev => ({ ...prev, [posId]: true }));
    setSkillError("");
    try {
      await generatePositionSkills(posId);
      const res = await getPositionSkills(posId);
      setPositionSkills(prev => ({ ...prev, [posId]: res.data }));
    } catch (e: any) {
      setSkillError(e?.response?.data?.detail || "AI skill generation failed.");
    } finally {
      setGeneratingAi(prev => ({ ...prev, [posId]: false }));
    }
  };

  React.useEffect(() => {
    if (departments.length > 0 && !departmentId) {
      setDepartmentId(departments[0].id || 0);
    }
  }, [departments, departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !departmentId) return;
    await addPosition({ title, departmentId, description, level });
    setTitle("");
    setDescription("");
    setLevel("Mid-level");
    setEditingId(null);
  };

  const handleEditClick = (pos: Position) => {
    if (pos.id) {
      setEditingId(pos.id);
      setTitle(pos.title);
      setDepartmentId(pos.departmentId);
      setDescription(pos.description || "");
      setLevel(pos.level || "Mid-level");
    }
  };

  const handleDeleteClick = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this position/role?")) {
      await deletePosition(id);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setLevel("Mid-level");
  };

  const getDepartmentName = (id: number) => {
    const dept = departments.find((d) => d.id === id);
    return dept ? dept.name : `Dept #${id}`;
  };

  const togglePositionSkills = async (posId: number) => {
    if (expandedPositionId === posId) {
      setExpandedPositionId(null);
      return;
    }
    setExpandedPositionId(posId);
    setSkillError("");
    setSelectedSkillId("");
    if (!positionSkills[posId]) {
      setLoadingSkills(posId);
      try {
        const res = await getPositionSkills(posId);
        setPositionSkills(prev => ({ ...prev, [posId]: res.data }));
      } catch (e) {
        setSkillError("Failed to load position skills.");
      } finally {
        setLoadingSkills(null);
      }
    }
  };

  const handleAddPositionSkill = async (posId: number) => {
    if (!selectedSkillId) return;
    setAddingSkill(true);
    setSkillError("");
    try {
      await addPositionSkill(posId, Number(selectedSkillId), requiredLevel, importance, isEssential);
      // Refresh
      const res = await getPositionSkills(posId);
      setPositionSkills(prev => ({ ...prev, [posId]: res.data }));
      setSelectedSkillId("");
    } catch (e: any) {
      setSkillError(e?.response?.data?.detail || "Could not add skill. It may already be assigned.");
    } finally {
      setAddingSkill(false);
    }
  };

  const handleRemovePositionSkill = async (posId: number, skillId: number) => {
    try {
      await removePositionSkill(posId, skillId);
      setPositionSkills(prev => ({
        ...prev,
        [posId]: prev[posId].filter(s => s.skill_id !== skillId),
      }));
    } catch {
      setSkillError("Failed to remove skill.");
    }
  };

  const levelColor = (l: string) => {
    switch (l) {
      case "Beginner": return "secondary";
      case "Intermediate": return "info";
      case "Advanced": return "warning";
      case "Expert": return "success";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Positions & Competency Profiles
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Define job positions and assign required skill requirements for AI gap analysis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <Card className="p-6 h-fit">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-600" />
              {editingId !== null ? "Edit Position" : "Create Position"}
            </CardTitle>
            <CardDescription>
              {editingId !== null ? "Update position specification" : "Add a new job position to the matrix"}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Position Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Fullstack Engineer"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Seniority Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Junior">Junior</option>
                <option value="Mid-level">Mid-level</option>
                <option value="Senior">Senior</option>
                <option value="Manager">Manager</option>
                <option value="Director">Director</option>
                <option value="VP / Executive">VP / Executive</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Job Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key role responsibilities & required experience..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="gradient" type="submit" className="flex-1">
                {editingId !== null ? "Save Changes" : "Create Position"}
              </Button>
              {editingId !== null && (
                <Button variant="outline" type="button" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Positions Table Column */}
        <div className="lg:col-span-2 space-y-3">
          {positions.length === 0 && (
            <Card className="p-12 text-center text-sm text-slate-400">No positions defined yet.</Card>
          )}
          {positions.map((pos) => {
            const isExpanded = expandedPositionId === pos.id;
            const pSkills = pos.id ? (positionSkills[pos.id] || []) : [];
            const isLoading = loadingSkills === pos.id;

            return (
              <Card key={pos.id} className="overflow-hidden">
                {/* Position Row */}
                <div className="flex items-center justify-between p-4 gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{pos.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px]">{getDepartmentName(pos.departmentId)}</Badge>
                        <Badge variant="info" className="text-[10px]">{pos.level || "Mid-level"}</Badge>
                        {isExpanded && (
                          <Badge variant="primary" className="text-[10px]">{pSkills.length} required skills</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => pos.id && togglePositionSkills(pos.id)}
                      className="gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Skills
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(pos)} title="Edit">
                      <Edit2 className="w-4 h-4 text-slate-400 hover:text-purple-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => pos.id && handleDeleteClick(pos.id)} title="Delete">
                      <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                    </Button>
                  </div>
                </div>

                {/* Expandable Skills Panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-slate-100 dark:border-slate-800"
                    >
                      <div className="p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Required Skills for AI Assessment
                          </p>
                          <Button
                            variant="gradient"
                            size="sm"
                            onClick={() => pos.id && handleAutoGenerateSkills(pos.id)}
                            disabled={generatingAi[pos.id || 0]}
                            className="gap-1.5 text-xs shadow-sm shadow-purple-500/20"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${generatingAi[pos.id || 0] ? "animate-spin" : ""}`} />
                            <span>{generatingAi[pos.id || 0] ? "Generating with AI..." : "Auto-Generate with AI"}</span>
                          </Button>
                        </div>

                        {/* Error */}
                        {skillError && (
                          <div className="flex items-center gap-2 text-rose-500 text-xs p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{skillError}</span>
                          </div>
                        )}

                        {/* Add Skill Form */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <select
                            value={selectedSkillId}
                            onChange={(e) => setSelectedSkillId(Number(e.target.value) || "")}
                            className="sm:col-span-2 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">— Select Skill —</option>
                            {skills.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>

                          <select
                            value={requiredLevel}
                            onChange={(e) => setRequiredLevel(e.target.value)}
                            className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {SKILL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>

                          <div className="flex gap-2">
                            <div className="flex items-center gap-1.5 px-2">
                              <input
                                type="checkbox"
                                id="essential"
                                checked={isEssential}
                                onChange={(e) => setIsEssential(e.target.checked)}
                                className="accent-purple-600 w-3.5 h-3.5"
                              />
                              <label htmlFor="essential" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">Essential</label>
                            </div>
                            <Button
                              variant="gradient"
                              size="sm"
                              className="gap-1 text-xs flex-1"
                              onClick={() => pos.id && handleAddPositionSkill(pos.id)}
                              disabled={!selectedSkillId || addingSkill}
                            >
                              {addingSkill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                              Add
                            </Button>
                          </div>
                        </div>

                        {/* Current Skills List */}
                        {isLoading ? (
                          <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading required skills...
                          </div>
                        ) : pSkills.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2">
                            No required skills defined. Add at least one skill above so the AI assessment can compare against this position.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {pSkills.map((ps: any) => (
                              <div
                                key={ps.skill_id}
                                className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  <Award className="w-3.5 h-3.5 text-purple-500" />
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{ps.name}</span>
                                  <Badge variant={levelColor(ps.required_skill_level) as any} className="text-[10px]">
                                    {ps.required_skill_level}
                                  </Badge>
                                  {ps.is_essential && (
                                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded">Essential</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => pos.id && handleRemovePositionSkill(pos.id, ps.skill_id)}
                                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                  title="Remove"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RolesPage;
