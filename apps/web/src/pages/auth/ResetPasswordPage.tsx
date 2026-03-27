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
  const [searchParams] = useSearchParams();
  let token = searchParams.get("token") || "";

  if (!token && window.location.hash.startsWith("#token=")) {
    token = window.location.hash.replace("#token=", "");
  }

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
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
      setSuccess(true);
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
          title={success ? "System Resecured" : "Create new password"} 
          subtitle={success ? "Your operational credentials have been updated." : "Secure your operational account credentials"} 
        />

        {error && <AuthMessageBanner type="error" message={error} />}

        {success ? (
           <div className="flex flex-col gap-6">
             <AuthMessageBanner type="success" message="Your password has been successfully reset. You may now access the workspace." />
             <Link to="/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-center shadow-md block transition-colors mt-2">
               Sign in to SAMS
             </Link>
           </div>
        ) : (
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
        )}
      </AuthCard>
    </AuthPageShell>
  );
}
