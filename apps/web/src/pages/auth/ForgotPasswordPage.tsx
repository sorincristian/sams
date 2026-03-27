import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthPageShell } from "../../components/auth/AuthPageShell";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthBrand } from "../../components/auth/AuthBrand";
import { AuthHeader } from "../../components/auth/AuthHeader";
import { AuthField } from "../../components/auth/AuthField";
import { AuthMessageBanner } from "../../components/auth/AuthMessageBanner";
import { authService } from "../../services/authService";

export function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthBrand />
        <AuthHeader 
          title={submitted ? "Check your inbox" : "Reset your password"} 
          subtitle={submitted ? "We have dispatched a secure recovery link." : "Enter your email to receive a recovery link"} 
        />

        {error && <AuthMessageBanner type="error" message={error} />}

        {submitted ? (
          <div className="flex flex-col gap-6">
            <AuthMessageBanner type="success" message={`A password reset link has been sent to ${email} closely tracking active operator credentials.`} />
            <Link to="/login" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl shadow-sm transition-all text-center">
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <AuthField 
              label="Operator Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. sam@sams-platform.com"
              autoComplete="email"
              disabled={loading}
              autoFocus
            />

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all border outline-none border-transparent mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing...
                </>
              ) : (
                "Send reset link"
              )}
            </button>

            <Link to="/login" className="text-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors mt-4">
              ← Back to sign in
            </Link>
          </form>
        )}
      </AuthCard>
    </AuthPageShell>
  );
}
