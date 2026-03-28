import React, { useEffect, useState } from "react";
import { api } from "../../../api";

export function EmailLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/email-centre/logs")
      .then(res => setLogs(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "#9ca3af" }}>Loading Audit Logs...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
      <h3 style={{ margin: 0, color: "#f8fafc" }}>Delivery Auditing</h3>
      
      {logs.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", border: "1px dashed #334155", borderRadius: 8, color: "#94a3b8" }}>
          No emails have been dispatched yet.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155", color: "#94a3b8" }}>
              <th style={{ padding: 12 }}>Time</th>
              <th style={{ padding: 12 }}>Order No.</th>
              <th style={{ padding: 12 }}>Garage</th>
              <th style={{ padding: 12 }}>Recipient</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Provider Msg ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderBottom: "1px solid #1e293b", color: "#cbd5e1" }}>
                <td style={{ padding: 12 }}>{new Date(log.createdAt).toLocaleString()}</td>
                <td style={{ padding: 12 }}>{log.seatOrder?.orderNumber ?? "N/A"}</td>
                <td style={{ padding: 12 }}>{log.garage?.name}</td>
                <td style={{ padding: 12 }}>{log.to}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ 
                    padding: "4px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600,
                    background: log.status === "DELIVERED" ? "#064e3b" : log.status === "FAILED" ? "#7f1d1d" : "#450a0a",
                    color: log.status === "DELIVERED" ? "#34d399" : log.status === "FAILED" ? "#fca5a5" : "#fcd34d"
                  }}>
                    {log.status}
                  </span>
                </td>
                <td style={{ padding: 12, fontFamily: "monospace", color: "#64748b" }}>{log.providerMessageId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
