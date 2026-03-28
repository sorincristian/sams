import React from "react";
import { api } from "../api";

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  bus: { id: string; fleetNumber: string; garageId: string; garage: { name: string } };
}

interface SeatInsert {
  id: string;
  status: string;
  locationId: string;
  installedBusId: string | null;
  seatInsertType?: { partNumber: string; description: string };
}

interface Props {
  workOrderId: string;
  onClose: () => void;
  onDone: () => void;
}

export function InstallSeatModal({ workOrderId, onClose, onDone }: Props) {
  const [wo, setWo] = React.useState<WorkOrder | null>(null);
  const [availableSeats, setAvailableSeats] = React.useState<SeatInsert[]>([]);
  const [installedSeats, setInstalledSeats] = React.useState<SeatInsert[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [selectedNewSeatId, setSelectedNewSeatId] = React.useState("");
  const [selectedRemovedSeatId, setSelectedRemovedSeatId] = React.useState("");
  const [removeDisposition, setRemoveDisposition] = React.useState<"DIRTY" | "DISPOSED">("DIRTY");
  const [removeReason, setRemoveReason] = React.useState("OTHER");

  React.useEffect(() => {
    async function load() {
      try {
        const woRes = await api.get(`/work-orders/${workOrderId}`);
        const activeWo = woRes.data;
        setWo(activeWo);

        // Fetch all seats for the garage to find Available ones
        const seatsRes = await api.get(`/seat-inserts/items?locationId=${activeWo.bus.garageId}`);
        const allSeats: SeatInsert[] = seatsRes.data || [];

        // Also fetch all seats globally in case the currently installed seat has a mismatched locationId
        const allGlobalSeatsRes = await api.get(`/seat-inserts/items`);
        const allGlobalSeats: SeatInsert[] = allGlobalSeatsRes.data || [];

        const installable = allSeats.filter(s => s.status === "NEW" || s.status === "RETURNED_FROM_VENDOR");
        const currentlyInstalled = allGlobalSeats.filter(s => s.installedBusId === activeWo.bus.id && s.status === "INSTALLED");

        setAvailableSeats(installable);
        setInstalledSeats(currentlyInstalled);

        if (installable.length > 0) setSelectedNewSeatId(installable[0].id);
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
    if (!selectedNewSeatId) return setError("Must select a new seat to install.");

    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/seat-inserts/${selectedNewSeatId}/install`, {
        busId: wo!.bus.id,
        workOrderId: wo!.id,
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
        <div style={modalStyle} className="text-center p-10 text-slate-400">Loading seat context...</div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginBottom: 4, fontSize: "1.2rem", fontWeight: 700 }}>Install Serialized Seat</h3>
        <p className="muted" style={{ marginBottom: 20, fontSize: "0.9rem" }}>
          Bus {wo?.bus.fleetNumber} • {wo?.bus.garage.name}
        </p>

        {error && <div style={{ color: "#ef4444", marginBottom: 12, padding: "8px 12px", background: "#fee2e2", borderRadius: 6, fontSize: "0.9rem" }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* New Seat Selection */}
          <div style={{ background: "#111827", padding: 16, borderRadius: 8, border: "1px solid #374151" }}>
            <label style={{ display: "flex", marginBottom: 8, fontWeight: 600, color: "#10b981", alignItems: 'center', gap: 6 }}>
              <span style={{ background: "#10b981", color: "#fff", width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>1</span>
              Seat to Install
            </label>
            {availableSeats.length === 0 ? (
              <div style={{ color: "#f59e0b", fontSize: "0.9rem" }}>No seats available in NEW or RETURNED_FROM_VENDOR status at this garage.</div>
            ) : (
              <select 
                value={selectedNewSeatId} 
                onChange={e => setSelectedNewSeatId(e.target.value)}
                style={selectStyle}
                required
              >
                <option value="" disabled>Select a physical seat...</option>
                {availableSeats.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.id.slice(-6).toUpperCase()}] {s.seatInsertType?.partNumber} — {s.seatInsertType?.description}
                  </option>
                ))}
              </select>
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
                    <option value="DIRTY">DIRTY (Send to Harvey)</option>
                    <option value="DISPOSED">SCRAP / DESTROY</option>
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
              disabled={submitting || availableSeats.length === 0 || !selectedNewSeatId}
              style={{ width: "auto", background: "#10b981", padding: "8px 16px", borderRadius: 6, color: "#fff", fontWeight: 600 }}
            >
              {submitting ? "Installing..." : "Confirm Installation Swap"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  background: "#1f2937",
  color: "#f9fafb",
  border: "1px solid #4b5563",
  borderRadius: 6,
  padding: "8px 10px",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: 12,
  padding: 24,
  width: "100%",
  maxWidth: 500,
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};
