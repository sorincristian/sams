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

const STATUS_COLOR: Record<string, string> = {
  OPEN:          "#2563eb",
  IN_PROGRESS:   "#16a34a",
  WAITING_PARTS: "#d97706",
  COMPLETED:     "#6b7280",
  CANCELLED:     "#374151",
};

type WOStatus = "OPEN" | "IN_PROGRESS" | "WAITING_PARTS" | "COMPLETED" | "CANCELLED";

// Which buttons to show per current status
const STATUS_ACTIONS: Record<WOStatus, { label: string; next: WOStatus; color: string }[]> = {
  OPEN:          [{ label: "Start Work", next: "IN_PROGRESS", color: "#16a34a" }, { label: "Cancel WO", next: "CANCELLED", color: "#374151" }],
  IN_PROGRESS:   [{ label: "Mark Waiting Parts", next: "WAITING_PARTS", color: "#d97706" }, { label: "Complete Work Order", next: "COMPLETED", color: "#2563eb" }, { label: "Cancel WO", next: "CANCELLED", color: "#374151" }],
  WAITING_PARTS: [{ label: "Resume Work", next: "IN_PROGRESS", color: "#16a34a" }, { label: "Cancel WO", next: "CANCELLED", color: "#374151" }],
  COMPLETED:     [],  // locked
  CANCELLED:     [],  // locked
};

const LOCKED_STATUSES: WOStatus[] = ["COMPLETED", "CANCELLED"];

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [wo, setWo] = React.useState<WorkOrder | null>(null);
  const [parts, setParts] = React.useState<InventoryTransaction[]>([]);
  const [issueTarget, setIssueTarget] = React.useState<InventoryRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [transitioning, setTransitioning] = React.useState<WOStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [statusError, setStatusError] = React.useState<string | null>(null);

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

  async function handleStatusChange(nextStatus: WOStatus) {
    if (!id) return;
    setStatusError(null);
    setTransitioning(nextStatus);
    try {
      const res = await api.patch(`/work-orders/${id}/status`, { status: nextStatus });
      setWo(res.data);
      // Also refresh ledger (cancellation creates RETURN transactions)
      if (nextStatus === "CANCELLED") {
        const partsRes = await api.get(`/inventory/transactions?referenceId=${id}`);
        setParts(partsRes.data);
      }
    } catch (err: any) {
      setStatusError(err?.response?.data?.message ?? "Status update failed.");
    } finally {
      setTransitioning(null);
    }
  }

  function handleIssueDone() {
    setIssueTarget(null);
    void load();
  }

  if (loading) return <div className="card">Loading...</div>;

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

  const currentStatus = wo.status as WOStatus;
  const isLocked = LOCKED_STATUSES.includes(currentStatus);
  const actions = STATUS_ACTIONS[currentStatus] ?? [];

  return (
    <div className="grid" style={{ gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          style={{ width: "auto", padding: "4px 12px", background: "#374151", fontSize: "0.85rem" }}
          onClick={() => navigate("/work-orders")}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0 }}>{wo.workOrderNumber}</h1>
        <span style={{
          background: PRIORITY_COLOR[wo.priority] ?? "#6b7280",
          color: "#fff", borderRadius: 4, padding: "2px 10px",
          fontSize: "0.8rem", fontWeight: 700,
        }}>
          {wo.priority}
        </span>
        <span style={{
          background: STATUS_COLOR[currentStatus] ?? "#374151",
          color: "#fff", borderRadius: 4, padding: "2px 10px",
          fontSize: "0.8rem", fontWeight: 700,
        }}>
          {currentStatus.replace("_", " ")}
        </span>
      </div>

      {/* Status Actions */}
      {(actions.length > 0 || isLocked) && (
        <div className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {isLocked ? (
            <span className="muted" style={{ fontSize: "0.9rem" }}>
              {currentStatus === "COMPLETED" ? "✓ This work order is completed and locked." : "✗ This work order has been cancelled."}
            </span>
          ) : (
            <>
              <span className="muted" style={{ fontSize: "0.85rem", marginRight: 4 }}>Actions:</span>
              {actions.map(({ label, next, color }) => (
                <button
                  key={next}
                  style={{ width: "auto", padding: "6px 16px", background: color }}
                  disabled={transitioning !== null}
                  onClick={() => handleStatusChange(next)}
                >
                  {transitioning === next ? "Updating..." : label}
                </button>
              ))}
            </>
          )}
          {statusError && <span style={{ color: "#ef4444", fontSize: "0.9rem" }}>{statusError}</span>}
        </div>
      )}

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
          {!isLocked && (
            <button
              style={{ width: "auto", padding: "6px 14px", background: "#dc2626" }}
              onClick={() => setIssueTarget({ __prefilledWorkOrderId: id } as any)}
            >
              + Issue Part
            </button>
          )}
          {isLocked && currentStatus === "COMPLETED" && (
            <span className="muted" style={{ fontSize: "0.82rem" }}>Parts issuance locked on completed WOs</span>
          )}
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
                  <th>Type</th>
                  <th>Garage</th>
                  <th>By</th>
                  <th>Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((tx) => {
                  const isReturn = tx.type === "RETURN";
                  return (
                    <tr key={tx.id} style={{ opacity: isReturn ? 0.6 : 1 }}>
                      <td><strong>{tx.seatInsertType.partNumber}</strong></td>
                      <td>{tx.seatInsertType.description}</td>
                      <td style={{ textAlign: "right", color: isReturn ? "#10b981" : "#ef4444" }}>
                        {isReturn ? `+${tx.quantity}` : `−${tx.quantity}`}
                      </td>
                      <td>
                        <span style={{
                          background: isReturn ? "#16a34a" : "#dc2626",
                          color: "#fff", borderRadius: 4, padding: "1px 7px", fontSize: "0.72rem", fontWeight: 700,
                        }}>
                          {tx.type}
                        </span>
                      </td>
                      <td>{tx.garage.name}</td>
                      <td>{tx.performedByUser.name}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDate(tx.createdAt)}</td>
                      <td className="muted">{tx.notes ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ fontWeight: 700 }}>Net parts consumed</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#ef4444" }}>
                    {(() => {
                      const net = parts.reduce((sum, tx) =>
                        tx.type === "RETURN" ? sum - tx.quantity : sum + tx.quantity, 0);
                      return net > 0 ? `−${net}` : net === 0 ? "0" : `+${Math.abs(net)}`;
                    })()}
                  </td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

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
