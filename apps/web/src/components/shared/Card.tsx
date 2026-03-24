import React from "react";

export function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`shared-card ${className}`} style={style}>{children}</div>;
}

export function SectionCard({ title, children, action }: { title: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card className="section-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-16)" }}>
        <h2 style={{ margin: 0, fontSize: "var(--font-section-title)" }}>{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function InfoCard({ label, value, dark = false, style }: { label: React.ReactNode; value: React.ReactNode; dark?: boolean; style?: React.CSSProperties }) {
  return (
    <Card className={`shared-info-card ${dark ? "dark" : ""}`} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)", ...style }}>
      <div className={dark ? "" : "text-muted"} style={{ fontSize: "var(--font-label)" }}>{label}</div>
      <div className="font-card-title">{value}</div>
    </Card>
  );
}

export function StatCard({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <Card style={{ padding: "var(--spacing-24)" }}>
      <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "var(--spacing-4)" }}>{value}</div>
      <div className="text-muted">{label}</div>
    </Card>
  );
}
