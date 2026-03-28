import React from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { resolveAssetUrl } from "../utils/assetUrl";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Attachment {
  id: string;
  fileName: string;
  urlOrPath: string;
  previewImageUrl?: string | null;
  busTypeLabel?: string | null;
  fleetRangeLabel?: string | null;
}

interface SeatInsertInfo {
  id: string;
  partNumber: string;
  description: string;
  vendor: string;
  componentType?: string | null;
}

export interface Hotspot {
  id: string;
  catalogAttachmentId: string;
  seatLabel: string;
  partNumber: string;
  seatInsertTypeId?: string | null;
  x: number;  // 0..1
  y: number;
  width: number;
  height: number;
  shape: string;
  notes?: string | null;
  seatInsertType?: SeatInsertInfo | null;
}

// ─── Hotspot Details Side Panel ───────────────────────────────────────────────
function HotspotDetailsPanel({
  hotspot,
  onClose,
}: {
  hotspot: Hotspot;
  onClose: () => void;
}) {
  const si = hotspot.seatInsertType;
  return (
    <div style={{
      position: "absolute", top: 0, right: 0, bottom: 0, width: "min(340px, 90vw)",
      background: "#111827", borderLeft: "1px solid #374151",
      boxShadow: "-6px 0 24px rgba(0,0,0,0.5)",
      overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16,
      zIndex: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>Seat Hotspot</h3>
        <button
          style={{ width: "auto", padding: "3px 10px", background: "#374151", fontSize: "0.85rem" }}
          onClick={onClose}
        >✕</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Field label="Seat Label" value={hotspot.seatLabel} />
        <Field label="Part Number" value={hotspot.partNumber} />
        {si && (
          <>
            <Field label="Description" value={si.description} />
            <Field label="Vendor" value={si.vendor || "—"} />
            {si.componentType && (
              <div style={{ padding: "6px 10px", background: "#1f2937", borderRadius: 6 }}>
                <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: 3 }}>Component Type</div>
                <span style={{
                  background: si.componentType === "BACK" ? "#1e3a5f" : "#3b1d5f",
                  color: si.componentType === "BACK" ? "#60a5fa" : "#c084fc",
                  borderRadius: 4, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700,
                }}>{si.componentType}</span>
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              <Link
                to="/catalog"
                style={{
                  display: "inline-block", padding: "6px 14px",
                  background: "#1e3a5f", color: "#60a5fa",
                  borderRadius: 6, fontSize: "0.82rem", textDecoration: "none",
                }}
              >
                View in Catalog →
              </Link>
            </div>
          </>
        )}
        {hotspot.notes && (
          <Field label="Notes" value={hotspot.notes} />
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "6px 10px", background: "#1f2937", borderRadius: 6 }}>
      <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: "0.88rem" }}>{value}</div>
    </div>
  );
}

// ─── Hotspot Editor (admin drag-to-create) ────────────────────────────────────
function HotspotEditor({
  attachmentId,
  parts,
  onCreated,
}: {
  attachmentId: string;
  parts: SeatInsertInfo[];
  onCreated: (h: Hotspot) => void;
}) {
  const [drawing, setDrawing] = React.useState<{
    startX: number; startY: number; curX: number; curY: number;
  } | null>(null);
  const [modal, setModal] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [form, setForm] = React.useState({ seatLabel: "", partNumber: "", seatInsertTypeId: "", notes: "" });
  const [saving, setSaving] = React.useState(false);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  function toNorm(el: HTMLDivElement, clientX: number, clientY: number) {
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }

  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!overlayRef.current) return;
    const { x, y } = toNorm(overlayRef.current, e.clientX, e.clientY);
    setDrawing({ startX: x, startY: y, curX: x, curY: y });
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!drawing || !overlayRef.current) return;
    const { x, y } = toNorm(overlayRef.current, e.clientX, e.clientY);
    setDrawing((d) => d ? { ...d, curX: x, curY: y } : null);
  }

  function onMouseUp() {
    if (!drawing) return;
    const x = Math.min(drawing.startX, drawing.curX);
    const y = Math.min(drawing.startY, drawing.curY);
    const w = Math.abs(drawing.curX - drawing.startX);
    const h = Math.abs(drawing.curY - drawing.startY);
    setDrawing(null);
    if (w < 0.01 || h < 0.01) return; // Too small — ignore
    setModal({ x, y, w, h });
    setForm({ seatLabel: "", partNumber: "", seatInsertTypeId: "", notes: "" });
  }

  async function handleSave() {
    if (!modal || !form.seatLabel || !form.partNumber) return;
    setSaving(true);
    try {
      const res = await api.post(`/catalog/attachments/${attachmentId}/hotspots`, {
        seatLabel: form.seatLabel,
        partNumber: form.partNumber,
        seatInsertTypeId: form.seatInsertTypeId, // REQUIRED now in API
        x: modal.x, y: modal.y, width: modal.w, height: modal.h,
        notes: form.notes || null,
      });
      onCreated(res.data);
      setModal(null);
    } catch {
      alert("Failed to save hotspot.");
    } finally {
      setSaving(false);
    }
  }

  // Drawing rect preview (normalized → %)
  const drawRect = drawing ? {
    left: `${Math.min(drawing.startX, drawing.curX) * 100}%`,
    top: `${Math.min(drawing.startY, drawing.curY) * 100}%`,
    width: `${Math.abs(drawing.curX - drawing.startX) * 100}%`,
    height: `${Math.abs(drawing.curY - drawing.startY) * 100}%`,
  } : null;

  return (
    <>
      {/* Invisible drag layer */}
      <div
        ref={overlayRef}
        style={{
          position: "absolute", inset: 0, cursor: "crosshair", zIndex: 5,
          userSelect: "none",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />

      {/* Live rectangle preview while dragging */}
      {drawRect && (
        <div style={{
          position: "absolute", border: "2px dashed #ef4444", background: "rgba(239,68,68,0.08)",
          pointerEvents: "none", zIndex: 6,
          ...drawRect,
        }} />
      )}

      {/* Assign-part modal */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
        }}>
          <div style={{
            background: "#1f2937", border: "1px solid #374151", borderRadius: 10,
            padding: 24, width: 360, display: "flex", flexDirection: "column", gap: 14,
          }}>
            <h3 style={{ margin: 0 }}>Assign Seat Hotspot</h3>
            <label>
              <div style={{ fontSize: "0.82rem", marginBottom: 4, fontWeight: 600 }}>Seat Label *</div>
              <input
                value={form.seatLabel} onChange={(e) => setForm((f) => ({ ...f, seatLabel: e.target.value }))}
                placeholder="e.g. Row 3 Left" style={{ width: "100%" }}
              />
            </label>
            <label>
              <div style={{ fontSize: "0.82rem", marginBottom: 4, fontWeight: 600 }}>Part Number *</div>
              <input
                value={form.partNumber} onChange={(e) => setForm((f) => ({ ...f, partNumber: e.target.value }))}
                placeholder="e.g. 083345" style={{ width: "100%" }}
              />
            </label>
            <label>
              <div style={{ fontSize: "0.82rem", marginBottom: 4, fontWeight: 600 }}>Link to Catalog Part</div>
              <select
                required
                value={form.seatInsertTypeId}
                onChange={(e) => {
                  const sel = parts.find((p) => p.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    seatInsertTypeId: e.target.value,
                    partNumber: sel ? sel.partNumber : f.partNumber,
                  }));
                }}
                style={{ width: "100%", background: "#111827", color: "#f9fafb", borderRadius: 6, padding: "7px 10px", border: "1px solid #374151" }}
              >
                <option value="">— Select a part (optional) —</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>{p.partNumber} — {p.description.slice(0, 40)}</option>
                ))}
              </select>
            </label>
            <label>
              <div style={{ fontSize: "0.82rem", marginBottom: 4, fontWeight: 600 }}>Notes</div>
              <input
                value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional" style={{ width: "100%" }}
              />
            </label>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={{ width: "auto", background: "#374151" }} onClick={() => setModal(null)}>Cancel</button>
              <button style={{ width: "auto" }} disabled={saving || !form.seatLabel || !form.partNumber || !form.seatInsertTypeId} onClick={handleSave}>
                {saving ? "Saving…" : "Save Hotspot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DiagramViewerPage() {
  const { attachmentId } = useParams<{ attachmentId: string }>();

  const [attachment, setAttachment] = React.useState<Attachment | null>(null);
  const [hotspots, setHotspots] = React.useState<Hotspot[]>([]);
  const [parts, setParts] = React.useState<SeatInsertInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Hotspot | null>(null);
  const [editMode, setEditMode] = React.useState(false);
  
  // PDF Rendering States
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [loadingPdf, setLoadingPdf] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);

  const isAdmin = true; // TODO: wire from auth context if role-gating is needed

  React.useEffect(() => {
    if (!attachmentId) return;
    setLoading(true);

    Promise.all([
      api.get(`/catalog/attachments/${attachmentId}/hotspots`),
      api.get("/catalog"),
    ]).then(([hsRes, partsRes]) => {
      setHotspots(hsRes.data);
      setParts(partsRes.data);
    }).catch(() => setError("Failed to load diagram data."))
      .finally(() => setLoading(false));
  }, [attachmentId]);

  // Fetch attachment info directly by ID
  React.useEffect(() => {
    if (!attachmentId) return;
    api.get(`/catalog/attachments/${attachmentId}`)
      .then((res) => setAttachment(res.data))
      .catch(() => {/* non-fatal — viewer still works, just no label/preview */});
  }, [attachmentId]);

  function addHotspot(h: Hotspot) {
    setHotspots((prev) => [...prev, h]);
  }

  async function deleteHotspot(id: string) {
    if (!confirm("Delete this hotspot?")) return;
    await api.delete(`/catalog/hotspots/${id}`);
    setHotspots((prev) => prev.filter((h) => h.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  // Build image src: previewImageUrl is a path like "/api/diagram-previews/proterra..."
  const previewSrc = resolveAssetUrl(attachment?.previewImageUrl);
  const pdfUrl = resolveAssetUrl(attachment?.urlOrPath);

  // Render PDF when URL is ready
  React.useEffect(() => {
    if (!pdfUrl) return;

    let renderTask: any;
    let loadingTask: any;

    async function loadAndRenderPdf() {
      setLoadingPdf(true);
      setPdfError(null);
      
      try {
        // Dynamically import the core library from unpkg to bypass monorepo peer linkage issues
        // @ts-ignore
        const pdfjsLib = await import("https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.min.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

        loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err.name === "RenderingCancelledException") {
          // Expected on swap, safely ignore
        } else {
          console.error("PDF Render Error:", err);
          setPdfError(err.message || "Failed to render PDF diagram.");
        }
      } finally {
        setLoadingPdf(false);
      }
    }

    loadAndRenderPdf();

    return () => {
      // Cleanup previous render task before unmounting
      if (renderTask) renderTask.cancel();
      if (loadingTask) loadingTask.destroy();
    };
  }, [pdfUrl]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Interactive Diagram</h2>
          {attachment && (
            <div style={{ color: "#9ca3af", fontSize: "0.82rem", marginTop: 2 }}>
              {attachment.busTypeLabel} · Fleet {attachment.fleetRangeLabel}
            </div>
          )}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {pdfUrl && (
            <a
              href={pdfUrl} target="_blank" rel="noreferrer"
              style={{
                display: "inline-block", padding: "6px 14px", background: "#374151",
                color: "#f9fafb", borderRadius: 6, fontSize: "0.82rem", textDecoration: "none",
              }}
            >
              Open PDF ↗
            </a>
          )}
          {isAdmin && (
            <button
              style={{
                width: "auto", padding: "6px 14px", fontSize: "0.82rem",
                background: editMode ? "#ef4444" : "#1e3a5f",
              }}
              onClick={() => { setEditMode((e) => !e); setSelected(null); }}
            >
              {editMode ? "✕ Exit Edit Mode" : "✎ Edit Hotspots"}
            </button>
          )}
        </div>
      </div>

      {loading && <div className="muted">Loading diagram…</div>}
      {error && <div style={{ color: "#ef4444" }}>{error}</div>}

      {/* Diagram + overlay */}
      {!loading && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {editMode && (
            <div style={{
              background: "#1e3a5f", padding: "8px 16px", fontSize: "0.82rem", color: "#93c5fd",
              borderBottom: "1px solid #374151",
            }}>
              ✎ Edit mode — drag on the diagram to draw a hotspot rectangle
            </div>
          )}

          <div className="diagram-wrapper" style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
            <canvas ref={canvasRef} id="pdf-canvas" style={{ display: "block", maxWidth: "100%", height: "auto" }} />
            
            {loadingPdf && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.7)", color: "#9ca3af" }}>
                Rendering PDF…
              </div>
            )}
            {pdfError && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.9)", color: "#ef4444", padding: 20, textAlign: "center" }}>
                {pdfError}
              </div>
            )}

            <div className="hotspot-overlay" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
              {/* Hotspot rectangles */}
              {hotspots.map((h) => (
                <div
                  key={h.id}
                  title={`${h.seatLabel} — ${h.partNumber}`}
                  onClick={() => { if (!editMode) setSelected(h); }}
                  style={{
                    position: "absolute",
                    left: `${h.x * 100}%`,
                    top: `${h.y * 100}%`,
                    width: `${h.width * 100}%`,
                    height: `${h.height * 100}%`,
                    border: `2px solid ${selected?.id === h.id ? "#fbbf24" : "#3b82f6"}`,
                    background: selected?.id === h.id
                      ? "rgba(251,191,36,0.18)"
                      : "rgba(59,130,246,0.12)",
                    cursor: editMode ? "default" : "pointer",
                    boxSizing: "border-box",
                    borderRadius: 2,
                    zIndex: 4,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                  }}
                >
                  <span style={{
                    background: "rgba(17,24,39,0.75)", color: "#f9fafb",
                    fontSize: "0.6rem", padding: "1px 3px", lineHeight: 1.3, borderRadius: 2,
                    userSelect: "none", maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap",
                  }}>
                    {h.seatLabel}
                  </span>
                  {editMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteHotspot(h.id); }}
                      style={{
                        position: "absolute", top: 0, right: 0, width: "auto",
                        padding: "0 4px", fontSize: "0.6rem", lineHeight: 1.4,
                        background: "#ef4444", borderRadius: "0 0 0 4px",
                      }}
                      title="Delete hotspot"
                    >✕</button>
                  )}
                </div>
              ))}

              {/* Editor overlay (admin only, edit mode) */}
              {editMode && attachmentId && (
                <HotspotEditor
                  attachmentId={attachmentId}
                  parts={parts}
                  onCreated={addHotspot}
                />
              )}
            </div>

            {/* Detail panel */}
            {selected && !editMode && (
              <HotspotDetailsPanel
                hotspot={selected}
                onClose={() => setSelected(null)}
              />
            )}

          </div>
        </div>
      )}

      {/* Hotspot legend */}
      {!loading && hotspots.length > 0 && (
        <div className="card">
          <h4 style={{ margin: "0 0 10px" }}>Hotspot Legend</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {hotspots.map((h) => (
              <button
                key={h.id}
                style={{
                  width: "auto", padding: "4px 10px", fontSize: "0.78rem",
                  background: selected?.id === h.id ? "#1e3a5f" : "#1f2937",
                  border: `1px solid ${selected?.id === h.id ? "#3b82f6" : "#374151"}`,
                }}
                onClick={() => setSelected(selected?.id === h.id ? null : h)}
              >
                {h.seatLabel} · {h.partNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && hotspots.length === 0 && (
        <div className="muted" style={{ fontSize: "0.88rem" }}>
          {editMode
            ? "No hotspots yet — drag on the diagram to create the first one."
            : "No hotspots mapped for this diagram. Enable edit mode to add them."}
        </div>
      )}
    </div>
  );
}
