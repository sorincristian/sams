import React from "react";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div style={{ padding: "var(--spacing-32)", textAlign: "center", font: "var(--font-body)", color: "var(--text-secondary)" }}>
      {message}
    </div>
  );
}

export function ErrorState({ message = "An error occurred", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div style={{ padding: "var(--spacing-32)", textAlign: "center", font: "var(--font-body)", color: "var(--color-danger)" }}>
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} style={{ marginTop: "var(--spacing-16)", appearance: "none", background: "var(--bg-surface)", border: "1px solid var(--border-color)", padding: "var(--spacing-8) var(--spacing-16)", borderRadius: "var(--card-radius)", cursor: "pointer", color: "var(--text-primary)" }}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message = "No data available", icon }: { message?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ padding: "var(--spacing-32)", textAlign: "center", font: "var(--font-body)", color: "var(--text-muted)" }}>
      {icon && <div style={{ marginBottom: "var(--spacing-16)" }}>{icon}</div>}
      <p>{message}</p>
    </div>
  );
}
