import React from "react";
import { PageContainer, PageHeader } from "../components/shared/Page";
import { SectionCard, InfoCard } from "../components/shared/Card";
import { Tabs } from "../components/shared/Tabs";

type Section = "about" | "help" | "settings";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "about", label: "About" },
  { id: "help", label: "Help" },
  { id: "settings", label: "Settings" },
];

export function HelpPage() {
  const [active, setActive] = React.useState<Section>("about");

  return (
    <PageContainer>
      <PageHeader title="Help & Info" />

      <Tabs tabs={SECTIONS} active={active} onChange={setActive} />

      <div style={{ marginTop: "var(--spacing-24)" }}>
        {/* About */}
        {active === "about" && (
          <SectionCard title="SAMS">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-16)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", marginBottom: "var(--spacing-12)" }}>
                  <span style={{ fontWeight: 700, color: "var(--color-primary)", fontSize: "14px", background: "var(--bg-surface-alt)", padding: "4px 12px", borderRadius: "16px" }}>SIMS</span>
                  <span className="text-secondary" style={{ fontSize: "14px" }}>Seat Inserts Inventory Manager</span>
                </div>
                <p className="text-secondary" style={{ margin: 0, lineHeight: 1.6 }}>
                  SIMS is the inventory management module within the SAMS platform. It tracks seat insert stock levels across TTC garages, manages part issuance to work orders, and provides a full audit ledger of all inventory movements.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "var(--spacing-12)" }}>
                {[
                  { label: "Platform", value: "SAMS" },
                  { label: "Module", value: "SIMS — Seat Inserts Inventory Manager" },
                  { label: "Operator", value: "TTC (Toronto Transit Commission)" },
                  { label: "Version", value: "1.0.0 — Phase 1" },
                  { label: "Environment", value: "Production (Render)" },
                  { label: "Stack", value: "Node.js · Prisma · React · PostgreSQL" },
                ].map(({ label, value }) => (
                  <InfoCard key={label} label={label} value={value} />
                ))}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Help */}
        {active === "help" && (
          <SectionCard title="Quick Reference">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-20)" }}>
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
                  <h4 style={{ margin: "0 0 var(--spacing-8) 0", color: "var(--text-primary)", fontSize: "16px" }}>{title}</h4>
                  <ul style={{ margin: 0, paddingLeft: "var(--spacing-20)", display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
                    {items.map((item) => (
                      <li key={item} className="text-secondary" style={{ fontSize: "14px", lineHeight: 1.5 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Settings */}
        {active === "settings" && (
          <SectionCard title="Settings">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-16)" }}>
              <p className="text-secondary" style={{ margin: 0 }}>
                User-level and system settings will be available here in a future release.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-12)" }}>
                {[
                  { label: "Theme", value: "Light (system default)", disabled: true },
                  { label: "Language", value: "English", disabled: true },
                  { label: "Notification preferences", value: "Coming soon", disabled: true },
                  { label: "Low stock alert threshold", value: "Configured per part in Catalog", disabled: true },
                ].map(({ label, value, disabled }) => (
                  <div key={label} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "var(--spacing-12) var(--spacing-16)", background: "var(--bg-surface-alt)", borderRadius: "8px", opacity: disabled ? 0.6 : 1,
                  }}>
                    <span style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}>{label}</span>
                    <span className="text-muted">{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-muted" style={{ margin: 0 }}>
                To request system configuration changes, contact your SAMS administrator.
              </p>
            </div>
          </SectionCard>
        )}
      </div>
    </PageContainer>
  );
}
