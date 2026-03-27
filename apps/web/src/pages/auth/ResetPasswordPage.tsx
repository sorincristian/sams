import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthPageShell } from "../../components/auth/AuthPageShell";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthBrand } from "../../components/auth/AuthBrand";
import { AuthHeader } from "../../components/auth/AuthHeader";
import { AuthField } from "../../components/auth/AuthField";
import { AuthMessageBanner } from "../../components/auth/AuthMessageBanner";
import { PasswordStrengthRules } from "../../components/auth/PasswordStrengthRules";
import { authService } from "../../services/authService";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [token] = React.useState(() => {
    // TODO: Sunset Plan (Safe to remove after 2026-03-27 18:00 EST)
    // We transitioned from query-param (?token=) to hash-fragment (#token=) to prevent leakage.
    // Because tokens enforce a strict 30-minute expiration limit, all legacy emails will inherently 
    // expire by 18:00 EST today. After that, this fallback hook should be safely removed.
    let t = searchParams.get("token") || "";

    if (!t && window.location.hash.startsWith("#token=")) {
      t = window.location.hash.replace("#token=", "");
      
      // Clear token from URL bar immediately for security
      if (window.history.replaceState) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
    return t;
  });

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Password cannot be blank");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    // Strict requirement validation
    const valid = password.length >= 8 && /[A-Z]/.test(password) && /[^a-zA-Z]/.test(password);
    if (!valid) {
      setError("Please ensure all security constraints are met.");
      return;
    }
    
    if (!token) {
      setError("Missing authorization token. Did you copy the full link?");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      // Immediately redirect to login with a success transfer state
      navigate("/login", { 
        state: { 
          message: "Your password has been successfully reset. You may now sign in." 
        },
        replace: true 
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Token invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthPageShell>
        <AuthCard>
          <AuthBrand />
          <AuthHeader title="Invalid Reset Link" subtitle="Security token parsing failed" />
          <AuthMessageBanner type="error" message="Missing authorization token in URL. Please request a new recovery link." />
          <Link to="/forgot-password" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-center block transition-colors mt-4">
            Request fresh link
          </Link>
        </AuthCard>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthBrand />
        <AuthHeader 
          title="Create new password" 
          subtitle="Secure your operational account credentials" 
        />

        {error && <AuthMessageBanner type="error" message={error} />}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <AuthField 
            label="New Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoFocus
            />

            <PasswordStrengthRules password={password as any} />

            <AuthField 
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />

            <button 
              type="submit" 
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all border outline-none border-transparent mt-4 flex items-center justify-center gap-2"
            >
              {loading ? "Syncing Constraints..." : "Update Password"}
            </button>
          </form>
      </AuthCard>
    </AuthPageShell>
  );
}
