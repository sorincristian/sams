import React, { useEffect, useState } from "react";
import { api } from "../../../api";

export function SenderProfilesTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [garages, setGarages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    garageId: "",
    fromName: "",
    fromEmail: "",
    replyToEmail: "",
    harveyToEmail: "noreply@sams.local", // default fallback to pass zod
    providerType: "SMTP",
    active: true
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get("/email-centre/profiles"),
      api.get("/garages")
    ])
    .then(([profRes, garRes]) => {
      setProfiles(profRes.data);
      setGarages(garRes.data);
    })
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    
    try {
      // Create clone and ensure mandatory email schemas pass
      const payload = { ...formData };
      if (!payload.replyToEmail) payload.replyToEmail = payload.fromEmail;
      
      await api.post("/email-centre/profiles", payload);
      setIsProfileModalOpen(false);
      setFormData({
        garageId: "",
        fromName: "",
        fromEmail: "",
        replyToEmail: "",
        harveyToEmail: "noreply@sams.local",
        providerType: "SMTP",
        active: true
      });
      loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && profiles.length === 0) return <div style={{ color: "#9ca3af" }}>Loading Profiles...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16, position: "relative", zIndex: 10 }}>
      {isProfileModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto" }}>
          <form onSubmit={handleSave} style={{ background: "#1e293b", padding: 24, borderRadius: 8, minWidth: 460, border: "1px solid #334155" }}>
            <h2 style={{ color: "#f8fafc", margin: "0 0 8px 0" }}>Create Profile</h2>
            <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: "0.875rem" }}>Configure outbound email identity for a garage.</p>
            
            {error && <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: "8px 12px", borderRadius: 4, marginBottom: 16, fontSize: "0.875rem" }}>{error}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, color: "#94a3b8", fontSize: "0.875rem" }}>Garage *</label>
                <select required value={formData.garageId} onChange={e => setFormData({ ...formData, garageId: e.target.value })} style={{ width: "100%", background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", padding: "8px 12px", borderRadius: 4 }}>
                  <option value="">Select Garage...</option>
                  {garages.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 4, color: "#94a3b8", fontSize: "0.875rem" }}>Sender Name *</label>
                <input required type="text" value={formData.fromName} onChange={e => setFormData({ ...formData, fromName: e.target.value })} placeholder="e.g. SAMS Dispatch" style={{ width: "100%", background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", padding: "8px 12px", borderRadius: 4 }} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 4, color: "#94a3b8", fontSize: "0.875rem" }}>From Email *</label>
                <input required type="email" value={formData.fromEmail} onChange={e => setFormData({ ...formData, fromEmail: e.target.value })} placeholder="noreply@domain.com" style={{ width: "100%", background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", padding: "8px 12px", borderRadius: 4 }} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 4, color: "#94a3b8", fontSize: "0.875rem" }}>Reply-To Email (Optional)</label>
                <input type="email" value={formData.replyToEmail} onChange={e => setFormData({ ...formData, replyToEmail: e.target.value })} placeholder="support@domain.com" style={{ width: "100%", background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", padding: "8px 12px", borderRadius: 4 }} />
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#f8fafc" }}>
                  <input type="checkbox" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} /> Active Status
                </label>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setIsProfileModalOpen(false)} style={{ background: "transparent", color: "#94a3b8", padding: "8px 16px", borderRadius: 6, border: "1px solid #334155", cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: "#2563eb", color: "#fff", padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
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
