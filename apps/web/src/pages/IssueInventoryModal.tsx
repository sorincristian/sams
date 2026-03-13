import React from "react";
import { api } from "../api";
import type { InventoryRow } from "@sams/types";

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  status: string;
  bus: { fleetNumber: string; garage: { name: string } };
}

interface Props {
  item: InventoryRow;
  onClose: () => void;
  onDone: () => void;
}

export function IssueInventoryModal({ item, onClose, onDone }: Props) {
  const [workOrders, setWorkOrders] = React.useState<WorkOrder[]>([]);
  const [loadingWOs, setLoadingWOs] = React.useState(true);
  const [selectedWO, setSelectedWO] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.get("/work-orders")
      .then((res) => {
        const open = (res.data as WorkOrder[]).filter((wo) => wo.status === "OPEN");
        setWorkOrders(open);
        if (open.length > 0) setSelectedWO(open[0].id);
      })
      .finally(() => setLoadingWOs(false));
  }, []);

  const projectedQOH = item.quantityOnHand - quantity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quantity < 1) return;
    if (projectedQOH < 0) {
      setError(`Cannot issue ${quantity} — only ${item.quantityOnHand} on hand.`);
      return;
    }
    if (!selectedWO) {
      setError("Please select a work order.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/inventory/transaction", {
        inventoryItemId: item.id,
        type: "ISSUE",
        quantity,
        notes: notes.trim() || undefined,
        referenceType: "WORK_ORDER",
        referenceId: selectedWO,
      });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginBottom: 4 }}>Issue Parts</h3>
        <p className="muted" style={{ marginBottom: 16 }}>
          {item.seatInsertType.partNumber} — {item.seatInsertType.description}
          <br />Garage: {item.garage.name}
          <br />Current on hand: <strong>{item.quantityOnHand}</strong>
        </p>

        {error && <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Work Order</div>
            {loadingWOs ? (
              <div className="muted">Loading work orders...</div>
            ) : workOrders.length === 0 ? (
              <div style={{ color: "#f59e0b" }}>No open work orders found.</div>
            ) : (
              <select
                value={selectedWO}
                onChange={(e) => setSelectedWO(e.target.value)}
                required
                style={{ width: "100%", background: "#111827", color: "#f9fafb", border: "1px solid #374151", borderRadius: 6, padding: "8px 10px" }}
              >
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.workOrderNumber} — Bus {wo.bus.fleetNumber} ({wo.bus.garage.name})
                  </option>
                ))}
              </select>
            )}
          </label>

          <label>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Quantity to issue</div>
            <input
              type="number"
              min={1}
              max={item.quantityOnHand}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
              style={{ width: "100%" }}
            />
          </label>

          <div style={{ padding: "10px 14px", background: "#111827", borderRadius: 6, fontSize: "0.9rem" }}>
            Remaining after issue:{" "}
            <strong style={{ color: projectedQOH < 0 ? "#ef4444" : projectedQOH === 0 ? "#f59e0b" : "#10b981" }}>
              {projectedQOH}
            </strong>
          </div>

          <label>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Notes (optional)</div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. seat row 3, replaced worn inserts"
              style={{ width: "100%" }}
            />
          </label>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" style={{ width: "auto", background: "#374151" }} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              style={{ width: "auto", background: "#dc2626" }}
              disabled={loading || projectedQOH < 0 || workOrders.length === 0}
            >
              {loading ? "Saving..." : "Confirm Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: 10,
  padding: 28,
  width: "100%",
  maxWidth: 480,
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};
