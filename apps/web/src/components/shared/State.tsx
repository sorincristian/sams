import React from "react";

export function EmptyState({ message, subtext, action }: { message: React.ReactNode; subtext?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "var(--spacing-32)", color: "var(--text-muted)" }}>
      <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--spacing-8)", fontSize: "16px" }}>{message}</div>
      {subtext && <div style={{ marginBottom: action ? "var(--spacing-16)" : 0 }}>{subtext}</div>}
      {action}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: React.ReactNode; retry?: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "var(--spacing-32)", color: "var(--color-danger)" }}>
      <div style={{ fontWeight: 600, marginBottom: retry ? "var(--spacing-16)" : 0, fontSize: "16px" }}>{message}</div>
      {retry && <button className="shared-button secondary" onClick={retry}>Retry</button>}
    </div>
  );
}

export function LoadingState({ message = "Loading..." }: { message?: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "var(--spacing-32)", color: "var(--text-muted)", fontSize: "16px" }}>
      {message}
    </div>
  );
}
