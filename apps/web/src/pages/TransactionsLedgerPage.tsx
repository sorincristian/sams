import React from "react";
import { api } from "../api";
import type { InventoryTransaction } from "@sams/types";

const TYPE_COLORS: Record<string, string> = {
  RECEIVE:      "#16a34a",
  ISSUE:        "#dc2626",
  ADJUST_IN:    "#2563eb",
  ADJUST_OUT:   "#d97706",
  RETURN:       "#7c3aed",
  SCRAP:        "#6b7280",
  TRANSFER_IN:  "#0891b2",
  TRANSFER_OUT: "#ea580c",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span style={{
      background: TYPE_COLORS[type] ?? "#374151",
      color: "#fff",
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: "0.75rem",
      fontWeight: 700,
      letterSpacing: "0.04em",
    }}>
      {type.replace("_", " ")}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function TransactionsLedgerPage() {
  const [rows, setRows] = React.useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.get("/inventory/transactions")
      .then((res) => setRows(res.data))
      .catch(() => setError("Failed to load transactions."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid" style={{ gap: 20 }}>
      <h1>Transactions Ledger</h1>

      <div className="card">
        {loading && <div className="muted">Loading...</div>}
        {error && <div style={{ color: "#ef4444" }}>{error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="muted">No transactions recorded yet.</div>
        )}
        {!loading && !error && rows.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Garage</th>
                  <th>Part #</th>
                  <th>Description</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th>Performed By</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(tx.createdAt)}</td>
                    <td><TypeBadge type={tx.type} /></td>
                    <td>{tx.garage.name}</td>
                    <td><strong>{tx.seatInsertType.partNumber}</strong></td>
                    <td>{tx.seatInsertType.description}</td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{["ISSUE", "ADJUST_OUT", "SCRAP", "TRANSFER_OUT"].includes(tx.type)
                        ? `-${tx.quantity}`
                        : `+${tx.quantity}`}
                      </strong>
                    </td>
                    <td>{tx.performedByUser.name}</td>
                    <td className="muted">{tx.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
