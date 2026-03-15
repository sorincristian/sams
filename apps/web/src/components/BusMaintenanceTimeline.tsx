import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

interface HistoryEvent {
  id: string;
  type: string;
  timestamp: string;
  title: string;
  description: string;
  workOrderId: string | null;
  busId: string;
  performedBy: string;
  part: {
    partNumber: string;
    description: string;
    category: string;
  } | null;
  quantity: number | null;
}

interface BusMaintenanceTimelineProps {
  busId: string;
}

export function BusMaintenanceTimeline({ busId }: BusMaintenanceTimelineProps) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg(null);

    api.get(`/buses/${busId}/history`)
      .then(res => {
        if (active) setHistory(res.data.history || []);
      })
      .catch(err => {
        if (active) {
            console.error("Failed to load timeline:", err);
            setErrorMsg(err.response?.data?.error || "Failed to load maintenance history.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [busId]);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", fontStyle: "italic", color: "#6b7280" }}>Loading timeline...</div>;
  }

  if (errorMsg) {
    return <div className="toast toast-error" style={{ marginBottom: 0 }}>{errorMsg}</div>;
  }

  if (history.length === 0) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "8px", border: "1px dashed #d1d5db" }}>No maintenance history found for this bus.</div>;
  }

  return (
    <div className="timeline-container" style={{ marginTop: "1rem" }}>
      {history.map((evt, idx) => {
        
        let icon = "🔧";
        let colorClass = "badge-gray";
        
        if (evt.type === "WORK_ORDER") {
            icon = "📋";
            colorClass = "badge-blue";
        } else if (evt.type === "PART_INSTALLED") {
            icon = "⬇️";
            colorClass = "badge-green";
        } else if (evt.type === "PART_REMOVED") {
            icon = "⬆️";
            colorClass = "badge-red";
        }

        return (
          <div key={evt.id} style={{ display: "flex", gap: "1rem", marginBottom: idx === history.length - 1 ? 0 : "2rem", position: "relative" }}>
            {/* Timeline Line */}
            {idx !== history.length - 1 && (
               <div style={{ position: "absolute", left: "1rem", top: "2.5rem", bottom: "-2rem", width: "2px", background: "#e5e7eb" }} />
            )}

            {/* Icon Bubble */}
            <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, border: "2px solid #fff", boxShadow: "0 0 0 1px #e5e7eb", flexShrink: 0 }}>
              {icon}
            </div>

            {/* Event Content */}
            <div style={{ flex: 1, marginTop: "0.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 600 }}>{evt.title}</span>
                  <span className={`badge ${colorClass}`} style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "12px" }}>
                    {evt.type.replace(/_/g, " ")}
                  </span>
                </div>
                <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  {new Date(evt.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              
              <div style={{ fontSize: "0.95rem", color: "#374151", marginBottom: "0.5rem" }}>
                {evt.description}
              </div>

              {evt.part && (
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.5rem", fontSize: "0.85rem", display: "inline-block", marginBottom: "0.5rem" }}>
                   <div style={{ fontWeight: 600 }}>{evt.part.partNumber} &mdash; {evt.part.description}</div>
                   <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem", color: "#6b7280" }}>
                     <span>Qty: {Math.abs(evt.quantity || 0)}</span>
                     <span>Category: {evt.part.category}</span>
                   </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem", color: "#9ca3af" }}>
                <span>👤 {evt.performedBy}</span>
                {evt.workOrderId && (
                  <Link to={`/work-orders/${evt.workOrderId}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                    🔗 View Work Order
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
