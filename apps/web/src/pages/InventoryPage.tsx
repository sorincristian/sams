import React from "react";
import { api } from "../api";
import type { InventoryRow } from "@sams/types";
import { ReceiveInventoryModal } from "./ReceiveInventoryModal";
import { AdjustInventoryModal } from "./AdjustInventoryModal";
import { IssueInventoryModal } from "./IssueInventoryModal";

export function InventoryPage() {
  const [rows, setRows] = React.useState<InventoryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [receiveTarget, setReceiveTarget] = React.useState<InventoryRow | null>(null);
  const [adjustTarget, setAdjustTarget] = React.useState<InventoryRow | null>(null);
  const [issueTarget, setIssueTarget] = React.useState<InventoryRow | null>(null);

  function load() {
    setLoading(true);
    api.get("/inventory")
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, []);

  function handleTransactionDone() {
    setReceiveTarget(null);
    setAdjustTarget(null);
    setIssueTarget(null);
    load();
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <h1>Inventory Control</h1>

      <div className="card">
        {loading ? (
          <div className="muted">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="muted">No inventory records found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Garage</th>
                  <th>Part #</th>
                  <th>Description</th>
                  <th>Qty On Hand</th>
                  <th>Qty Reserved</th>
                  <th>Bin Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.garage.name}</td>
                    <td><strong>{row.seatInsertType.partNumber}</strong></td>
                    <td>{row.seatInsertType.description}</td>
                    <td>
                      <span style={{
                        color: row.quantityOnHand <= row.seatInsertType.minStockLevel ? "#ef4444" : "inherit",
                        fontWeight: row.quantityOnHand <= row.seatInsertType.minStockLevel ? 700 : "normal"
                      }}>
                        {row.quantityOnHand}
                      </span>
                      {row.quantityOnHand <= row.seatInsertType.minStockLevel && (
                        <span className="muted" style={{ marginLeft: 6, fontSize: "0.75rem", color: "#ef4444" }}>
                          LOW
                        </span>
                      )}
                    </td>
                    <td>{row.quantityReserved}</td>
                    <td>{row.binLocation ?? <span className="muted">—</span>}</td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button
                        style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem", background: "#dc2626" }}
                        onClick={() => setIssueTarget(row)}
                      >
                        Issue
                      </button>
                      <button
                        style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem" }}
                        onClick={() => setReceiveTarget(row)}
                      >
                        Receive
                      </button>
                      <button
                        style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem", background: "#374151" }}
                        onClick={() => setAdjustTarget(row)}
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {issueTarget && (
        <IssueInventoryModal
          item={issueTarget}
          onClose={() => setIssueTarget(null)}
          onDone={handleTransactionDone}
        />
      )}

      {receiveTarget && (
        <ReceiveInventoryModal
          item={receiveTarget}
          onClose={() => setReceiveTarget(null)}
          onDone={handleTransactionDone}
        />
      )}

      {adjustTarget && (
        <AdjustInventoryModal
          item={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onDone={handleTransactionDone}
        />
      )}
    </div>
  );
}
