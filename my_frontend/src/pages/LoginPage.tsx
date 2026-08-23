import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "../services/authService";
import { Sparkles } from "lucide-react";

function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const data = await login({
        login: username,
        password: password,
      });

      console.log("Login successful:", data);

      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setError("Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "#f0f2f8" }}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 8px 40px rgba(108,99,255,0.12)",
        }}
      >
        {/* Header */}
        <div
          className="flex flex-col items-center gap-3 px-8 py-8"
          style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)" }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">HR Skill Gap</h1>
            <p className="text-sm text-white/70">Analytics Platform</p>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          <h2 className="mb-6 text-lg font-semibold" style={{ color: "#1a1a2e" }}>
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "#6b7280" }}>
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                style={{
                  border: "1px solid #e8eaf0",
                  background: "#f0f2f8",
                  color: "#1a1a2e",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6c63ff")}
                onBlur={(e) => (e.target.style.borderColor = "#e8eaf0")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "#6b7280" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                style={{
                  border: "1px solid #e8eaf0",
                  background: "#f0f2f8",
                  color: "#1a1a2e",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6c63ff")}
                onBlur={(e) => (e.target.style.borderColor = "#e8eaf0")}
              />
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-2.5 text-sm"
                style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;