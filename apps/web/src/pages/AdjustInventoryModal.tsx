import React from "react";
import { api } from "../api";
import type { InventoryRow, InventoryTransactionType } from "@sams/types";

interface Props {
  item: InventoryRow;
  onClose: () => void;
  onDone: () => void;
}

export function AdjustInventoryModal({ item, onClose, onDone }: Props) {
  const [adjustType, setAdjustType] = React.useState<"ADJUST_IN" | "ADJUST_OUT">("ADJUST_IN");
  const [quantity, setQuantity] = React.useState(1);
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isDeduction = adjustType === "ADJUST_OUT";
  const projectedQOH = isDeduction
    ? item.quantityOnHand - quantity
    : item.quantityOnHand + quantity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quantity < 1) return;
    if (isDeduction && projectedQOH < 0) {
      setError(`Cannot deduct ${quantity} — only ${item.quantityOnHand} on hand.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/inventory/transaction", {
        inventoryItemId: item.id,
        type: adjustType as InventoryTransactionType,
        quantity,
        notes: notes.trim() || undefined,
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
        <h3 style={{ marginBottom: 4 }}>Adjust Inventory</h3>
        <p className="muted" style={{ marginBottom: 16 }}>
          {item.seatInsertType.partNumber} — {item.seatInsertType.description}
          <br />Garage: {item.garage.name}
          <br />Current on hand: <strong>{item.quantityOnHand}</strong>
        </p>

        {error && <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              style={{
                flex: 1,
                background: adjustType === "ADJUST_IN" ? "#2563eb" : "#374151",
                transition: "background 0.15s",
              }}
              onClick={() => setAdjustType("ADJUST_IN")}
            >
              + Adjust In
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                background: adjustType === "ADJUST_OUT" ? "#dc2626" : "#374151",
                transition: "background 0.15s",
              }}
              onClick={() => setAdjustType("ADJUST_OUT")}
            >
              − Adjust Out
            </button>
          </div>

          <label>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Quantity</div>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
              className="w-full bg-[#0f172a] text-white border border-[#334155] rounded-md p-2 placeholder-slate-400 outline-none focus:border-blue-500"
            />
          </label>

          <div style={{ padding: "10px 14px", background: "#111827", borderRadius: 6, fontSize: "0.9rem" }}>
            Projected on hand after adjustment:{" "}
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
              placeholder="e.g. damaged parts removed, cycle count correction"
              className="w-full bg-[#0f172a] text-white border border-[#334155] rounded-md p-2 placeholder-slate-400 outline-none focus:border-blue-500"
            />
          </label>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" style={{ width: "auto", background: "#374151" }} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              style={{ width: "auto", background: isDeduction ? "#dc2626" : "#2563eb" }}
              disabled={loading || projectedQOH < 0}
            >
              {loading ? "Saving..." : `Confirm ${adjustType === "ADJUST_IN" ? "In" : "Out"}`}
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
  background: "rgba(15, 23, 42, 0.95)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 28,
  width: "100%",
  maxWidth: 460,
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};
