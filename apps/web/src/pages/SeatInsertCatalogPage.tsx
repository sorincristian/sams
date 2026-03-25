import React from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { CatalogAutocomplete } from "../components/CatalogAutocomplete";

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
  manufacturerPartNumber?: string;
  alternatePartNumbers?: string[];
  componentType?: string | null;
  trimSpec?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BusCompat {
  id: string;
  busTypeLabel: string;
  manufacturer: string;
  modelFamily?: string | null;
  propulsion?: string | null;
  fleetRangeLabel: string;
  fleetRangeStart?: number | null;
  fleetRangeEnd?: number | null;
  attachments: CatalogAttach[];
}

interface CatalogAttach {
  id: string;
  fileName: string;
  fileType: string;
  attachmentType: string;
  urlOrPath: string;
  previewImageUrl?: string | null;
  busTypeLabel?: string | null;
  fleetRangeLabel?: string | null;
  notes?: string | null;
}

interface PartDetail extends CatalogPart {
  busCompatibilities: BusCompat[];
  catalogAttachments: CatalogAttach[];
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

// ============================================================
// Add/Edit Modal
// ============================================================
function PartModal({ initial, onClose, onSaved }: {
  initial: CatalogPart | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = React.useState(initial ? {
    partNumber: initial.partNumber, description: initial.description,
    vendor: initial.vendor, compatibleBusModels: initial.compatibleBusModels ?? "",
    minStockLevel: initial.minStockLevel, reorderPoint: initial.reorderPoint,
    unitCost: initial.unitCost, active: initial.active,
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function set(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSaving(true);
    try {
      if (initial) await api.put(`/catalog/${initial.id}`, form);
      else await api.post("/catalog", form);
      onSaved();
    } catch (err: any) { setError(err?.response?.data?.message ?? "Save failed."); }
    finally { setSaving(false); }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginBottom: 16 }}>{initial ? "Edit Part" : "Add New Part"}</h3>
        {error && <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label><div style={labelStyle}>Part Number *</div>
              <input value={form.partNumber} onChange={(e) => set("partNumber", e.target.value)} required style={{ width: "100%" }} /></label>
            <label><div style={labelStyle}>Vendor</div>
              <input value={form.vendor} onChange={(e) => set("vendor", e.target.value)} style={{ width: "100%" }} /></label>
          </div>
          <label><div style={labelStyle}>Description *</div>
            <input value={form.description} onChange={(e) => set("description", e.target.value)} required style={{ width: "100%" }} /></label>
          <label><div style={labelStyle}>Compatible Bus Models</div>
            <input value={form.compatibleBusModels} onChange={(e) => set("compatibleBusModels", e.target.value)} style={{ width: "100%" }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label><div style={labelStyle}>Min Stock</div>
              <input type="number" min={0} value={form.minStockLevel} onChange={(e) => set("minStockLevel", Number(e.target.value))} style={{ width: "100%" }} /></label>
            <label><div style={labelStyle}>Reorder At</div>
              <input type="number" min={0} value={form.reorderPoint} onChange={(e) => set("reorderPoint", Number(e.target.value))} style={{ width: "100%" }} /></label>
            <label><div style={labelStyle}>Unit Cost ($)</div>
              <input type="number" min={0} step={0.01} value={form.unitCost} onChange={(e) => set("unitCost", Number(e.target.value))} style={{ width: "100%" }} /></label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
            <span>Active</span>
          </label>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" style={{ width: "auto", background: "#374151" }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ width: "auto" }} disabled={saving}>{saving ? "Saving..." : initial ? "Save Changes" : "Create Part"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Detail Panel (slide in from right conceptually, render inline)
// ============================================================
function DetailPanel({ partId, onClose }: { partId: string; onClose: () => void }) {
  const [detail, setDetail] = React.useState<PartDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    api.get(`/catalog/${partId}/detail`)
      .then((r) => setDetail(r.data))
      .finally(() => setLoading(false));
  }, [partId]);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 95vw)",
      background: "#111827", borderLeft: "1px solid #374151",
      boxShadow: "-8px 0 32px rgba(0,0,0,0.5)", zIndex: 900,
      overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Part Detail</h3>
        <button style={{ width: "auto", padding: "4px 12px", background: "#374151" }} onClick={onClose}>✕ Close</button>
      </div>

      {loading && <div className="muted">Loading...</div>}

      {!loading && detail && (
        <>
          {/* Part fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
            {[
              { label: "Part Number", value: detail.partNumber },
              { label: "Vendor", value: detail.vendor || "—" },
              { label: "Manufacturer Part #", value: detail.manufacturerPartNumber || "—" },
              { label: "Component Type", value: detail.componentType || "—" },
              { label: "Trim Spec", value: detail.trimSpec || "—" },
              { label: "Min Stock", value: String(detail.minStockLevel) },
              { label: "Reorder At", value: String(detail.reorderPoint) },
              { label: "Unit Cost", value: `$${Number(detail.unitCost).toFixed(2)}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: "8px 10px", background: "#1f2937", borderRadius: 6 }}>
                <div className="muted" style={{ fontSize: "0.72rem", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: "0.88rem" }}>{value}</div>
              </div>
            ))}
            {(detail.alternatePartNumbers?.length ?? 0) > 0 && (
              <div style={{ gridColumn: "1 / -1", padding: "8px 10px", background: "#1f2937", borderRadius: 6 }}>
                <div className="muted" style={{ fontSize: "0.72rem", marginBottom: 4 }}>Alternate Part Numbers</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {detail.alternatePartNumbers!.map((p) => (
                    <span key={p} style={{ background: "#374151", borderRadius: 4, padding: "2px 8px", fontSize: "0.8rem" }}>{p}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ gridColumn: "1 / -1", padding: "8px 10px", background: "#1f2937", borderRadius: 6 }}>
              <div className="muted" style={{ fontSize: "0.72rem", marginBottom: 2 }}>Description</div>
              <div style={{ fontSize: "0.88rem" }}>{detail.description}</div>
            </div>
          </div>

          {/* Compatible Bus Fleets */}
          <div>
            <h4 style={{ marginBottom: 10, color: "#60a5fa" }}>Compatible Bus Fleets</h4>
            {detail.busCompatibilities.length === 0 ? (
              <div className="muted" style={{ fontSize: "0.85rem" }}>No compatibility data imported yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Manufacturer</th>
                      <th>Model</th>
                      <th>Propulsion</th>
                      <th>Fleet Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.busCompatibilities.map((c) => (
                      <tr key={c.id}>
                        <td>{c.manufacturer}</td>
                        <td>{c.modelFamily ?? "—"}</td>
                        <td>{c.propulsion ?? "—"}</td>
                        <td><strong>{c.fleetRangeLabel}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PDF Diagrams via compatibility */}
          {(() => {
            const allAttachments: (CatalogAttach & { via?: string })[] = [
              ...detail.catalogAttachments.map((a) => ({ ...a, via: "direct" })),
              ...detail.busCompatibilities.flatMap((c) =>
                c.attachments.map((a) => ({ ...a, via: c.fleetRangeLabel }))
              ),
            ];
            const unique = allAttachments.filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i);

            if (unique.length === 0) return (
              <div>
                <h4 style={{ marginBottom: 10, color: "#60a5fa" }}>Attached Diagrams</h4>
                <div className="muted" style={{ fontSize: "0.85rem" }}>No PDF diagrams linked yet.</div>
              </div>
            );

            return (
              <div>
                <h4 style={{ marginBottom: 10, color: "#60a5fa" }}>Attached Diagrams ({unique.length})</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {unique.map((att) => (
                    <div key={att.id} style={{ background: "#1f2937", borderRadius: 6, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>📄 {att.fileName}</div>
                        <div className="muted" style={{ fontSize: "0.75rem", marginTop: 2 }}>
                          {att.busTypeLabel} · {att.fleetRangeLabel}
                          {att.via && att.via !== "direct" && ` · via fleet ${att.via}`}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {att.previewImageUrl && (
                          <Link
                            to={`/diagram/${att.id}`}
                            style={{
                              display: "inline-block", padding: "4px 10px",
                              background: "#1e3a5f", color: "#93c5fd", borderRadius: 4,
                              fontSize: "0.78rem", textDecoration: "none", whiteSpace: "nowrap",
                            }}
                          >
                            🗺 Interactive
                          </Link>
                        )}
                        <a
                          href={att.urlOrPath}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-block", padding: "4px 10px",
                            background: "#2563eb", color: "#fff", borderRadius: 4,
                            fontSize: "0.78rem", textDecoration: "none", whiteSpace: "nowrap",
                          }}
                        >
                          Open ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ============================================================
// Main CatalogPage
// ============================================================
export function SeatInsertCatalogPage() {
  const [parts, setParts] = React.useState<CatalogPart[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<CatalogPart | null | "new">(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [selectedPartId, setSelectedPartId] = React.useState<string | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("active");

  function load() {
    setLoading(true);
    api.get("/catalog").then((res) => setParts(res.data)).finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, []);

  const visible = React.useMemo(() => {
    let out = parts;
    if (selectedPartId) {
      out = out.filter((p) => p.id === selectedPartId);
    } else {
      const q = search.toLowerCase().trim();
      if (q) out = out.filter((p) =>
        p.partNumber.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.vendor ?? "").toLowerCase().includes(q)
      );
    }
    if (activeFilter === "active") out = out.filter((p) => p.active);
    if (activeFilter === "inactive") out = out.filter((p) => !p.active);
    return out;
  }, [parts, search, activeFilter, selectedPartId]);

  function handleSaved() { setEditing(null); load(); }

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

      <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <CatalogAutocomplete
          catalogParts={parts}
          queryLocal={search}
          setQueryLocal={setSearch}
          selectedPartId={selectedPartId}
          setSelectedPartId={setSelectedPartId}
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
        {loading ? <div className="muted">Loading...</div> :
          visible.length === 0 ? (
            <div className="muted">{parts.length === 0 ? "No parts in catalog yet." : "No parts match the current filters."}</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Part #</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Vendor</th>
                    <th style={{ textAlign: "right" }}>Min Stock</th>
                    <th style={{ textAlign: "right" }}>Unit Cost</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((part) => (
                    <tr key={part.id} style={{ opacity: part.active ? 1 : 0.5 }}>
                      <td>
                        <button
                          style={{ background: "none", border: "none", color: "#60a5fa", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "inherit" }}
                          onClick={() => setDetailId(part.id)}
                          title="View detail"
                        >
                          {part.partNumber}
                        </button>
                      </td>
                      <td>{part.description}</td>
                      <td>
                        {part.componentType ? (
                          <span style={{
                            background: part.componentType === "BACK" ? "#1e3a5f" : "#3b1d5f",
                            color: part.componentType === "BACK" ? "#60a5fa" : "#c084fc",
                            borderRadius: 4, padding: "1px 7px", fontSize: "0.72rem", fontWeight: 700,
                          }}>{part.componentType}</span>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td>{part.vendor || <span className="muted">—</span>}</td>
                      <td style={{ textAlign: "right" }}>{part.minStockLevel}</td>
                      <td style={{ textAlign: "right" }}>${Number(part.unitCost).toFixed(2)}</td>
                      <td>
                        <span style={{
                          background: part.active ? "#16a34a" : "#374151",
                          color: "#fff", borderRadius: 4, padding: "2px 8px",
                          fontSize: "0.75rem", fontWeight: 700,
                        }}>{part.active ? "ACTIVE" : "INACTIVE"}</span>
                      </td>
                      <td style={{ display: "flex", gap: 6 }}>
                        <button style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem", background: "#374151" }}
                          onClick={() => setEditing(part)}>Edit</button>
                        <button style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem", background: "#1e3a5f" }}
                          onClick={() => setDetailId(part.id)}>Detail</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {editing !== null && (
        <PartModal initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}

      {detailId && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 899 }}
            onClick={() => setDetailId(null)}
          />
          <DetailPanel partId={detailId} onClose={() => setDetailId(null)} />
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { marginBottom: 4, fontWeight: 600, fontSize: "0.85rem" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modalStyle: React.CSSProperties = { background: "#1f2937", border: "1px solid #374151", borderRadius: 10, padding: 28, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" };
