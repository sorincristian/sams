import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthProvider";
import { authRedirect } from "../utils/authRedirect";
import { AuthBootPage } from "../pages/auth/AuthBootPage";

export function ProtectedRouteGate() {
  const { status, user } = useAuthContext();
  const location = useLocation();

  React.useEffect(() => {
    if (status === "unauthenticated" || status === "expired") {
      authRedirect.saveIntendedDestination(location.pathname + location.search);
    }
  }, [status, location]);

  if (status === "idle" || status === "loading") {
    return <AuthBootPage />;
  }

  if (status === "unauthenticated" || status === "expired") {
    return <Navigate to="/login" replace state={{ status }} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
