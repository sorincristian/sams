import React from "react";

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", marginBottom: "var(--spacing-4)" }}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: "var(--spacing-8) var(--spacing-16)",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--color-primary)" : "var(--text-secondary)",
              borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              width: "auto",
              borderRadius: 0,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
