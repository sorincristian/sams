import React from "react";
import { Link } from "react-router-dom";
import { AuthPageShell } from "../../components/auth/AuthPageShell";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthBrand } from "../../components/auth/AuthBrand";
import { AuthHeader } from "../../components/auth/AuthHeader";
import { AuthMessageBanner } from "../../components/auth/AuthMessageBanner";
import { useAuthContext } from "../../context/AuthProvider";

export function SessionExpiredPage() {
  const { logout } = useAuthContext();

  React.useEffect(() => {
    logout(true); // force explicitly expired state
  }, [logout]);

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthBrand />
        <AuthHeader title="Session Expired" subtitle="Platform security timeout activated" />
        <AuthMessageBanner type="error" message="Your active window has exceeded operational security constraints. You must reauthorize to continue." />
        <Link to="/login" replace className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-center shadow-md block transition-colors mt-4">
          Return to Sign In
        </Link>
      </AuthCard>
    </AuthPageShell>
  );
}
