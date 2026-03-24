import React from "react";

export function FormField({ label, error, children, required, style }: { label: React.ReactNode; error?: string; children: React.ReactNode; required?: boolean; style?: React.CSSProperties }) {
  return (
    <div className="shared-form-field" style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-8)", marginBottom: "var(--spacing-16)", ...style }}>
      <label style={{ font: "var(--font-label)", fontWeight: 500, color: "var(--text-primary)" }}>
        {label} {required && <span style={{ color: "var(--color-danger)" }}>*</span>}
      </label>
      {children}
      {error && <span style={{ color: "var(--color-danger)", font: "var(--font-label)" }}>{error}</span>}
    </div>
  );
}
