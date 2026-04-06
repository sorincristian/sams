import React, { useState } from "react";
import { SenderProfilesTab } from "../../modules/email-centre/components/SenderProfilesTab";
import { EmailTemplatesTab } from "../../modules/email-centre/components/EmailTemplatesTab";
import { EmailLogsTab } from "../../modules/email-centre/components/EmailLogsTab";

export function EmailCentrePage() {
  const [activeTab, setActiveTab] = useState("PROFILES");

  return (
    <div className="page-container" style={{ display: "flex", flexDirection: "column", height: "100%", gap: 16 }}>
      <header className="page-header" style={{ borderBottom: "1px solid #334155", paddingBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#f8fafc" }}>Email Management Centre</h1>
          <p style={{ margin: 0, marginTop: 4, color: "#94a3b8", fontSize: "0.875rem" }}>
            Configure garage sender identities, HTML templates, and monitor outbound queues.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #1e293b", paddingBottom: 8, position: "relative", zIndex: 50, pointerEvents: "auto" }}>
        <button
          onClick={() => setActiveTab("PROFILES")}
          style={{
            background: activeTab === "PROFILES" ? "#2563eb" : "transparent",
            color: activeTab === "PROFILES" ? "#fff" : "#94a3b8",
            border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: 600, cursor: "pointer"
          }}
        >
          Sender Profiles
        </button>
        <button
          onClick={() => setActiveTab("TEMPLATES")}
          style={{
            background: activeTab === "TEMPLATES" ? "#2563eb" : "transparent",
            color: activeTab === "TEMPLATES" ? "#fff" : "#94a3b8",
            border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: 600, cursor: "pointer"
          }}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab("LOGS")}
          style={{
            background: activeTab === "LOGS" ? "#2563eb" : "transparent",
            color: activeTab === "LOGS" ? "#fff" : "#94a3b8",
            border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: 600, cursor: "pointer"
          }}
        >
          Audit Logs
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "PROFILES" && <SenderProfilesTab />}
        {activeTab === "TEMPLATES" && <EmailTemplatesTab />}
        {activeTab === "LOGS" && <EmailLogsTab />}
      </div>
    </div>
  );
}
