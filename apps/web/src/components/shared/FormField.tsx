import React from "react";

export function FormField({ 
  label, 
  error, 
  children, 
  required 
}: { 
  label: React.ReactNode; 
  error?: string; 
  children: React.ReactNode; 
  required?: boolean 
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)", marginBottom: "var(--spacing-16)" }}>
      <label style={{ fontSize: "var(--font-label)", fontWeight: 600, color: "var(--text-primary)" }}>
        {label} {required && <span style={{ color: "var(--color-danger)" }}>*</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: "12px", color: "var(--color-danger)", marginTop: "4px" }}>{error}</div>}
    </div>
  );
}
