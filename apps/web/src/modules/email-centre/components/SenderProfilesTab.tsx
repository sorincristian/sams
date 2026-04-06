import React, { useEffect, useState } from "react";
import { api } from "../../../api";

export function SenderProfilesTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    api.get("/email-centre/profiles")
      .then(res => setProfiles(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "#9ca3af" }}>Loading Profiles...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16, position: "relative", zIndex: 10 }}>
      {isProfileModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto" }}>
          <div style={{ background: "#1e293b", padding: 24, borderRadius: 8, minWidth: 400, border: "1px solid #334155" }}>
            <h2 style={{ color: "#f8fafc", margin: "0 0 16px 0" }}>Create Profile</h2>
            <p style={{ color: "#94a3b8", marginBottom: 24 }}>New profile settings would go here.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setIsProfileModalOpen(false)} style={{ background: "transparent", color: "#94a3b8", padding: "8px 16px", borderRadius: 6, border: "1px solid #334155", cursor: "pointer" }}>Close</button>
              <button onClick={() => setIsProfileModalOpen(false)} style={{ background: "#2563eb", color: "#fff", padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, color: "#f8fafc" }}>Sender Identities</h3>
        <button 
          onClick={() => setIsProfileModalOpen(true)}
          style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: 600, cursor: "pointer", position: "relative", zIndex: 50, pointerEvents: "auto" }}>
          + Add Profile
        </button>
      </div>
      
      {profiles.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", border: "1px dashed #334155", borderRadius: 8, color: "#94a3b8" }}>
          No sender profiles configured.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155", color: "#94a3b8" }}>
              <th style={{ padding: 12 }}>Garage</th>
              <th style={{ padding: 12 }}>Sender Name</th>
              <th style={{ padding: 12 }}>From Email</th>
              <th style={{ padding: 12 }}>Provider</th>
              <th style={{ padding: 12 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: 12, color: "#f8fafc" }}>{p.garage?.name}</td>
                <td style={{ padding: 12 }}>{p.fromName}</td>
                <td style={{ padding: 12 }}>{p.fromEmail}</td>
                <td style={{ padding: 12 }}>{p.providerType}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ padding: "4px 8px", background: p.active ? "#064e3b" : "#7f1d1d", color: p.active ? "#34d399" : "#fca5a5", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600 }}>
                    {p.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
