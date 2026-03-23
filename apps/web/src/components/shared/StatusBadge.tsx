import React from "react";

type Variant = "success" | "warning" | "danger" | "neutral";

export function StatusBadge({ status, variant = "neutral" }: { status: React.ReactNode; variant?: Variant }) {
  return <span className={`shared-badge ${variant}`}>{status}</span>;
}
