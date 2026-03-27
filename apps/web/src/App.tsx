import React from "react";
import { Route, Routes } from "react-router-dom";
import { AuthProvider, useAuthContext } from "./context/AuthProvider";
import { ProtectedRouteGate } from "./routes/ProtectedRouteGate";
import { LoginPage } from "./pages/auth/LoginPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { SessionExpiredPage } from "./pages/auth/SessionExpiredPage";
import { AccessDeniedPage } from "./pages/auth/AccessDeniedPage";
import { AcceptInvitePage } from "./pages/auth/AcceptInvitePage";
import { Shell } from "./layouts/Shell";
import { MobileDiagramViewerPage } from "./modules/seat-inserts/components/mobile/MobileDiagramViewerPage";

function AppRoutes() {
  const { user, logout } = useAuthContext();
  
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/session-expired" element={<SessionExpiredPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      
      <Route element={<ProtectedRouteGate />}>
        <Route path="/mobile/diagram/:attachmentId" element={<MobileDiagramViewerPage />} />
        <Route path="*" element={<Shell user={user} onLogout={() => logout(false)} />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
