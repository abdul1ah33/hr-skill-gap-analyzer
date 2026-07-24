import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, decodeJwt } from "../context/AuthContext";
import api from "../api/axios";
import { Users, Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export const LoginPage: React.FC = () => {
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [validationError, setValidationError] = useState("");
  const [backendError, setBackendError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    setBackendError("");

    // Client-side validation
    if (!loginInput.trim()) {
      setValidationError("Username or Email is required.");
      return;
    }
    if (!password) {
      setValidationError("Password is required.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        login: loginInput.trim(),
        password: password,
      });

      const { access_token } = response.data;
      if (access_token) {
        login(access_token);
        const decoded = decodeJwt(access_token);
        const userRole = decoded?.role;

        if (userRole === "HR") {
          navigate("/dashboard");
        } else {
          navigate("/employee/profile");
        }
      } else {
        setBackendError("Invalid response format from server.");
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setBackendError(
          typeof err.response.data.detail === "string"
            ? err.response.data.detail
            : JSON.stringify(err.response.data.detail)
        );
      } else {
        setBackendError("Login failed. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Users size={36} className="gradient-icon" />
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Log in to your HR Assist AI account</p>
        </div>

        {(validationError || backendError) && (
          <div className="auth-error-alert">
            <AlertCircle size={18} />
            <span>{validationError || backendError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login">
              Username or Email
            </label>
            <div className="input-icon-wrapper">
              <User size={18} className="input-icon" />
              <input
                id="login"
                type="text"
                className="form-control with-icon"
                placeholder="Enter username or email"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="input-icon-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-control with-icon with-end-icon"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="input-end-button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="auth-row-remember">
            <label className="remember-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="custom-checkbox"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Logging in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{" "}
          <Link to="/signup" className="auth-link">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
