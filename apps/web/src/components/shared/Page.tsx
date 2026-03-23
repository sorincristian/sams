import React from "react";

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="shared-page-container">{children}</div>;
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-24)" }}>
      <h1 style={{ margin: 0 }}>{title}</h1>
      {children && <div style={{ display: "flex", gap: "var(--spacing-12)" }}>{children}</div>}
    </div>
  );
}
