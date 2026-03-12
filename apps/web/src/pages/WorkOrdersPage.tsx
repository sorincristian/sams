import React from "react";
import { api } from "../api";
import type { Bus, WorkOrder } from "@sams/types";

export function WorkOrdersPage() {
  const [rows, setRows] = React.useState<WorkOrder[]>([]);
  const [buses, setBuses] = React.useState<Bus[]>([]);
  const [busId, setBusId] = React.useState("");
  const [issueDescription, setIssueDescription] = React.useState("");

  async function load() {
    const [woRes, busRes] = await Promise.all([api.get("/work-orders"), api.get("/buses")]);
    setRows(woRes.data);
    setBuses(busRes.data);
    if (!busId && busRes.data[0]) setBusId(busRes.data[0].id);
  }

  React.useEffect(() => { void load(); }, []);

  async function createWorkOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!busId || !issueDescription.trim()) return;
    await api.post("/work-orders", { busId, issueDescription, priority: "MEDIUM" });
    setIssueDescription("");
    await load();
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <h1>Work Orders</h1>
      <div className="grid two">
        <div className="card">
          <h3>Create work order</h3>
          <form className="row" onSubmit={createWorkOrder}>
            <select value={busId} onChange={(e) => setBusId(e.target.value)}>
              {buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.fleetNumber} - {bus.model}</option>)}
            </select>
            <textarea value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} placeholder="Issue description" rows={4} />
            <button type="submit">Create</button>
          </form>
        </div>
        <div className="card">
          <h3>Open work orders</h3>
          <table>
            <thead><tr><th>WO</th><th>Bus</th><th>Priority</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((wo) => (
                <tr key={wo.id}>
                  <td>{wo.workOrderNumber}</td>
                  <td>{wo.bus.fleetNumber}</td>
                  <td>{wo.priority}</td>
                  <td>{wo.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
