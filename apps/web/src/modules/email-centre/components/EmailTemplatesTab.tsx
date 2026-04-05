import React, { useEffect, useState } from "react";
import { api } from "../../../api";

export function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/email-centre/templates")
      .then(res => setTemplates(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "#9ca3af" }}>Loading Templates...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
      <h3 style={{ margin: 0, color: "#f8fafc" }}>HTML Templates</h3>
      
      {templates.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", border: "1px dashed #334155", borderRadius: 8, color: "#94a3b8" }}>
          No templates configured.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {templates.map(t => (
            <div key={t.id} style={{ padding: 16, background: "#1e293b", borderRadius: 8, border: "1px solid #334155" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "1.1rem" }}>{t.name}</h4>
                  <code style={{ fontSize: "0.8rem", color: "#60a5fa", marginTop: 4, display: "block" }}>{t.code}</code>
                </div>
                <button style={{ background: "transparent", color: "#94a3b8", border: "1px solid #334155", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
                  Edit Template
                </button>
              </div>
              
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#94a3b8", fontSize: "0.8rem", display: "block", marginBottom: 2 }}>Subject Line</strong>
                <div style={{ background: "#0f172a", padding: "8px 12px", borderRadius: 6, color: "#e2e8f0", fontSize: "0.9rem" }}>
                  {t.subjectTemplate}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
