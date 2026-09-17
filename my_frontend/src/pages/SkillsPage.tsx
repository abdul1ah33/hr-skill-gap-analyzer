import { Sparkles } from "lucide-react";

function SkillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Skills
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Manage skill categories and proficiency levels
        </p>
      </div>

      <div
        className="flex flex-col items-center justify-center rounded-2xl py-24"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "var(--accent)" }}
        >
          <Sparkles style={{ width: "28px", height: "28px", color: "var(--primary)" }} />
        </div>
        <p className="mt-4 text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Skills management coming soon
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
          You can assign skills to employees from the employee detail page.
        </p>
      </div>
    </div>
  );
}

export default SkillsPage;