import React from "react";
import { AuthMessageBanner } from "./AuthMessageBanner";

interface SessionStatusBannerProps {
  status: "expired" | "logout" | "denied" | null;
}

export function SessionStatusBanner({ status }: SessionStatusBannerProps) {
  if (!status) return null;

  if (status === "expired") {
    return <AuthMessageBanner type="error" message="Your session has expired. Please sign in again to continue." />;
  }
  if (status === "logout") {
    return <AuthMessageBanner type="success" message="You have been safely signed out of your workspace." />;
  }
  if (status === "denied") {
    return <AuthMessageBanner type="error" message="Access denied. You lack permissions to view that module." />;
  }

  return null;
}
