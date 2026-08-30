import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPositionById } from "../services/positionService";
import {
  getPositionSkills,
  generatePositionSkills,
  addPositionSkill,
  updatePositionSkill,
  deletePositionSkill,
} from "../services/positionSkillService";
import { getSkills } from "../services/skillService";

import type { Position } from "../types/position";
import type { Skill } from "../types/employee";
import type { PositionSkill, SkillLevel } from "../types/positionSkill";

import { Button } from "../components/ui/button";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

const levelColors: Record<string, { bg: string; color: string }> = {
  Beginner: { bg: "#e0f2fe", color: "#0369a1" },
  Intermediate: { bg: "#fef9c3", color: "#854d0e" },
  Advanced: { bg: "#dcfce7", color: "#166534" },
  Expert: { bg: "#ede8ff", color: "#6c63ff" },
};

const priorityColors = {
  essential: { bg: "#fce7f3", color: "#be185d" },
  optional: { bg: "#f3f4f6", color: "#6b7280" },
};

function PositionDetailsPage() {
  const { id } = useParams();

  const [position, setPosition] = useState<Position | null>(null);
  const [positionSkills, setPositionSkills] = useState<PositionSkill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  // Add skill form
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>("Beginner");
  const [selectedEssential, setSelectedEssential] = useState(true);
  const [addingSkill, setAddingSkill] = useState(false);

  // Inline edit
  const [editingPsId, setEditingPsId] = useState<number | null>(null);
  const [editingLevel, setEditingLevel] = useState<SkillLevel>("Beginner");
  const [editingEssential, setEditingEssential] = useState(true);

  // AI generate
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  async function loadSkills() {
    if (!id) return;
    const skills = await getPositionSkills(Number(id));
    setPositionSkills(skills);
  }

  useEffect(() => {
    if (!id) return;

    Promise.all([
      getPositionById(Number(id)),
      getPositionSkills(Number(id)),
      getSkills(),
    ])
      .then(([pos, skills, allSk]) => {
        setPosition(pos);
        setPositionSkills(skills);
        setAllSkills(allSk);
      })
      .catch((err) => console.error("Failed to load:", err))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleGenerate() {
    if (!id) return;
    try {
      setGenerating(true);
      setGenerateError(null);
      await generatePositionSkills(Number(id));
      await loadSkills();
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail ?? "Failed to generate skills.";
      setGenerateError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function handleAddSkill() {
    if (!id || !selectedSkillId) return;

    try {
      setAddingSkill(true);
      const newSkill = await addPositionSkill(Number(id), {
        skill_id: Number(selectedSkillId),
        required_skill_level: selectedLevel,
        is_essential: selectedEssential,
      });
      setPositionSkills((prev) => [...prev, newSkill]);
      setSelectedSkillId("");
      setSelectedLevel("Beginner");
      setSelectedEssential(true);
      setShowAddSkill(false);
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail ?? "Failed to add skill.";
      alert(msg);
    } finally {
      setAddingSkill(false);
    }
  }

  async function handleUpdateSkill(psId: number) {
    if (!id) return;
    try {
      const updated = await updatePositionSkill(Number(id), psId, {
        required_skill_level: editingLevel,
        is_essential: editingEssential,
      });
      setPositionSkills((prev) =>
        prev.map((ps) => (ps.id === psId ? updated : ps))
      );
      setEditingPsId(null);
    } catch (error) {
      console.error("Failed to update skill:", error);
    }
  }

  async function handleDeleteSkill(psId: number) {
    if (!id) return;
    try {
      await deletePositionSkill(Number(id), psId);
      setPositionSkills((prev) => prev.filter((ps) => ps.id !== psId));
    } catch (error) {
      console.error("Failed to delete skill:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm" style={{ color: "#9ca3af" }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm" style={{ color: "#9ca3af" }}>
          Position not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/positions"
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
        style={{
          background: "#ede8ff",
          color: "#6c63ff",
          border: "1px solid #d4cfff",
        }}
      >
        <ArrowLeft style={{ width: "15px", height: "15px" }} />
        Back to Positions
      </Link>

      {/* Position header card */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white"
              style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)" }}
            >
              <BriefcaseBusiness style={{ width: "28px", height: "28px" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#1a1a2e" }}>
                {position.title}
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>
                Position #{position.id}
              </p>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            {
              icon: Building2,
              label: "Department",
              value: position.department?.name ?? "—",
            },
            {
              icon: BriefcaseBusiness,
              label: "Position ID",
              value: `#${position.id}`,
            },
            {
              icon: Sparkles,
              label: "Required Skills",
              value: `${positionSkills.length} skill${positionSkills.length !== 1 ? "s" : ""}`,
            },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl p-3"
              style={{ background: "#f0f2f8" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  style={{ width: "14px", height: "14px", color: "#6c63ff" }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "#9ca3af" }}
                >
                  {label}
                </span>
              </div>
              <p
                className="truncate text-sm font-semibold"
                style={{ color: "#1a1a2e" }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Position Skills */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        {/* Section header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #e8eaf0" }}
        >
          <div className="flex items-center gap-3">
            <Sparkles
              style={{ width: "18px", height: "18px", color: "#6c63ff" }}
            />
            <h2
              className="text-base font-semibold"
              style={{ color: "#1a1a2e" }}
            >
              Required Skills
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Generate button */}
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                border: "none",
              }}
            >
              <Wand2 style={{ width: "14px", height: "14px" }} />
              {generating ? "Generating..." : "Generate (AI)"}
            </Button>

            {/* Add Skill button */}
            <Button
              type="button"
              onClick={() => setShowAddSkill(!showAddSkill)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #6c63ff, #a78bfa)",
                border: "none",
              }}
            >
              <Plus style={{ width: "14px", height: "14px" }} />
              {showAddSkill ? "Cancel" : "Add Skill"}
            </Button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Generate error */}
          {generateError && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
              }}
            >
              {generateError}
            </div>
          )}

          {/* Add skill form */}
          {showAddSkill && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "#f0f2f8", border: "1px solid #e8eaf0" }}
            >
              <h3
                className="text-sm font-semibold"
                style={{ color: "#1a1a2e" }}
              >
                Add New Skill Requirement
              </h3>
              <div className="flex flex-wrap gap-3">
                {/* Skill select */}
                <div className="flex flex-col gap-1">
                  <label
                    className="text-xs font-medium"
                    style={{ color: "#6b7280" }}
                  >
                    Skill
                  </label>
                  <select
                    value={selectedSkillId}
                    onChange={(e) => setSelectedSkillId(e.target.value)}
                    className="rounded-xl px-3 py-2 text-sm"
                    style={{
                      border: "1px solid #e8eaf0",
                      background: "#ffffff",
                      color: "#1a1a2e",
                      outline: "none",
                    }}
                  >
                    <option value="">Select Skill</option>
                    {allSkills
                      .filter(
                        (s) =>
                          !positionSkills.some((ps) => ps.skill_id === s.id)
                      )
                      .map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Level select */}
                <div className="flex flex-col gap-1">
                  <label
                    className="text-xs font-medium"
                    style={{ color: "#6b7280" }}
                  >
                    Required Level
                  </label>
                  <select
                    value={selectedLevel}
                    onChange={(e) =>
                      setSelectedLevel(e.target.value as SkillLevel)
                    }
                    className="rounded-xl px-3 py-2 text-sm"
                    style={{
                      border: "1px solid #e8eaf0",
                      background: "#ffffff",
                      color: "#1a1a2e",
                      outline: "none",
                    }}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>

                {/* Priority select */}
                <div className="flex flex-col gap-1">
                  <label
                    className="text-xs font-medium"
                    style={{ color: "#6b7280" }}
                  >
                    Priority
                  </label>
                  <select
                    value={selectedEssential ? "essential" : "optional"}
                    onChange={(e) =>
                      setSelectedEssential(e.target.value === "essential")
                    }
                    className="rounded-xl px-3 py-2 text-sm"
                    style={{
                      border: "1px solid #e8eaf0",
                      background: "#ffffff",
                      color: "#1a1a2e",
                      outline: "none",
                    }}
                  >
                    <option value="essential">Essential</option>
                    <option value="optional">Optional</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleAddSkill}
                    disabled={!selectedSkillId || addingSkill}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(135deg, #6c63ff, #a78bfa)",
                      border: "none",
                    }}
                  >
                    {addingSkill ? "Adding..." : "Add Skill"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Skills list */}
          {positionSkills.length === 0 ? (
            <p className="text-sm" style={{ color: "#9ca3af" }}>
              No skills defined yet. Use &quot;Generate (AI)&quot; to
              auto-generate or &quot;Add Skill&quot; to add manually.
            </p>
          ) : (
            <div className="space-y-2">
              {positionSkills.map((ps) => {
                const levelStyle =
                  levelColors[ps.required_skill_level] ??
                  levelColors["Beginner"];
                const priorityStyle = ps.is_essential
                  ? priorityColors.essential
                  : priorityColors.optional;

                return (
                  <div
                    key={ps.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: "#f0f2f8" }}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "#1a1a2e" }}
                      >
                        {ps.skill.name}
                      </p>

                      {editingPsId !== ps.id && (
                        <>
                          <span
                            className="rounded-lg px-2 py-0.5 text-xs font-medium"
                            style={levelStyle}
                          >
                            {ps.required_skill_level}
                          </span>
                          <span
                            className="rounded-lg px-2 py-0.5 text-xs font-medium"
                            style={priorityStyle}
                          >
                            {ps.is_essential ? "Essential" : "Optional"}
                          </span>
                        </>
                      )}
                    </div>

                    {editingPsId === ps.id ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Level */}
                        <select
                          value={editingLevel}
                          onChange={(e) =>
                            setEditingLevel(e.target.value as SkillLevel)
                          }
                          className="rounded-xl px-3 py-1.5 text-sm"
                          style={{
                            border: "1px solid #e8eaf0",
                            background: "#ffffff",
                            color: "#1a1a2e",
                            outline: "none",
                          }}
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Expert">Expert</option>
                        </select>

                        {/* Priority */}
                        <select
                          value={editingEssential ? "essential" : "optional"}
                          onChange={(e) =>
                            setEditingEssential(
                              e.target.value === "essential"
                            )
                          }
                          className="rounded-xl px-3 py-1.5 text-sm"
                          style={{
                            border: "1px solid #e8eaf0",
                            background: "#ffffff",
                            color: "#1a1a2e",
                            outline: "none",
                          }}
                        >
                          <option value="essential">Essential</option>
                          <option value="optional">Optional</option>
                        </select>

                        <Button
                          type="button"
                          onClick={() => handleUpdateSkill(ps.id)}
                          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                          style={{
                            background:
                              "linear-gradient(135deg, #6c63ff, #a78bfa)",
                            border: "none",
                          }}
                        >
                          Save
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingPsId(null)}
                          className="rounded-xl px-3 py-1.5 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPsId(ps.id);
                            setEditingLevel(ps.required_skill_level);
                            setEditingEssential(ps.is_essential);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white"
                          title="Edit skill"
                        >
                          <Pencil
                            style={{
                              width: "13px",
                              height: "13px",
                              color: "#6c63ff",
                            }}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSkill(ps.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                          title="Remove skill"
                        >
                          <Trash2
                            style={{
                              width: "13px",
                              height: "13px",
                              color: "#ef4444",
                            }}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PositionDetailsPage;
