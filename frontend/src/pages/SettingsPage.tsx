import React from "react";
import { Settings, Moon, Sun } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { useTheme } from "../context/ThemeContext";

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          System & Platform Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage system preferences, AI Skill Alias engine parameters, and security configurations.
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Appearance Theme</h3>
              <p className="text-xs text-slate-500">Switch between light and dark mode interfaces.</p>
            </div>
            <Button variant="outline" onClick={toggleTheme} className="gap-2 text-xs">
              {theme === "dark" ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
              <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">AI Skill Alias Matching Engine</h3>
              <p className="text-xs text-slate-500">Bidirectional canonical skill alias resolution enabled.</p>
            </div>
            <Badge variant="success">Active (193 Aliases)</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
