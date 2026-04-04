import React from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { resolveAssetUrl } from "../utils/assetUrl";
import { CatalogAutocomplete } from "../components/CatalogAutocomplete";
import { SeatInsertImportWizard } from "../components/SeatInsertImportWizard";

interface CatalogPart {
  id: string;
  partNumber: string;
  description: string;
  vendor: string;
  compatibleBusModels: string;
  minStockLevel: number;
  reorderPoint: number;
  unitCost?: number;
  active: boolean;
  manufacturerPartNumber?: string;
  alternatePartNumbers?: string[];
  componentType?: string | null;
  trimSpec?: string | null;
  createdAt: string;
  updatedAt: string;
  busRanges?: string[];
  _count?: { catalogAttachments: number };
  catalogAttachments?: { id: string; attachmentType: string; isPrimary: boolean; previewImageUrl?: string | null; urlOrPath?: string }[];
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
  isPrimary: boolean;
}

interface BomComp {
  id: string;
  requiredQty: number;
  childComponent: CatalogPart;
}

interface PartDetail extends CatalogPart {
  busCompatibilities: BusCompat[];
  catalogAttachments: CatalogAttach[];
  components: BomComp[];
}

const EMPTY_FORM = {
  partNumber: "",
  description: "",
  vendor: "",
  compatibleBusModels: "",
  minStockLevel: 0,
  reorderPoint: 0,
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
    active: initial.active,
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
        <h3 style={{ marginBottom: 16, color: "#f1f5f9" }}>{initial ? "Edit Part" : "Add New Part"}</h3>
        {error && <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label><div style={labelStyle}>Part Number *</div>
              <input className="placeholder-slate-400" value={form.partNumber} onChange={(e) => set("partNumber", e.target.value)} required style={inputStyle} /></label>
            <label><div style={labelStyle}>Vendor</div>
              <input className="placeholder-slate-400" value={form.vendor} onChange={(e) => set("vendor", e.target.value)} style={inputStyle} /></label>
          </div>
          <label><div style={labelStyle}>Description *</div>
            <input className="placeholder-slate-400" value={form.description} onChange={(e) => set("description", e.target.value)} required style={inputStyle} /></label>
          <label><div style={labelStyle}>Compatible Bus Models</div>
            <input className="placeholder-slate-400" value={form.compatibleBusModels} onChange={(e) => set("compatibleBusModels", e.target.value)} style={inputStyle} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label><div style={labelStyle}>Min Stock</div>
              <input className="placeholder-slate-400" type="number" min={0} value={form.minStockLevel} onChange={(e) => set("minStockLevel", Number(e.target.value))} style={inputStyle} /></label>
            <label><div style={labelStyle}>Reorder At</div>
              <input className="placeholder-slate-400" type="number" min={0} value={form.reorderPoint} onChange={(e) => set("reorderPoint", Number(e.target.value))} style={inputStyle} /></label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "#f1f5f9" }}>
            <input className="placeholder-slate-400" type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
            <span>Active</span>
          </label>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" style={{ width: "auto", background: "#374151", color: "#f1f5f9" }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ width: "auto", color: "#f1f5f9" }} disabled={saving}>{saving ? "Saving..." : initial ? "Save Changes" : "Create Part"}</button>
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
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: "8px 10px", background: "#1f2937", borderRadius: 6 }}>
                <div className="muted" style={{ fontSize: "0.72rem", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: "0.88rem" }}>{value}</div>
              </div>
            ))}
            {(detail.busRanges?.length ?? 0) > 0 && (
              <div style={{ gridColumn: "1 / -1", padding: "8px 10px", background: "#1f2937", borderRadius: 6 }}>
                <div style={{ fontSize: "0.72rem", marginBottom: 4, color: "#60a5fa", fontWeight: 600 }}>Fleet Ranges</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {detail.busRanges!.map((p) => (
                    <span key={p} style={{ background: "#1e3a5f", color: "#60a5fa", borderRadius: 4, padding: "2px 8px", fontSize: "0.8rem", fontWeight: 600 }}>{p}</span>
                  ))}
                </div>
              </div>
            )}
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

          {/* BOM Breakdown */}
          {(!detail.components || detail.components.length === 0) ? (
            <div style={{ marginTop: 24, borderTop: "1px solid #374151", paddingTop: 16 }}>
              <h4 style={{ marginBottom: 16, color: "#60a5fa", display: "flex", gap: 8, alignItems: "center" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#38bdf8" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                BOM Breakdown
              </h4>
              <div className="muted" style={{ fontSize: "0.85rem", background: "#1f2937", padding: "16px", borderRadius: 8, textAlign: "center" }}>
                No BOM components linked.
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 24, borderTop: "1px solid #374151", paddingTop: 16 }}>
              <h4 style={{ marginBottom: 16, color: "#60a5fa", display: "flex", gap: 8, alignItems: "center" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#38bdf8" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                BOM Breakdown
              </h4>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Part Number</th>
                      <th style={{ textAlign: "left" }}>Description</th>
                      <th style={{ textAlign: "right" }}>Required Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.components.map((comp) => (
                      <tr key={comp.id}>
                        <td>
                          <button
                            style={{ background: "none", border: "none", color: "#60a5fa", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "inherit" }}
                            onClick={() => {
                               navigator.clipboard.writeText(comp.childComponent.partNumber);
                            }}
                            title="Click to copy"
                          >
                            {comp.childComponent.partNumber}
                          </button>
                          {comp.childComponent.busRanges && comp.childComponent.busRanges.length > 0 && (
                            <div className="muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>
                              Used in fleets: {comp.childComponent.busRanges.join(", ")}
                            </div>
                          )}
                        </td>
                        <td>{comp.childComponent.description}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>Qty {comp.requiredQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Compatible Bus Fleets */}
          <div style={{ marginTop: 24, borderTop: "1px solid #374151", paddingTop: 16 }}>
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

          {(() => {
            const allAttachments: (CatalogAttach & { via?: string })[] = [
              ...detail.catalogAttachments.map((a) => ({ ...a, via: "direct" })),
              ...detail.busCompatibilities.flatMap((c) =>
                c.attachments.map((a) => ({ ...a, via: c.fleetRangeLabel }))
              ),
            ];
            const unique = allAttachments.filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i);

            if (unique.length === 0) return (
              <div style={{ marginTop: 24, borderTop: "1px solid #374151", paddingTop: 16 }}>
                <h4 style={{ marginBottom: 10, color: "#60a5fa", display: "flex", gap: 8, alignItems: "center" }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                  Attached Diagrams
                </h4>
                <div className="muted" style={{ fontSize: "0.85rem", background: "#1f2937", padding: "16px", borderRadius: 8, textAlign: "center" }}>No PDF diagrams linked yet.</div>
              </div>
            );

            // Group by Fleet Range
            const grouped = unique.reduce((acc, att) => {
               const label = att.fleetRangeLabel || att.via || "General / Base Configuration";
               if (!acc[label]) acc[label] = [];
               acc[label].push(att);
               return acc;
            }, {} as Record<string, typeof unique>);

            return (
              <div style={{ marginTop: 24, borderTop: "1px solid #374151", paddingTop: 16 }}>
                <h4 style={{ marginBottom: 16, color: "#60a5fa", display: "flex", gap: 8, alignItems: "center" }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#38bdf8" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Diagrams & Schematics ({unique.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {Object.entries(grouped).map(([rangeLabel, atts]) => (
                    <div key={rangeLabel} style={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, overflow: "hidden" }}>
                       <div style={{ background: "#1f2937", padding: "8px 12px", borderBottom: "1px solid #374151", fontSize: "0.85rem", fontWeight: 700, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ display: "inline-block", background: "#38bdf8", width: 6, height: 6, borderRadius: "50%" }}></span>
                          Fleet Range: {rangeLabel}
                       </div>
                       <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
                          {atts.map((att) => (
                            <div key={att.id} style={{ background: "#1e293b", border: "1px solid #475569", borderRadius: 6, padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={att.fileName}>
                                  {att.fileName}
                                </div>
                                <div className="muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>
                                  Document ID: {att.id}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
                                <a
                                  href={resolveAssetUrl(att.urlOrPath) || ""}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                                    background: "#2563eb", color: "#fff", borderRadius: 6,
                                    fontSize: "0.85rem", fontWeight: 600, textDecoration: "none",
                                    boxShadow: "0 2px 4px rgba(37,99,235,0.2)", width: "100%", justifyContent: "center"
                                  }}
                                >
                                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                  Open PDF
                                </a>
                              </div>
                            </div>
                          ))}
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
  const [showImport, setShowImport] = React.useState(false);

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
        (p.vendor ?? "").toLowerCase().includes(q) ||
        (p.busRanges?.some(r => r.toLowerCase().includes(q)))
      );
    }
    if (activeFilter === "active") out = out.filter((p) => p.active);
    if (activeFilter === "inactive") out = out.filter((p) => !p.active);
    return out;
  }, [parts, search, activeFilter, selectedPartId]);

  function handleSaved() { setEditing(null); load(); }

  const selectStyle: React.CSSProperties = {
    background: "#0f172a", color: "#ffffff", border: "1px solid #334155",
    borderRadius: 6, padding: "7px 10px", outline: "none"
  };

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Seat Insert Catalog</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <button style={{ width: "auto", padding: "6px 16px", background: "#374151" }} onClick={() => setShowImport(true)}>
            Import Catalog
          </button>
          <button style={{ width: "auto", padding: "6px 16px" }} onClick={() => setEditing("new")}>
            + Add Part
          </button>
        </div>
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
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Diagrams</th>
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
                      <td>
                        {part.description}
                        {part.busRanges && part.busRanges.length > 0 && (
                          <div className="muted" style={{ fontSize: "0.75rem", marginTop: 4, color: "#38bdf8" }}>
                            Used in fleets: {part.busRanges.join(", ")}
                          </div>
                        )}
                      </td>
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
                      <td>
                        <span style={{
                          background: part.active ? "#16a34a" : "#374151",
                          color: "#fff", borderRadius: 4, padding: "2px 8px",
                          fontSize: "0.75rem", fontWeight: 700,
                        }}>{part.active ? "ACTIVE" : "INACTIVE"}</span>
                      </td>
                      <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                        {(() => {
                          const diagramsCount = part._count?.catalogAttachments || 0;
                          if (diagramsCount === 0) return <span className="muted" style={{ fontSize: "0.8rem" }}>No diagram</span>;
                          const thumb = part.catalogAttachments?.[0]?.previewImageUrl;
                          return (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                              {thumb ? (
                                <img src={thumb} alt="Diagram Thumbnail" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover", border: "1px solid #374151" }} />
                              ) : (
                                <div style={{ width: 28, height: 28, borderRadius: 4, background: "#1f2937", border: "1px solid #374151", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem", color: "#60a5fa", fontWeight: 700 }}>
                                  MAP
                                </div>
                              )}
                              <span style={{ background: "#2563eb", color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 700 }}>
                                {diagramsCount} Map{diagramsCount > 1 ? "s" : ""}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem", background: "#374151" }}
                          onClick={() => setEditing(part)}>Edit</button>
                        <Link to={`/catalog/${part.id}`} style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem", background: "#1e3a5f", color: "#fff", textDecoration: "none", borderRadius: 6 }}>
                          Detail
                        </Link>
                        {(() => {
                          const primary = part.catalogAttachments?.[0];
                          if (primary) {
                            return (
                              <Link to={`/catalog/${part.id}/diagram/${primary.id}`} style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem", background: "#0ea5e9", color: "#fff", textDecoration: "none", borderRadius: 6 }}>
                                View Diagram
                              </Link>
                            );
                          } else {
                            return (
                              <button disabled style={{ width: "auto", padding: "4px 10px", fontSize: "0.8rem", background: "#1f2937", color: "#6b7280", cursor: "not-allowed" }}>
                                View Diagram
                              </button>
                            );
                          }
                        })()}
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

      {showImport && (
        <SeatInsertImportWizard
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); load(); }}
        />
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { marginBottom: 4, fontWeight: 600, fontSize: "0.85rem", color: "#f1f5f9" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modalStyle: React.CSSProperties = { background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: 28, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" };
const inputStyle: React.CSSProperties = { width: "100%", background: "#0f172a", color: "#ffffff", border: "1px solid #334155", padding: "8px", borderRadius: 6, outline: "none" };
