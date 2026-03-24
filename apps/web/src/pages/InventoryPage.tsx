import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { InventoryRow } from "@sams/types";
import { ReceiveInventoryModal } from "./ReceiveInventoryModal";
import { AdjustInventoryModal } from "./AdjustInventoryModal";
import { IssueInventoryModal } from "./IssueInventoryModal";
import { canManage } from "../lib/rbac";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export function InventoryPage({ user }: { user?: any }) {
  const query = useQuery();
  const navigate = useNavigate();

  const [rows, setRows] = React.useState<InventoryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [receiveTarget, setReceiveTarget] = React.useState<InventoryRow | null>(null);
  const [adjustTarget, setAdjustTarget] = React.useState<InventoryRow | null>(null);
  const [issueTarget, setIssueTarget] = React.useState<InventoryRow | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [lowStockOnly, setLowStockOnly] = React.useState(query.get("lowStock") === "1");
  const [garageFilter, setGarageFilter] = React.useState("");
  const [sortByQty, setSortByQty] = React.useState(false);

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

  // Derived garage list
  const garages = React.useMemo(() => {
    const seen = new Set<string>();
    return rows.filter((r) => {
      if (seen.has(r.garage.id)) return false;
      seen.add(r.garage.id);
      return true;
    }).map((r) => r.garage);
  }, [rows]);

  // Filtered + sorted rows
  const visible = React.useMemo(() => {
    let out = rows;
    const q = search.toLowerCase().trim();
    if (q) {
      out = out.filter(
        (r) =>
          r.seatInsertType.partNumber.toLowerCase().includes(q) ||
          r.seatInsertType.description.toLowerCase().includes(q)
      );
    }
    if (garageFilter) {
      out = out.filter((r) => r.garage.id === garageFilter);
    }
    if (lowStockOnly) {
      out = out.filter((r) => r.quantityOnHand <= r.seatInsertType.minStockLevel);
    }
    if (sortByQty) {
      out = [...out].sort((a, b) => a.quantityOnHand - b.quantityOnHand);
    }
    return out;
  }, [rows, search, garageFilter, lowStockOnly, sortByQty]);

  const lowStockCount = rows.filter((r) => r.quantityOnHand <= r.seatInsertType.minStockLevel).length;

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Inventory Control</h1>
        <button style={{ width: "auto", padding: "8px 16px", background: "#fff", color: "#334155", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }} onClick={() => navigate("/inventory/seat-changes")}>
          View Seat Change Report
        </button>
      </div>

      {/* Filters bar */}
      <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search part # or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 220px", minWidth: 180 }}
        />

        <select
          value={garageFilter}
          onChange={(e) => setGarageFilter(e.target.value)}
          style={{ flex: "0 1 180px", background: "#111827", color: "#f9fafb", border: "1px solid #374151", borderRadius: 6, padding: "8px 10px" }}
        >
          <option value="">All Garages</option>
          {garages.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", whiteSpace: "nowrap" }}>
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              // Keep URL in sync
              const params = new URLSearchParams(window.location.search);
              if (e.target.checked) params.set("lowStock", "1");
              else params.delete("lowStock");
              navigate({ search: params.toString() }, { replace: true });
            }}
          />
          Low stock only
          {lowStockCount > 0 && (
            <span style={{ background: "#ef4444", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: "0.75rem" }}>
              {lowStockCount}
            </span>
          )}
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", whiteSpace: "nowrap" }}>
          <input
            type="checkbox"
            checked={sortByQty}
            onChange={(e) => setSortByQty(e.target.checked)}
          />
          Sort by lowest qty
        </label>

        {(search || garageFilter || lowStockOnly || sortByQty) && (
          <button
            style={{ width: "auto", padding: "6px 12px", background: "#374151", fontSize: "0.8rem" }}
            onClick={() => { setSearch(""); setGarageFilter(""); setLowStockOnly(false); setSortByQty(false); navigate({ search: "" }, { replace: true }); }}
          >
            Clear filters
          </button>
        )}

        <span className="muted" style={{ marginLeft: "auto", fontSize: "0.85rem" }}>
          {visible.length} / {rows.length} items
        </span>
      </div>

      <div className="card">
        {loading ? (
          <div className="muted">Loading...</div>
        ) : visible.length === 0 ? (
          <div className="muted">{rows.length === 0 ? "No inventory records found." : "No items match the current filters."}</div>
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
                {visible.map((row) => (
                  <tr key={row.id} style={row.quantityOnHand <= row.seatInsertType.minStockLevel ? { background: "rgba(239,68,68,0.05)" } : undefined}>
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
                        <span style={{ marginLeft: 6, fontSize: "0.72rem", color: "#ef4444", fontWeight: 700 }}>LOW</span>
                      )}
                    </td>
                    <td>{row.quantityReserved}</td>
                    <td>{row.binLocation ?? <span className="muted">—</span>}</td>
                    <td style={{ display: "flex", gap: 8 }}>
                      {canManage(user, 'inventory') ? (
                        <>
                          <button style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem", background: "#dc2626" }} onClick={() => setIssueTarget(row)}>Issue</button>
                          <button style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem" }} onClick={() => setReceiveTarget(row)}>Receive</button>
                          <button style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem", background: "#374151" }} onClick={() => setAdjustTarget(row)}>Adjust</button>
                        </>
                      ) : (
                        <span className="muted" style={{ fontSize: "0.8rem" }}>View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {issueTarget && <IssueInventoryModal item={issueTarget} onClose={() => setIssueTarget(null)} onDone={handleTransactionDone} />}
      {receiveTarget && <ReceiveInventoryModal item={receiveTarget} onClose={() => setReceiveTarget(null)} onDone={handleTransactionDone} />}
      {adjustTarget && <AdjustInventoryModal item={adjustTarget} onClose={() => setAdjustTarget(null)} onDone={handleTransactionDone} />}
    </div>
  );
}
