import React, { useState, useEffect } from "react";
import type { Skill } from "../types/employee";
import { Award, Edit2, Trash2, Layers, Search, Plus, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { motion } from "framer-motion";
import {
  getSkillAliases,
  createSkillAlias,
  deleteSkillAlias,
  type SkillAlias,
} from "../services/skillAliasService";

interface SkillsPageProps {
  skills: Skill[];
  addSkill: (skill: Partial<Skill>) => Promise<void>;
  editSkill: (id: number, skill: Partial<Skill>) => Promise<void>;
  deleteSkill: (id: number) => Promise<void>;
}

export const SkillsPage: React.FC<SkillsPageProps> = ({
  skills,
  addSkill,
  editSkill,
  deleteSkill,
}) => {
  const [activeTab, setActiveTab] = useState<"canonical" | "aliases">("canonical");

  // Form states for Canonical Skill
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technical");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // Alias states
  const [aliases, setAliases] = useState<SkillAlias[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [newAliasText, setNewAliasText] = useState("");
  const [aliasSearch, setAliasSearch] = useState("");
  // Load Skill Aliases from backend API
  const fetchAliases = async () => {
    try {
      const data = await getSkillAliases();
      setAliases(data || []);
    } catch (err) {
      console.error("Error fetching skill aliases", err);
    }
  };

  useEffect(() => {
    fetchAliases();
  }, []);

  useEffect(() => {
    if (skills.length > 0 && !selectedSkillId) {
      setSelectedSkillId(skills[0].id || null);
    }
  }, [skills, selectedSkillId]);

  const handleSubmitSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingId !== null) {
        await editSkill(editingId, { name, category, description });
        setEditingId(null);
      } else {
        await addSkill({ name, category, description });
      }
      setName("");
      setDescription("");
      setCategory("Technical");
    } catch (err) {
      console.error("Error saving skill", err);
    }
  };

  const handleEditClick = (skill: Skill) => {
    if (skill.id) {
      setEditingId(skill.id);
      setName(skill.name);
      setCategory(skill.category || "Technical");
      setDescription(skill.description || "");
    }
  };

  const handleDeleteClick = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this skill definition?")) {
      await deleteSkill(id);
    }
  };

  const handleCreateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId || !newAliasText.trim()) return;

    try {
      await createSkillAlias({ skill_id: selectedSkillId, alias: newAliasText.trim() });
      setNewAliasText("");
      await fetchAliases();
    } catch (err) {
      console.error("Error creating skill alias", err);
      alert("Could not add alias. Alias might already exist.");
    }
  };

  const handleDeleteAlias = async (aliasId: number) => {
    try {
      await deleteSkillAlias(aliasId);
      await fetchAliases();
    } catch (err) {
      console.error("Error deleting alias", err);
    }
  };

  // Group aliases by skill_id
  const selectedSkill = skills.find((s) => s.id === selectedSkillId);
  const selectedSkillAliases = aliases.filter((a) => a.skill_id === selectedSkillId);

  const filteredSkillsForAliases = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(aliasSearch.toLowerCase()) ||
      aliases.some(
        (a) => a.skill_id === s.id && a.alias.toLowerCase().includes(aliasSearch.toLowerCase())
      )
  );

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Skill Taxonomy & Alias Graph
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Canonical skill definitions and bi-directional alias matching engine.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
          <button
            onClick={() => setActiveTab("canonical")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "canonical"
                ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Canonical Skills</span>
          </button>
          <button
            onClick={() => setActiveTab("aliases")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "aliases"
                ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Skill Aliases</span>
            <Badge variant="primary" className="text-[10px] py-0 px-1.5">
              {aliases.length}
            </Badge>
          </button>
        </div>
      </div>

      {/* Tab 1: Canonical Skills */}
      {activeTab === "canonical" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 h-fit">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                {editingId !== null ? "Edit Canonical Skill" : "Create Canonical Skill"}
              </CardTitle>
            </CardHeader>

            <form onSubmit={handleSubmitSkill} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Skill Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Computer Programming, Data Analysis"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Technical">Technical</option>
                  <option value="HR & Recruiting">HR & Recruiting</option>
                  <option value="Management & Soft Skills">Management & Soft Skills</option>
                  <option value="Engineering & Design">Engineering & Design</option>
                  <option value="Marketing & Sales">Marketing & Sales</option>
                  <option value="Finance & Accounting">Finance & Accounting</option>
                  <option value="Healthcare & Nursing">Healthcare & Nursing</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Standard evaluation criteria..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button variant="gradient" type="submit" className="flex-1">
                  {editingId !== null ? "Save Changes" : "Create Skill"}
                </Button>
                {editingId !== null && (
                  <Button variant="outline" type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {/* Table */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4 font-semibold">Skill Name</th>
                      <th className="py-3.5 px-4 font-semibold">Category</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {skills.map((skill) => (
                      <tr key={skill.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold">
                              <Award className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100">{skill.name}</p>
                              <p className="text-xs text-slate-400 line-clamp-1">{skill.description || "No description"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="secondary">{skill.category || "Technical"}</Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(skill)} title="Edit">
                              <Edit2 className="w-4 h-4 text-slate-400 hover:text-purple-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => skill.id && handleDeleteClick(skill.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Skill Aliases Visual Graph UI */}
      {activeTab === "aliases" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Skill Selector */}
          <Card className="p-4 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={aliasSearch}
                onChange={(e) => setAliasSearch(e.target.value)}
                placeholder="Search canonical skills or aliases..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {filteredSkillsForAliases.map((skill) => {
                const count = aliases.filter((a) => a.skill_id === skill.id).length;
                const isSelected = selectedSkillId === skill.id;

                return (
                  <button
                    key={skill.id}
                    onClick={() => setSelectedSkillId(skill.id || null)}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Award className={`w-4 h-4 ${isSelected ? "text-white" : "text-purple-500"}`} />
                      <span className="truncate">{skill.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isSelected ? "bg-purple-700 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {count} Aliases
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Right: Visual Alias Graph Card */}
          <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
            {selectedSkill ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Canonical Skill
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                      <Award className="w-5 h-5 text-purple-600" />
                      {selectedSkill.name}
                    </h2>
                  </div>
                  <Badge variant="primary" className="gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Bidirectional Resolution
                  </Badge>
                </div>

                {/* Add Alias Form */}
                <form onSubmit={handleCreateAlias} className="flex gap-2">
                  <input
                    type="text"
                    value={newAliasText}
                    onChange={(e) => setNewAliasText(e.target.value)}
                    placeholder={`Add alias for ${selectedSkill.name} (e.g. Python, Git, CPR)...`}
                    className="flex-1 px-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <Button variant="gradient" type="submit" className="gap-1 text-xs">
                    <Plus className="w-4 h-4" /> Add Alias
                  </Button>
                </form>

                {/* Visual Tree Graph */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-900 dark:to-purple-950/20 border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-gradient-purple text-white font-bold text-sm shadow-md">
                      {selectedSkill.name}
                    </div>
                    <ArrowRight className="w-5 h-5 text-purple-500 animate-pulse" />
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      Equivalent Target Aliases ({selectedSkillAliases.length})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {selectedSkillAliases.map((aliasObj) => (
                      <motion.div
                        key={aliasObj.id}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800/60 shadow-xs hover:shadow-md transition-all group"
                      >
                        <span className="font-bold text-xs text-purple-900 dark:text-purple-200">
                          {aliasObj.alias}
                        </span>
                        <button
                          onClick={() => handleDeleteAlias(aliasObj.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remove alias"
                        >
                          &times;
                        </button>
                      </motion.div>
                    ))}

                    {selectedSkillAliases.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-4">
                        No aliases mapped for this skill yet. Type above to add one!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-sm text-slate-400">
                Select a skill from the list to view and manage its alias graph.
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default SkillsPage;
