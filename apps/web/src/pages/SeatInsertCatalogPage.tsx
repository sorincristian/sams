import React from "react";
import { api } from "../api";

interface CatalogPart {
  id: string;
  partNumber: string;
  description: string;
  vendor: string;
  compatibleBusModels: string;
  minStockLevel: number;
  reorderPoint: number;
  unitCost: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_FORM = {
  partNumber: "",
  description: "",
  vendor: "",
  compatibleBusModels: "",
  minStockLevel: 0,
  reorderPoint: 0,
  unitCost: 0,
  active: true,
};

function PartModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: CatalogPart | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState(
    initial
      ? {
          partNumber: initial.partNumber,
          description: initial.description,
          vendor: initial.vendor,
          compatibleBusModels: initial.compatibleBusModels,
          minStockLevel: initial.minStockLevel,
          reorderPoint: initial.reorderPoint,
          unitCost: initial.unitCost,
          active: initial.active,
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function set(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (initial) {
        await api.put(`/catalog/${initial.id}`, form);
      } else {
        await api.post("/catalog", form);
      }
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginBottom: 16 }}>{initial ? "Edit Part" : "Add New Part"}</h3>
        {error && <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <div style={labelStyle}>Part Number *</div>
              <input value={form.partNumber} onChange={(e) => set("partNumber", e.target.value)} required style={{ width: "100%" }} />
            </label>
            <label>
              <div style={labelStyle}>Vendor</div>
              <input value={form.vendor} onChange={(e) => set("vendor", e.target.value)} style={{ width: "100%" }} />
            </label>
          </div>

          <label>
            <div style={labelStyle}>Description *</div>
            <input value={form.description} onChange={(e) => set("description", e.target.value)} required style={{ width: "100%" }} />
          </label>

          <label>
            <div style={labelStyle}>Compatible Bus Models</div>
            <input
              value={form.compatibleBusModels}
              onChange={(e) => set("compatibleBusModels", e.target.value)}
              placeholder="e.g. Orion VII, Nova LFS"
              style={{ width: "100%" }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label>
              <div style={labelStyle}>Min Stock Level</div>
              <input type="number" min={0} value={form.minStockLevel} onChange={(e) => set("minStockLevel", Number(e.target.value))} style={{ width: "100%" }} />
            </label>
            <label>
              <div style={labelStyle}>Reorder Point</div>
              <input type="number" min={0} value={form.reorderPoint} onChange={(e) => set("reorderPoint", Number(e.target.value))} style={{ width: "100%" }} />
            </label>
            <label>
              <div style={labelStyle}>Unit Cost ($)</div>
              <input type="number" min={0} step={0.01} value={form.unitCost} onChange={(e) => set("unitCost", Number(e.target.value))} style={{ width: "100%" }} />
            </label>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
            <span>Active</span>
            <span className="muted" style={{ fontSize: "0.8rem" }}>(inactive parts are hidden from issue/receive workflows)</span>
          </label>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" style={{ width: "auto", background: "#374151" }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ width: "auto" }} disabled={saving}>
              {saving ? "Saving..." : initial ? "Save Changes" : "Create Part"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SeatInsertCatalogPage() {
  const [parts, setParts] = React.useState<CatalogPart[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<CatalogPart | null | "new">(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("active");

  function load() {
    setLoading(true);
    api.get("/catalog")
      .then((res) => setParts(res.data))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, []);

  const visible = React.useMemo(() => {
    let out = parts;
    const q = search.toLowerCase().trim();
    if (q) {
      out = out.filter(
        (p) =>
          p.partNumber.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.vendor.toLowerCase().includes(q)
      );
    }
    if (activeFilter === "active") out = out.filter((p) => p.active);
    if (activeFilter === "inactive") out = out.filter((p) => !p.active);
    return out;
  }, [parts, search, activeFilter]);

  function handleSaved() {
    setEditing(null);
    load();
  }

  const selectStyle: React.CSSProperties = {
    background: "#111827", color: "#f9fafb", border: "1px solid #374151",
    borderRadius: 6, padding: "7px 10px",
  };

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Seat Insert Catalog</h1>
        <button style={{ width: "auto", padding: "6px 16px", marginLeft: "auto" }} onClick={() => setEditing("new")}>
          + Add Part
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search part #, description, vendor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 220px", minWidth: 180 }}
        />
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as any)} style={selectStyle}>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
          <option value="all">All parts</option>
        </select>
        <span className="muted" style={{ marginLeft: "auto", fontSize: "0.85rem" }}>
          {visible.length} / {parts.length} parts
        </span>
      </div>

      <div className="card">
        {loading ? (
          <div className="muted">Loading...</div>
        ) : visible.length === 0 ? (
          <div className="muted">{parts.length === 0 ? "No parts in catalog yet." : "No parts match the current filters."}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Part #</th>
                  <th>Description</th>
                  <th>Vendor</th>
                  <th>Compatible Models</th>
                  <th style={{ textAlign: "right" }}>Min Stock</th>
                  <th style={{ textAlign: "right" }}>Reorder At</th>
                  <th style={{ textAlign: "right" }}>Unit Cost</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((part) => (
                  <tr key={part.id} style={{ opacity: part.active ? 1 : 0.5 }}>
                    <td><strong>{part.partNumber}</strong></td>
                    <td>{part.description}</td>
                    <td>{part.vendor || <span className="muted">—</span>}</td>
                    <td className="muted" style={{ fontSize: "0.82rem" }}>{part.compatibleBusModels || "—"}</td>
                    <td style={{ textAlign: "right" }}>{part.minStockLevel}</td>
                    <td style={{ textAlign: "right" }}>{part.reorderPoint}</td>
                    <td style={{ textAlign: "right" }}>${Number(part.unitCost).toFixed(2)}</td>
                    <td>
                      <span style={{
                        background: part.active ? "#16a34a" : "#374151",
                        color: "#fff", borderRadius: 4, padding: "2px 8px",
                        fontSize: "0.75rem", fontWeight: 700,
                      }}>
                        {part.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td>
                      <button
                        style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem", background: "#374151" }}
                        onClick={() => setEditing(part)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== null && (
        <PartModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { marginBottom: 4, fontWeight: 600, fontSize: "0.85rem" };

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "#1f2937", border: "1px solid #374151", borderRadius: 10,
  padding: 28, width: "100%", maxWidth: 600,
  maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};
