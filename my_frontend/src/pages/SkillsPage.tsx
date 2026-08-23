import { Sparkles } from "lucide-react";

function SkillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1a1a2e" }}>
          Skills
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>
          Manage skill categories and proficiency levels
        </p>
      </div>

      <div
        className="flex flex-col items-center justify-center rounded-2xl py-24"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "#ede8ff" }}
        >
          <Sparkles style={{ width: "28px", height: "28px", color: "#6c63ff" }} />
        </div>
        <p className="mt-4 text-sm font-medium" style={{ color: "#1a1a2e" }}>
          Skills management coming soon
        </p>
        <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>
          You can assign skills to employees from the employee detail page.
        </p>
      </div>
    </div>
  );
}

export default SkillsPage;