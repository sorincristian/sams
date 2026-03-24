import React from "react";

type Section = "about" | "help" | "settings";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "about", label: "About" },
  { id: "help", label: "Help" },
  { id: "settings", label: "Settings" },
];

export function HelpPage() {
  const [active, setActive] = React.useState<Section>("about");

  const tabStyle = (id: Section): React.CSSProperties => ({
    padding: "8px 18px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: active === id ? 700 : 400,
    color: active === id ? "#f9fafb" : "#9ca3af",
    borderBottom: active === id ? "2px solid #2563eb" : "2px solid transparent",
    background: "none",
    width: "auto",
    borderRadius: 0,
  });

  return (
    <div className="grid" style={{ gap: 20 }}>
      <h1>Help &amp; Info</h1>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #374151", marginBottom: 4 }}>
        {SECTIONS.map(({ id, label }) => (
          <button key={id} style={tabStyle(id)} onClick={() => setActive(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* About */}
      {active === "about" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                <h2 style={{ margin: 0 }}>SAMS</h2>
                <span className="muted" style={{ fontSize: "0.85rem" }}>Seat &amp; Asset Management System</span>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#1e3a5f", borderRadius: 6, padding: "4px 12px", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, color: "#60a5fa", fontSize: "0.9rem" }}>SIMS</span>
                <span style={{ color: "#93c5fd", fontSize: "0.82rem" }}>Seat Inserts Inventory Manager</span>
              </div>
              <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
                SIMS is the inventory management module within the SAMS platform. It tracks seat insert stock levels across TTC garages, manages part issuance to work orders, and provides a full audit ledger of all inventory movements.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { label: "Platform", value: "SAMS" },
              { label: "Module", value: "SIMS — Seat Inserts Inventory Manager" },
              { label: "Operator", value: "TTC (Toronto Transit Commission)" },
              { label: "Version", value: "1.0.0 — Phase 1" },
              { label: "Environment", value: "Production (Render)" },
              { label: "Stack", value: "Node.js · Prisma · React · PostgreSQL" },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: "10px 14px", background: "#111827", borderRadius: 6 }}>
                <div className="muted" style={{ fontSize: "0.75rem", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: "0.9rem" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help */}
      {active === "help" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <h3 style={{ margin: 0 }}>Quick Reference</h3>

          {[
            {
              title: "Inventory",
              items: [
                "View all seat insert stock levels by garage and part number.",
                "Use the search bar to find a part by number or description.",
                "Toggle 'Low stock only' to see parts below minimum threshold.",
                "Use Issue to consume parts against a work order.",
                "Use Receive to add stock from a vendor delivery.",
                "Use Adjust to correct quantities for cycle counts or damage.",
              ],
            },
            {
              title: "Ledger",
              items: [
                "View a full audit trail of all inventory transactions.",
                "Filter by transaction type, garage, date range, or free text search.",
                "RETURN transactions are auto-created when a work order is cancelled.",
              ],
            },
            {
              title: "Catalog",
              items: [
                "Manage the master list of seat insert types.",
                "Set Min Stock Level and Reorder Point per part.",
                "Mark parts Inactive to hide them from issue/receive workflows.",
              ],
            },
            {
              title: "Work Orders",
              items: [
                "Create work orders linked to a bus.",
                "Track lifecycle: OPEN → IN_PROGRESS → WAITING_PARTS → COMPLETED.",
                "Issue parts directly from the Work Order Detail page.",
                "Cancelling a WO automatically releases all issued parts back to stock.",
              ],
            },
          ].map(({ title, items }) => (
            <div key={title}>
              <h4 style={{ marginBottom: 8, color: "#60a5fa" }}>{title}</h4>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                {items.map((item) => (
                  <li key={item} className="muted" style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      {active === "settings" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ margin: 0 }}>Settings</h3>
          <p className="muted" style={{ margin: 0 }}>
            User-level and system settings will be available here in a future release.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Theme", value: "Dark (system default)", disabled: true },
              { label: "Language", value: "English", disabled: true },
              { label: "Notification preferences", value: "Coming soon", disabled: true },
              { label: "Low stock alert threshold", value: "Configured per part in Catalog", disabled: true },
            ].map(({ label, value, disabled }) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", background: "#111827", borderRadius: 6, opacity: disabled ? 0.6 : 1,
              }}>
                <span style={{ fontSize: "0.9rem" }}>{label}</span>
                <span className="muted" style={{ fontSize: "0.85rem" }}>{value}</span>
              </div>
            ))}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
            To request system configuration changes, contact your SAMS administrator.
          </p>
        </div>
      )}
    </div>
  );
}
