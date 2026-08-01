import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Sparkles,
  ChevronRight,
  LogOut,
  User,
  Shield,
  Command,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { CommandPalette } from "./CommandPalette";

export const Topbar: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Generate dynamic breadcrumb segments
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.length > 0
    ? pathSegments.map((segment, index) => {
        const url = `/${pathSegments.slice(0, index + 1).join("/")}`;
        const name = segment.charAt(0).toUpperCase() + segment.slice(1).replace("-", " ");
        return { name, url };
      })
    : [{ name: "Dashboard", url: "/dashboard" }];

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        {/* Left: Dynamic Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span
            onClick={() => navigate("/dashboard")}
            className="hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer font-medium"
          >
            HR Pulse
          </span>
          {breadcrumbs.map((bc, idx) => (
            <React.Fragment key={bc.url}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
              <span
                onClick={() => navigate(bc.url)}
                className={`cursor-pointer transition-colors ${
                  idx === breadcrumbs.length - 1
                    ? "font-semibold text-slate-900 dark:text-slate-100"
                    : "hover:text-purple-600 dark:hover:text-purple-400"
                }`}
              >
                {bc.name}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Center: Global Search Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all w-64 md:w-80 justify-between group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
            <span>Search employees, skills, positions...</span>
          </div>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Quick AI Assessment Launch Button */}
          <button
            onClick={() => navigate("/assessment")}
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-purple text-white text-xs font-semibold shadow-md shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            <span>AI Assessment</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Notifications</h4>
                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full">3 New</span>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/30">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">AI Assessment Completed</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Skill gap report for Sarah Jenkins is ready.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">New Candidate Uploaded</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Resume parsed: Senior DevOps Engineer.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-purple flex items-center justify-center text-white font-bold text-xs shadow-md">
                {user?.name ? user.name.substring(0, 2).toUpperCase() : "HR"}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user?.name || "HR Manager"}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || "admin@company.com"}</p>
                </div>
                <div className="py-1 space-y-0.5 text-xs font-medium">
                  <button
                    onClick={() => navigate("/settings")}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Profile Settings</span>
                  </button>
                  <button
                    onClick={() => navigate("/settings")}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span>Role & Permissions</span>
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </>
  );
};
