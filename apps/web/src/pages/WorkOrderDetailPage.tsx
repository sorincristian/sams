import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { WorkOrder, InventoryTransaction, InventoryRow } from "@sams/types";
import { IssueInventoryModal } from "./IssueInventoryModal";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#6b7280",
};

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [wo, setWo] = React.useState<WorkOrder | null>(null);
  const [parts, setParts] = React.useState<InventoryTransaction[]>([]);
  const [issueTarget, setIssueTarget] = React.useState<InventoryRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [woRes, partsRes] = await Promise.all([
        api.get(`/work-orders/${id}`),
        api.get(`/inventory/transactions?referenceId=${id}`)
      ]);
      setWo(woRes.data);
      setParts(partsRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load work order.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void load(); }, [id]);

  function handleIssueDone() {
    setIssueTarget(null);
    void load();
  }

  if (loading) {
    return <div className="card">Loading...</div>;
  }

  if (error || !wo) {
    return (
      <div className="card" style={{ color: "#ef4444" }}>
        {error ?? "Work order not found."}
        <br />
        <button style={{ marginTop: 12, width: "auto" }} onClick={() => navigate("/work-orders")}>
          ← Back to Work Orders
        </button>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          style={{ width: "auto", padding: "4px 12px", background: "#374151", fontSize: "0.85rem" }}
          onClick={() => navigate("/work-orders")}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0 }}>{wo.workOrderNumber}</h1>
        <span style={{
          background: PRIORITY_COLOR[wo.priority] ?? "#6b7280",
          color: "#fff",
          borderRadius: 4,
          padding: "2px 10px",
          fontSize: "0.8rem",
          fontWeight: 700,
        }}>
          {wo.priority}
        </span>
        <span style={{
          border: "1px solid #374151",
          borderRadius: 4,
          padding: "2px 10px",
          fontSize: "0.8rem",
          color: "#9ca3af"
        }}>
          {wo.status}
        </span>
      </div>

      {/* WO Info */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Work Order Info</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 2 }}>Work Order #</div>
            <strong>{wo.workOrderNumber}</strong>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 2 }}>Bus</div>
            <strong>{wo.bus.fleetNumber}</strong> — {wo.bus.model}
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 2 }}>Garage</div>
            {wo.bus.garage?.name ?? "—"}
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 2 }}>Created</div>
            {formatDate(wo.createdAt)}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 2 }}>Issue Description</div>
            {wo.issueDescription}
          </div>
        </div>
      </div>

      {/* Parts Issued */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Parts Issued</h3>
          <button
            style={{ width: "auto", padding: "6px 14px", background: "#dc2626" }}
            onClick={() => {
              // Open issue modal — user picks inventory item from a list
              // We pass a minimal object to trigger the select-item flow
              setIssueTarget({ __prefilledWorkOrderId: id } as any);
            }}
          >
            + Issue Part
          </button>
        </div>

        {parts.length === 0 ? (
          <div className="muted">No parts issued to this work order yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Part #</th>
                  <th>Description</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th>Garage</th>
                  <th>Issued By</th>
                  <th>Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((tx) => (
                  <tr key={tx.id}>
                    <td><strong>{tx.seatInsertType.partNumber}</strong></td>
                    <td>{tx.seatInsertType.description}</td>
                    <td style={{ textAlign: "right", color: "#ef4444" }}>−{tx.quantity}</td>
                    <td>{tx.garage.name}</td>
                    <td>{tx.performedByUser.name}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(tx.createdAt)}</td>
                    <td className="muted">{tx.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ fontWeight: 700 }}>Total parts issued</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#ef4444" }}>
                    −{parts.reduce((sum, tx) => sum + tx.quantity, 0)}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Issue Modal - only when issueTarget is set */}
      {issueTarget && (
        <IssueInventoryModal
          item={issueTarget}
          prefilledWorkOrderId={id}
          onClose={() => setIssueTarget(null)}
          onDone={handleIssueDone}
        />
      )}
    </div>
  );
}
