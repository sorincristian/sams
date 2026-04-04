import React from "react";
import { api } from "../api";
import type { InventoryTransaction } from "@sams/types";
import { CatalogAutocomplete } from "../components/CatalogAutocomplete";

const TRANSACTION_TYPES = ["RECEIVE", "ISSUE", "ADJUST_IN", "ADJUST_OUT", "RETURN", "SCRAP", "TRANSFER_IN", "TRANSFER_OUT"];

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

const DEDUCT_TYPES = new Set(["ISSUE", "ADJUST_OUT", "SCRAP", "TRANSFER_OUT"]);

function TypeBadge({ type }: { type: string }) {
  return (
    <span style={{
      background: TYPE_COLORS[type] ?? "#374151",
      color: "#fff", borderRadius: 4, padding: "2px 8px",
      fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.04em",
    }}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function TransactionsLedgerPage() {
  const [rows, setRows] = React.useState<InventoryTransaction[]>([]);
  const [catalogParts, setCatalogParts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [selectedPartId, setSelectedPartId] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState("");
  const [garageFilter, setGarageFilter] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  React.useEffect(() => {
    Promise.all([
      api.get("inventory/transactions"),
      api.get("catalog")
    ])
      .then(([txRes, catRes]) => {
        const txData = txRes.data?.transactions || txRes.data?.items || txRes.data?.data || txRes.data;
        const catData = catRes.data?.items || catRes.data?.data || catRes.data;
        setRows(Array.isArray(txData) ? txData : []);
        setCatalogParts(Array.isArray(catData) ? catData : []);
      })
      .catch((err) => {
        console.error("Failed to load ledger data:", err);
        setError("Failed to load transactions.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Unique garages from loaded data
  const garages = React.useMemo(() => {
    const seen = new Set<string>();
    return rows.filter((tx) => {
      if (seen.has(tx.garage.id)) return false;
      seen.add(tx.garage.id);
      return true;
    }).map((tx) => tx.garage);
  }, [rows]);

  const visible = React.useMemo(() => {
    let out = rows;
    
    if (selectedPartId) {
      out = out.filter(tx => tx.seatInsertType.id === selectedPartId);
    } else {
      const q = search.toLowerCase().trim();
      if (q) {
        out = out.filter(
          (tx) =>
            tx.seatInsertType.partNumber.toLowerCase().includes(q) ||
            tx.seatInsertType.description.toLowerCase().includes(q) ||
            (tx.notes ?? "").toLowerCase().includes(q) ||
            (tx.referenceId ?? "").toLowerCase().includes(q)
        );
      }
    }

    if (typeFilter) out = out.filter((tx) => tx.type === typeFilter);
    if (garageFilter) out = out.filter((tx) => tx.garage.id === garageFilter);
    if (dateFrom) out = out.filter((tx) => tx.createdAt >= dateFrom);
    if (dateTo) {
      const end = dateTo + "T23:59:59";
      out = out.filter((tx) => tx.createdAt <= end);
    }
    return out;
  }, [rows, search, selectedPartId, typeFilter, garageFilter, dateFrom, dateTo]);

  const hasFilters = search || selectedPartId || typeFilter || garageFilter || dateFrom || dateTo;

  function clearFilters() {
    setSearch(""); setSelectedPartId(null); setTypeFilter(""); setGarageFilter(""); setDateFrom(""); setDateTo("");
  }

  const selectStyle: React.CSSProperties = {
    background: "#111827", color: "#f9fafb", border: "1px solid #374151",
    borderRadius: 6, padding: "7px 10px",
  };

  return (
    <div className="grid" style={{ gap: 20 }}>
      <h1>Transactions Ledger</h1>

      {/* Filters */}
      <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <CatalogAutocomplete 
          catalogParts={catalogParts}
          queryLocal={search}
          setQueryLocal={setSearch}
          selectedPartId={selectedPartId}
          setSelectedPartId={setSelectedPartId}
          placeholder="Search part #, description, type…"
        />

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="">All Types</option>
          {TRANSACTION_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>

        <select value={garageFilter} onChange={(e) => setGarageFilter(e.target.value)} style={selectStyle}>
          <option value="">All Garages</option>
          {garages.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ ...selectStyle, padding: "6px 8px" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ ...selectStyle, padding: "6px 8px" }}
          />
        </div>

        {hasFilters && (
          <button
            style={{ width: "auto", padding: "6px 12px", background: "#374151", fontSize: "0.8rem" }}
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}

        <span className="muted" style={{ marginLeft: "auto", fontSize: "0.85rem" }}>
          {visible.length} / {rows.length} entries
        </span>
      </div>

      <div className="card">
        {loading && <div className="muted">Loading...</div>}
        {error && <div style={{ color: "#ef4444" }}>{error}</div>}
        {!loading && !error && visible.length === 0 && (
          <div className="muted">{rows.length === 0 ? "No transactions recorded yet." : "No entries match the current filters."}</div>
        )}
        {!loading && !error && visible.length > 0 && (
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
                {visible.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(tx.createdAt)}</td>
                    <td><TypeBadge type={tx.type} /></td>
                    <td>{tx.garage.name}</td>
                    <td><strong>{tx.seatInsertType.partNumber}</strong></td>
                    <td>{tx.seatInsertType.description}</td>
                    <td style={{ textAlign: "right" }}>
                      <strong style={{ color: DEDUCT_TYPES.has(tx.type) ? "#ef4444" : "#10b981" }}>
                        {DEDUCT_TYPES.has(tx.type) ? `−${tx.quantity}` : `+${tx.quantity}`}
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
