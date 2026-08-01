import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  Building2,
  Briefcase,
  Award,
  Sparkles,
  Layers,
  UserPlus,
  BarChart3,
  X,
  Command,
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  category: "Pages" | "Quick Actions" | "AI Features";
  path?: string;
  action?: () => void;
  icon: React.ElementType;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const commands: CommandItem[] = [
    { id: "dash", title: "Executive Dashboard", category: "Pages", path: "/dashboard", icon: BarChart3 },
    { id: "emp", title: "Employee Directory", category: "Pages", path: "/employees", icon: Users },
    { id: "dept", title: "Departments", category: "Pages", path: "/departments", icon: Building2 },
    { id: "pos", title: "Positions & Roles", category: "Pages", path: "/positions", icon: Briefcase },
    { id: "skills", title: "Skills Catalog", category: "Pages", path: "/skills", icon: Award },
    { id: "aliases", title: "Skill Alias Manager", category: "Pages", path: "/skill-aliases", icon: Layers },
    { id: "assess", title: "Run AI Skill Gap Assessment", category: "AI Features", path: "/assessment", icon: Sparkles },
    { id: "rec", title: "Recruitment & Resume Parser", category: "Pages", path: "/recruitment", icon: UserPlus },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: CommandItem) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.action) {
      item.action();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header Search Input */}
          <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employees, skills, positions, or type a command..."
              className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              autoFocus
            />
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {filteredCommands.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No matching results found for "{query}".
              </div>
            ) : (
              filteredCommands.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 group-hover:text-purple-600 dark:group-hover:text-purple-300">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-[11px] text-slate-400">{item.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <span>Jump to</span>
                      <Command className="w-3 h-3" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            <span>Use ↑ ↓ to navigate</span>
            <span>ESC to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
