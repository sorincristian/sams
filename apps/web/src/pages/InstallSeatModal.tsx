import React from "react";
import { api } from "../api";

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  bus: { id: string; fleetNumber: string; garageId: string; garage: { name: string } };
}

interface SeatInsertType {
  id: string;
  partNumber: string;
  description: string;
}

interface SeatInsert {
  id: string;
  stockClass: string;
  locationId: string;
  installedBusId: string | null;
  seatInsertTypeId: string;
  seatInsertType?: SeatInsertType;
}

interface Props {
  workOrderId: string;
  onClose: () => void;
  onDone: () => void;
}

export function InstallSeatModal({ workOrderId, onClose, onDone }: Props) {
  const [wo, setWo] = React.useState<WorkOrder | null>(null);
  
  // Available pool grouped by type
  const [availableTypes, setAvailableTypes] = React.useState<{ type: SeatInsertType; count: number }[]>([]);
  
  const [installedSeats, setInstalledSeats] = React.useState<SeatInsert[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [selectedTypeId, setSelectedTypeId] = React.useState("");
  const [selectedRemovedSeatId, setSelectedRemovedSeatId] = React.useState("");
  const [removeDisposition, setRemoveDisposition] = React.useState<"DIRTY_RECOVERY" | "SCRAPPED">("DIRTY_RECOVERY");
  const [removeReason, setRemoveReason] = React.useState("OTHER");

  React.useEffect(() => {
    async function load() {
      try {
        const woRes = await api.get(`/work-orders/${workOrderId}`);
        const activeWo = woRes.data;
        setWo(activeWo);

        // 1. Fetch entire catalog unconditionally
        const catalogRes = await api.get("/catalog");
        const fullCatalog: SeatInsertType[] = catalogRes.data || [];

        // 2. Fetch specific replacement pool locally
        const seatsRes = await api.get(`/seat-inserts/items?locationId=${activeWo.bus.garageId}&stockClass=REPLACEMENT_AVAILABLE`);
        const pool: SeatInsert[] = seatsRes.data || [];

        // 3. Guarantee all catalog items exist in the dropdown, even if count is 0
        const grouped = fullCatalog.map(part => {
          const matchCount = pool.filter(s => s.seatInsertTypeId === part.id).length;
          return { type: part, count: matchCount };
        });
        
        setAvailableTypes(grouped);

        // Fetch installed seats globally for the removals
        const allGlobalSeatsRes = await api.get(`/seat-inserts/items?stockClass=INSTALLED`);
        const allGlobalSeats: SeatInsert[] = allGlobalSeatsRes.data || [];
        const currentlyInstalled = allGlobalSeats.filter(s => s.installedBusId === activeWo.bus.id);

        setInstalledSeats(currentlyInstalled);

        // Sane defaults
        if (grouped.length > 0) setSelectedTypeId(grouped[0].type.id);
        if (currentlyInstalled.length > 0) setSelectedRemovedSeatId(currentlyInstalled[0].id);

      } catch (e: any) {
        setError("Failed to load installation context.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workOrderId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTypeId) return setError("Must select a seat type to replace.");
    if (!wo) return;

    setSubmitting(true);
    setError(null);
    try {
      // Send seatInsertTypeId as the route param now, matching Phase 2 backend
      await api.post(`/seat-inserts/${selectedTypeId}/install`, {
        garageId: wo.bus.garageId,
        busId: wo.bus.id,
        workOrderId: wo.id,
        removedInsertId: selectedRemovedSeatId || undefined,
        removedDisposition: selectedRemovedSeatId ? removeDisposition : undefined,
        removedReason: selectedRemovedSeatId ? removeReason : undefined
      });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to install seat.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle} className="text-center p-10 text-slate-400">Loading replacement pool logic...</div>
      </div>
    );
  }

  const selectedPool = availableTypes.find(t => t.type.id === selectedTypeId);
  const availableCount = selectedPool?.count || 0;
  
  // Logic blocks
  const isZero = availableCount === 0;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginBottom: 4, fontSize: "1.2rem", fontWeight: 700 }}>Seat Swap Utility</h3>
        <p className="muted" style={{ marginBottom: 20, fontSize: "0.9rem" }}>
          Bus {wo?.bus.fleetNumber} • {wo?.bus.garage.name}
        </p>

        {error && <div style={{ color: "#ef4444", marginBottom: 12, padding: "8px 12px", background: "#fee2e2", borderRadius: 6, fontSize: "0.9rem" }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* New Seat / Pool Selection */}
          <div style={{ background: "#111827", padding: 16, borderRadius: 8, border: "1px solid #374151" }}>
            <label style={{ display: "flex", marginBottom: 8, fontWeight: 600, color: "#10b981", alignItems: 'center', gap: 6 }}>
              <span style={{ background: "#10b981", color: "#fff", width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>1</span>
              Replacement Pool Selection
            </label>
            
            {availableTypes.length === 0 ? (
              <div style={{ color: "#ef4444", background: "#7f1d1d20", padding: "12px", borderRadius: 6, fontSize: "0.9rem", marginTop: 8 }}>
                <strong>Removal blocked: no local replacement available.</strong><br/>
                Wait for a Harvey return or a new order shipment to restock.
              </div>
            ) : (
              <>
                <select 
                  value={selectedTypeId} 
                  onChange={e => setSelectedTypeId(e.target.value)}
                  style={selectStyle}
                  required
                >
                  <option value="" disabled>Select seat component type...</option>
                  {availableTypes.map(t => (
                    <option key={t.type.id} value={t.type.id}>
                      {t.type.partNumber} — {t.type.description}
                    </option>
                  ))}
                </select>

                {selectedTypeId && (
                  <div style={{ marginTop: 12, padding: 12, background: isZero ? "#7f1d1d20" : "#0f172a", border: isZero ? "1px solid #ef444450" : "1px dashed #334155", borderRadius: 6 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: "1.4rem", fontWeight: 800, color: isZero ? "#ef4444" : "#10b981" }}>{availableCount}</span>
                      <span style={{ color: "#9ca3af", fontWeight: 500 }}>Replacement Available</span>
                    </div>
                    {isZero ? (
                      <div style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: 4, fontWeight: 500 }}>Removal blocked: no local replacement available.</div>
                    ) : (
                      <div style={{ color: "#10b981", fontSize: "0.85rem", marginTop: 4 }}>Optimized source selected automatically</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Old Seat Selection */}
          <div style={{ background: "#111827", padding: 16, borderRadius: 8, border: "1px solid #374151" }}>
            <label style={{ display: "flex", marginBottom: 8, fontWeight: 600, color: "#f59e0b", alignItems: 'center', gap: 6 }}>
              <span style={{ background: "#f59e0b", color: "#fff", width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>2</span>
              Seat to Remove (Optional)
            </label>
            <select 
              value={selectedRemovedSeatId} 
              onChange={e => setSelectedRemovedSeatId(e.target.value)}
              style={selectStyle}
            >
              <option value="">-- No seat being removed --</option>
              {installedSeats.map(s => (
                <option key={s.id} value={s.id}>
                  [{s.id.slice(-6).toUpperCase()}] {s.seatInsertType?.partNumber} — {s.seatInsertType?.description}
                </option>
              ))}
            </select>

            {selectedRemovedSeatId && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <label>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: 4 }}>Condition / Destination</div>
                  <select value={removeDisposition} onChange={e => setRemoveDisposition(e.target.value as any)} style={selectStyle}>
                    <option value="DIRTY_RECOVERY">DIRTY (Send to Harvey)</option>
                    <option value="SCRAPPED">SCRAP / DESTROY</option>
                  </select>
                </label>
                <label>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: 4 }}>Damage Reason</div>
                  <select value={removeReason} onChange={e => setRemoveReason(e.target.value)} style={selectStyle}>
                    <option value="TORN">Torn / Ripped</option>
                    <option value="GRAFFITI">Graffiti</option>
                    <option value="FOAM_DAMAGE">Foam Damage</option>
                    <option value="HARDWARE_DAMAGE">Hardware Damage</option>
                    <option value="OTHER">Other / Worn Out</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" style={{ width: "auto", background: "#374151", padding: "8px 16px", borderRadius: 6, color: "#fff" }} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isZero || !selectedTypeId}
              style={{ 
                width: "auto", 
                background: isZero ? "#374151" : "#10b981", 
                padding: "8px 16px", 
                borderRadius: 6, 
                color: isZero ? "#9ca3af" : "#fff", 
                fontWeight: 600,
                cursor: isZero ? "not-allowed" : "pointer"
              }}
            >
              {submitting ? "Processing Swap..." : "Replace & Send Dirty to Harvey"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f172a",
  color: "#ffffff",
  border: "1px solid #334155",
  borderRadius: 6,
  padding: "8px 10px",
  outline: "none"
};

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
  borderRadius: 12,
  padding: 24,
  width: "100%",
  maxWidth: 500,
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};
