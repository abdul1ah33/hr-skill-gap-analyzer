import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Award,
  Sparkles,
  UserPlus,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Layers,
  Bot,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../utils/cn";

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "Employees", path: "/employees", icon: Users },
      { name: "Departments", path: "/departments", icon: Building2 },
      { name: "Positions", path: "/positions", icon: Briefcase },
    ],
  },
  {
    title: "SKILLS & AI",
    items: [
      { name: "Skills Catalog", path: "/skills", icon: Award },
      { name: "Skill Aliases", path: "/skill-aliases", icon: Layers, badge: "NEW" },
      { name: "AI Assessment", path: "/assessment", icon: Sparkles, badge: "AI" },
    ],
  },
  {
    title: "TALENT & INSIGHTS",
    items: [
      { name: "Recruitment", path: "/recruitment", icon: UserPlus },
      { name: "Analytics", path: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { name: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-screen border-r border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 z-30 select-none shadow-xl"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-purple text-white shadow-lg shadow-purple-500/30 flex-shrink-0">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="whitespace-nowrap"
              >
                <h1 className="font-bold text-lg leading-tight text-white tracking-wide">
                  HR Pulse <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">AI</span>
                </h1>
                <p className="text-xs text-slate-400">Enterprise HR Suite</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path));

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive: linkActive }) =>
                    cn(
                      "relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group",
                      linkActive || isActive
                        ? "bg-purple-600/20 text-purple-300 font-semibold shadow-inner border border-purple-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    )
                  }
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", isActive ? "text-purple-400" : "text-slate-400 group-hover:text-slate-200")} />
                  
                  {!collapsed && (
                    <span className="truncate flex-1">{item.name}</span>
                  )}

                  {!collapsed && item.badge && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      item.badge === "AI" 
                        ? "bg-gradient-purple text-white shadow-sm shadow-purple-500/40" 
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    )}>
                      {item.badge}
                    </span>
                  )}

                  {/* Active Bar Indicator */}
                  {(isActive) && (
                    <motion.div
                      layoutId="sidebarActiveIndicator"
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-purple-500"
                    />
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer / User Profile & Theme Toggle */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50 space-y-2">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            {!collapsed && <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>}
          </div>
          {!collapsed && (
            <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
              {theme}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-purple flex items-center justify-center text-white font-bold text-xs shadow">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : "HR"}
          </div>
          {!collapsed && (
            <div className="truncate flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || "HR Admin"}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.role || "HR Manager"}</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
};
