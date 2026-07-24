import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { Users, Lock, Mail, User, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

export const SignupPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [validationError, setValidationError] = useState("");
  const [backendError, setBackendError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    setBackendError("");
    setSuccessMsg("");

    // Client-side validation
    if (!username.trim()) {
      setValidationError("Username is required.");
      return;
    }
    if (!email.trim()) {
      setValidationError("Email is required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setValidationError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setValidationError("Password is required.");
      return;
    }
    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/signup", {
        username: username.trim(),
        email: email.trim(),
        password: password,
      });

      setSuccessMsg("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setBackendError(
          typeof err.response.data.detail === "string"
            ? err.response.data.detail
            : JSON.stringify(err.response.data.detail)
        );
      } else {
        setBackendError("Signup failed. Please try again.");
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
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join HR Assist AI platform</p>
        </div>

        {(validationError || backendError) && (
          <div className="auth-error-alert">
            <AlertCircle size={18} />
            <span>{validationError || backendError}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-success-alert">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username
            </label>
            <div className="input-icon-wrapper">
              <User size={18} className="input-icon" />
              <input
                id="username"
                type="text"
                className="form-control with-icon"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <div className="input-icon-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                className="form-control with-icon"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="Create a password"
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

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="input-icon-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="form-control with-icon with-end-icon"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="input-end-button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating Account...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
