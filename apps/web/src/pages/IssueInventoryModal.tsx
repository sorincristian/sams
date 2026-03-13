import React from "react";
import { api } from "../api";
import type { InventoryRow, InventoryTransactionType } from "@sams/types";

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  status: string;
  bus: { fleetNumber: string; garage: { name: string } };
}

interface Props {
  item: InventoryRow | null;
  prefilledWorkOrderId?: string;
  onClose: () => void;
  onDone: () => void;
}

export function IssueInventoryModal({ item: initialItem, prefilledWorkOrderId, onClose, onDone }: Props) {
  const [workOrders, setWorkOrders] = React.useState<WorkOrder[]>([]);
  const [inventoryItems, setInventoryItems] = React.useState<InventoryRow[]>([]);
  const [loadingWOs, setLoadingWOs] = React.useState(true);
  const [loadingItems, setLoadingItems] = React.useState(!initialItem);

  // selected state
  const [selectedWO, setSelectedWO] = React.useState(prefilledWorkOrderId ?? "");
  const [selectedItemId, setSelectedItemId] = React.useState(initialItem?.id ?? "");
  const [quantity, setQuantity] = React.useState(1);
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Resolved item (from picker or prop)
  const resolvedItem = initialItem ?? inventoryItems.find((i) => i.id === selectedItemId) ?? null;
  const projectedQOH = resolvedItem ? resolvedItem.quantityOnHand - quantity : null;

  React.useEffect(() => {
    api.get("/work-orders")
      .then((res) => {
        const open = (res.data as WorkOrder[]).filter((wo) => wo.status === "OPEN");
        setWorkOrders(open);
        if (!prefilledWorkOrderId && open.length > 0 && !selectedWO) {
          setSelectedWO(open[0].id);
        }
      })
      .finally(() => setLoadingWOs(false));

    if (!initialItem) {
      api.get("/inventory")
        .then((res) => {
          setInventoryItems(res.data);
          if (res.data.length > 0) setSelectedItemId(res.data[0].id);
        })
        .finally(() => setLoadingItems(false));
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedWO) { setError("Please select a work order."); return; }
    if (!resolvedItem) { setError("Please select an inventory item."); return; }
    if (quantity < 1) { setError("Quantity must be at least 1."); return; }
    if (projectedQOH !== null && projectedQOH < 0) {
      setError(`Cannot issue ${quantity} — only ${resolvedItem.quantityOnHand} on hand.`);
      return;
    }

    setLoading(true);
    try {
      await api.post("/inventory/transaction", {
        inventoryItemId: resolvedItem.id,
        type: "ISSUE" as InventoryTransactionType,
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

        {resolvedItem && (
          <p className="muted" style={{ marginBottom: 16 }}>
            {resolvedItem.seatInsertType.partNumber} — {resolvedItem.seatInsertType.description}
            <br />Garage: {resolvedItem.garage.name}
            <br />Current on hand: <strong>{resolvedItem.quantityOnHand}</strong>
          </p>
        )}

        {error && <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Inventory item picker — only shown when not pre-selected */}
          {!initialItem && (
            <label>
              <div style={{ marginBottom: 4, fontWeight: 600 }}>Inventory Item</div>
              {loadingItems ? (
                <div className="muted">Loading inventory...</div>
              ) : (
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  required
                  style={selectStyle}
                >
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.seatInsertType.partNumber} — {item.seatInsertType.description} ({item.garage.name}, QOH: {item.quantityOnHand})
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}

          {/* Work Order picker */}
          <label>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Work Order</div>
            {prefilledWorkOrderId ? (
              <div style={{ padding: "8px 10px", background: "#111827", borderRadius: 6, color: "#9ca3af", fontSize: "0.9rem" }}>
                {workOrders.find((wo) => wo.id === prefilledWorkOrderId)?.workOrderNumber ?? prefilledWorkOrderId}
                <span style={{ marginLeft: 8, fontSize: "0.75rem" }}>(pre-selected)</span>
              </div>
            ) : loadingWOs ? (
              <div className="muted">Loading work orders...</div>
            ) : workOrders.length === 0 ? (
              <div style={{ color: "#f59e0b" }}>No open work orders found.</div>
            ) : (
              <select
                value={selectedWO}
                onChange={(e) => setSelectedWO(e.target.value)}
                required
                style={selectStyle}
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
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Quantity</div>
            <input
              type="number"
              min={1}
              max={resolvedItem?.quantityOnHand}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
              style={{ width: "100%" }}
            />
          </label>

          {resolvedItem && projectedQOH !== null && (
            <div style={{ padding: "10px 14px", background: "#111827", borderRadius: 6, fontSize: "0.9rem" }}>
              Remaining after issue:{" "}
              <strong style={{ color: projectedQOH < 0 ? "#ef4444" : projectedQOH === 0 ? "#f59e0b" : "#10b981" }}>
                {projectedQOH}
              </strong>
            </div>
          )}

          <label>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Notes (optional)</div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. row 3 replacement"
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
              disabled={loading || (projectedQOH !== null && projectedQOH < 0) || workOrders.length === 0}
            >
              {loading ? "Saving..." : "Confirm Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  background: "#111827",
  color: "#f9fafb",
  border: "1px solid #374151",
  borderRadius: 6,
  padding: "8px 10px",
};

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
  maxWidth: 500,
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};
