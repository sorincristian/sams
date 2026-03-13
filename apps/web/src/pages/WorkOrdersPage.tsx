import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Bus, WorkOrder } from "@sams/types";

export function WorkOrdersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<WorkOrder[]>([]);;
  const [buses, setBuses] = React.useState<Bus[]>([]);
  const [busId, setBusId] = React.useState("");
  const [issueDescription, setIssueDescription] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const [woRes, busRes] = await Promise.all([
        api.get("/work-orders"),
        api.get("/buses")
      ]);
      setRows(woRes.data);
      setBuses(busRes.data);
      if (busRes.data.length > 0 && !busId) {
        setBusId(busRes.data[0].id);
      }
    } catch (err: any) {
      console.error("[WorkOrdersPage] load failed:", err);
      setLoadError(err?.response?.data?.message ?? "Failed to load data.");
    }
  }

  React.useEffect(() => { void load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!busId) {
      setError("Please select a bus.");
      return;
    }
    if (!issueDescription.trim()) {
      setError("Issue description is required.");
      return;
    }

    const payload = { busId, issueDescription: issueDescription.trim(), priority: "MEDIUM" };
    console.log("[WorkOrdersPage] submitting create:", payload);

    setCreating(true);
    try {
      const res = await api.post("/work-orders", payload);
      console.log("[WorkOrdersPage] created:", res.data);
      setIssueDescription("");
      await load();
    } catch (err: any) {
      console.error("[WorkOrdersPage] create failed:", err);
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to create work order.";
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <h1>Work Orders</h1>

      {loadError && (
        <div className="card" style={{ color: "#ef4444" }}>{loadError}</div>
      )}

      <div className="grid two">
        <div className="card">
          <h3>Create work order</h3>
          <form style={{ display: "flex", flexDirection: "column", gap: 12 }} onSubmit={handleCreate}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Bus</label>
              <select
                value={busId}
                onChange={(e) => setBusId(e.target.value)}
                style={{ width: "100%", background: "#111827", color: "#f9fafb", border: "1px solid #374151", borderRadius: 6, padding: "8px 10px" }}
              >
                {buses.length === 0 && <option value="">Loading buses...</option>}
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.fleetNumber} — {bus.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Issue description</label>
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Describe the issue (e.g. seat inserts worn on row 3-6)"
                rows={4}
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>

            {error && (
              <div style={{ color: "#ef4444", fontSize: "0.9rem" }}>{error}</div>
            )}

            <button type="submit" disabled={creating} style={{ width: "auto" }}>
              {creating ? "Creating..." : "Create Work Order"}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Open work orders</h3>
          {rows.length === 0 ? (
            <div className="muted">No work orders found.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>WO #</th>
                  <th>Bus</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((wo) => (
                  <tr
                    key={wo.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/work-orders/${wo.id}`)}
                  >
                    <td><strong>{wo.workOrderNumber}</strong></td>
                    <td>{wo.bus.fleetNumber}</td>
                    <td>
                      <span style={{
                        color: wo.priority === "HIGH" ? "#ef4444" : wo.priority === "MEDIUM" ? "#f59e0b" : "#6b7280",
                        fontWeight: 600
                      }}>
                        {wo.priority}
                      </span>
                    </td>
                    <td>{wo.status}</td>
                    <td className="muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {wo.issueDescription}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
