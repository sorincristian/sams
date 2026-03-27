import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthPageShell } from "../../components/auth/AuthPageShell";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthBrand } from "../../components/auth/AuthBrand";
import { AuthHeader } from "../../components/auth/AuthHeader";
import { AuthMessageBanner } from "../../components/auth/AuthMessageBanner";

export function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthBrand />
        <AuthHeader title="Access Denied" subtitle="Strict Authorization Bound Reached" />
        <AuthMessageBanner type="error" message="403 Forbidden: Your operator profile lacks sufficient role hierarchy to invoke the requested application module." />
        
        <div className="flex flex-col gap-3 mt-4">
          <button onClick={() => navigate(-1)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-center shadow-sm block transition-colors border-none outline-none cursor-pointer">
            Go Back
          </button>
          <Link to="/" className="w-full bg-transparent hover:bg-slate-50 text-slate-500 font-bold py-3 px-4 rounded-xl text-center transition-colors">
            Return to Operations Hub
          </Link>
        </div>
      </AuthCard>
    </AuthPageShell>
  );
}
