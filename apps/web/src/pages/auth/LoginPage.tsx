import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthPageShell } from "../../components/auth/AuthPageShell";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthBrand } from "../../components/auth/AuthBrand";
import { AuthHeader } from "../../components/auth/AuthHeader";
import { AuthField } from "../../components/auth/AuthField";
import { AuthMessageBanner } from "../../components/auth/AuthMessageBanner";
import { SessionStatusBanner } from "../../components/auth/SessionStatusBanner";
import { useAuthContext } from "../../context/AuthProvider";
import { authService } from "../../services/authService";
import { authRedirect } from "../../utils/authRedirect";

export function LoginPage() {
  const { login } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const explicitStatus = location.state?.status as "expired" | "logout" | "denied" | null;
  const explicitMessage = location.state?.message as string | undefined;

  // Immediately destroy transient history state so banners do not persist on explicit F5 reloads
  React.useEffect(() => {
    if (explicitStatus || explicitMessage) {
      window.history.replaceState({}, document.title);
    }
  }, [explicitStatus, explicitMessage]);

  const handleDevBypass = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await authService.login('dev@local', 'bypass');
      login(data.token, data.user);
      const destination = authRedirect.getSavedDestination() || "/dashboard";
      authRedirect.clearSavedDestination();
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError("Dev bypass login failed");
      setLoading(false);
    }
  };

  // Optional auto-login mode
  React.useEffect(() => {
    if (import.meta.env.VITE_DEV_BYPASS === 'true') {
      // Auto-login disabled by default to show the UI. Uncomment the line below to enable auto-login.
      // handleDevBypass();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please provide both email and password");
      return;
    }

    setLoading(true);
    try {
      const data = await authService.login(email, password);
      // login handles setting the token in the provider
      login(data.token, data.user);
      
      const destination = authRedirect.getSavedDestination() || "/";
      authRedirect.clearSavedDestination();
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid operator credentials");
      // Intentionally preserve email state to prevent frustrating re-types
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthBrand />
        <AuthHeader title="Sign in" subtitle="Access your operations workspace" />

        <SessionStatusBanner status={explicitStatus} />
        {explicitMessage && !error && <AuthMessageBanner type="success" message={explicitMessage} />}
        {error && <AuthMessageBanner type="error" message={error} />}

        <form onSubmit={handleSubmit} className="flex flex-col w-full relative z-50 pointer-events-auto">
          <AuthField 
            label="Email Address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="operator@sams-platform.com"
            disabled={loading}
            autoComplete="email"
            autoFocus
          />

          <AuthField 
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            autoComplete="current-password"
          />

          <div className="flex justify-end w-full mb-6 -mt-2 relative z-10 pointer-events-auto">
            <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors select-none outline-none">
              Forgot password?
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={loading || !email || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all border outline-none border-transparent flex items-center justify-center gap-2 pointer-events-auto cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Authenticating...
              </>
            ) : "Sign in"}
          </button>

          {import.meta.env.VITE_DEV_BYPASS === 'true' && (
            <div className="mt-4 flex justify-center opacity-30 hover:opacity-100 transition-opacity">
              <button 
                type="button"
                onClick={handleDevBypass}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 outline-none cursor-pointer"
              >
                Dev Login
              </button>
            </div>
          )}
        </form>
      </AuthCard>
    </AuthPageShell>
  );
}
