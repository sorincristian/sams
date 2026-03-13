import React from "react";
import { api } from "../api";
import type { InventoryRow } from "@sams/types";

interface Props {
  item: InventoryRow;
  onClose: () => void;
  onDone: () => void;
}

export function ReceiveInventoryModal({ item, onClose, onDone }: Props) {
  const [quantity, setQuantity] = React.useState(1);
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quantity < 1) return;
    setLoading(true);
    setError(null);
    try {
      await api.post("/inventory/transaction", {
        inventoryItemId: item.id,
        type: "RECEIVE",
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
        <h3 style={{ marginBottom: 4 }}>Receive Stock</h3>
        <p className="muted" style={{ marginBottom: 16 }}>
          {item.seatInsertType.partNumber} — {item.seatInsertType.description}
          <br />Garage: {item.garage.name}
          <br />Current on hand: <strong>{item.quantityOnHand}</strong>
        </p>

        {error && <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Quantity to receive</div>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
              style={{ width: "100%" }}
            />
          </label>
          <label>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Notes (optional)</div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. PO #12345, vendor delivery"
              style={{ width: "100%" }}
            />
          </label>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" style={{ width: "auto", background: "#374151" }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={{ width: "auto" }} disabled={loading}>
              {loading ? "Saving..." : "Confirm Receive"}
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
  maxWidth: 460,
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};
