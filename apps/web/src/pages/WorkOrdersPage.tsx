import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Bus, WorkOrder, Garage } from "@sams/types";
import { Button } from "../components/ui/Button";
import { Plus } from "lucide-react";
import { CatalogAutocomplete } from "../components/CatalogAutocomplete";
import { IssueInventoryModal } from "./IssueInventoryModal";
import { InstallSeatModal } from "./InstallSeatModal";

export function WorkOrdersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<any[]>([]);
  const [buses, setBuses] = React.useState<Bus[]>([]);
  const [garages, setGarages] = React.useState<any[]>([]);
  const [catalog, setCatalog] = React.useState<any[]>([]);

  const [garageId, setGarageId] = React.useState("");
  const [busId, setBusId] = React.useState("");
  const [seatInsertTypeId, setSeatInsertTypeId] = React.useState("");
  const [queryLocal, setQueryLocal] = React.useState("");
  const [issueDescription, setIssueDescription] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [issueModalWo, setIssueModalWo] = React.useState<any | null>(null);
  const [installModalWo, setInstallModalWo] = React.useState<any | null>(null);
  const [closeModalWo, setCloseModalWo] = React.useState<any | null>(null);
  const [closeNotes, setCloseNotes] = React.useState("");

  async function load() {
    setLoadError(null);
    try {
      const [woRes, busRes, garageRes, catalogRes] = await Promise.all([
        api.get("/work-orders"),
        api.get("/buses?pageSize=1000"),
        api.get("/garages"),
        api.get("/v1/catalog")
      ]);
      
      const woData = Array.isArray(woRes.data) ? woRes.data : (woRes.data?.items || []);
      const busData = Array.isArray(busRes.data?.items) ? busRes.data.items : (Array.isArray(busRes.data) ? busRes.data : []);
      const garageData = garageRes.data || [];

      setRows(woData);
      setBuses(busData);
      setGarages(garageData);
      setCatalog(catalogRes.data || []);

      if (garageData.length > 0 && !garageId) {
        setGarageId(garageData[0].id);
      }
    } catch (err: any) {
      console.error("[WorkOrdersPage] load failed:", err);
      setLoadError(err?.response?.data?.message ?? "Failed to load data.");
    }
  }

  React.useEffect(() => { void load(); }, []);

  const filteredBuses = React.useMemo(() => {
    const filtered = buses.filter(b => !b.garageId || b.garageId === garageId);
    return filtered.length > 0 ? filtered : buses;
  }, [buses, garageId]);

  React.useEffect(() => {
    if (filteredBuses.length > 0 && !filteredBuses.find(b => b.id === busId)) {
      setBusId(filteredBuses[0].id);
    }
  }, [filteredBuses, busId]);

  const mappedCatalogParts = React.useMemo(() => {
    return catalog.map(p => ({
      id: p.id,
      partNumber: p.partNumber,
      description: p.description,
      componentType: p.componentType || "",
      vendor: p.vendor || ""
    }));
  }, [catalog]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!garageId) {
      setError("Please select a garage.");
      return;
    }
    if (!busId) {
      setError("Please select a bus.");
      return;
    }
    if (!seatInsertTypeId) {
      setError("Please isolate the correct part from the catalog.");
      return;
    }
    // Issue description is optional to match standard behavior, but must be string
    const finalNotes = issueDescription.trim() || `Replacement required for ${queryLocal}`;

    const payload = { 
      busId, 
      seatInsertTypeId,
      issueDescription: finalNotes, 
      priority: "MEDIUM" 
    };
    console.log("[WorkOrdersPage] submitting create:", payload);

    setCreating(true);
    try {
      const res = await api.post("/work-orders", payload);
      console.log("[WorkOrdersPage] created:", res.data);
      setIssueDescription("");
      setSuccessMsg("Work order dispatched successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
      await load();
    } catch (err: any) {
      console.error("[WorkOrdersPage] create failed:", err);
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to create work order.";
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleCloseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!closeModalWo) return;
    try {
      await api.patch(`/work-orders/${closeModalWo.id}/status`, {
        status: "CLOSED",
        closedNotes: closeNotes.trim() || undefined
      });
      setCloseModalWo(null);
      setCloseNotes("");
      load();
    } catch (err: any) {
      console.error(err);
      alert("Failed to close work order: " + (err?.response?.data?.message ?? err.message));
    }
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <h1>Work Orders</h1>

      {loadError && (
        <div className="card" style={{ color: "#ef4444" }}>{loadError}</div>
      )}

      <div className="grid two">
        <div className="card">
          <h3>Create work order</h3>
          <form style={{ display: "flex", flexDirection: "column", gap: 12 }} onSubmit={handleCreate}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Garage</label>
              <select
                value={garageId}
                onChange={(e) => setGarageId(e.target.value)}
                style={{ width: "100%", background: "#111827", color: "#f9fafb", border: "1px solid #374151", borderRadius: 6, padding: "8px 10px" }}
              >
                {garages.length === 0 && <option value="">Loading garages...</option>}
                {garages.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Bus</label>
              <select
                value={busId}
                onChange={(e) => setBusId(e.target.value)}
                style={{ width: "100%", background: "#111827", color: "#f9fafb", border: "1px solid #374151", borderRadius: 6, padding: "8px 10px" }}
              >
                {filteredBuses.length === 0 && <option value="">No buses found</option>}
                {filteredBuses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.fleetNumber} — {bus.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] tracking-[0.01em] text-[#cbd5e1] mb-2 font-medium">
                Seat Insert / Part
              </label>
              <div className="catalog-autocomplete-dark-override">
                <CatalogAutocomplete
                  catalogParts={mappedCatalogParts}
                  queryLocal={queryLocal}
                  setQueryLocal={setQueryLocal}
                  selectedPartId={seatInsertTypeId}
                  setSelectedPartId={(id) => setSeatInsertTypeId(id || "")}
                  placeholder="Search full catalog by ID, description, or type..."
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Issue notes (optional)</label>
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="E.g. Graffiti on shell"
                rows={4}
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>

            {error && (
              <div style={{ color: "#ef4444", fontSize: "0.9rem", padding: "10px 14px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, fontWeight: 500 }}>
                {error}
              </div>
            )}
            
            {successMsg && (
              <div style={{ color: "#15803d", fontSize: "0.9rem", padding: "10px 14px", background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 8, fontWeight: 500 }}>
                {successMsg}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Button type="submit" loading={creating} disabled={!garageId || !busId || !seatInsertTypeId} variant="primary">
                <Plus className="w-5 h-5 -ml-1 opacity-80" />
                Create Work Order
              </Button>
            </div>
          </form>
        </div>

        <div className="card">
          <h3>Open work orders</h3>
          {rows.length === 0 ? (
            <div className="muted">No work orders found.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>WO #</th>
                  <th>Bus</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Part Number</th>
                  <th>Description</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((wo) => (
                  <tr
                    key={wo.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/work-orders/${wo.id}`)}
                  >
                    <td><strong>{wo.workOrderNumber}</strong></td>
                    <td>{wo.bus.fleetNumber}</td>
                    <td>
                      <span style={{
                        color: wo.priority === "HIGH" ? "#ef4444" : wo.priority === "MEDIUM" ? "#f59e0b" : "#6b7280",
                        fontWeight: 600
                      }}>
                        {wo.priority}
                      </span>
                    </td>
                    <td>
                      {wo.status === "CLOSED" && (
                        <div className="badge" style={{ background: "#374151" }}>CLOSED</div>
                      )}
                      {wo.status !== "CLOSED" && wo.status}
                    </td>
                    <td><strong>{wo.seatInsertType?.partNumber || "—"}</strong></td>
                    <td className="muted">{wo.seatInsertType?.description || "—"}</td>
                    <td style={{ maxWidth: 180 }}>
                      <div className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {wo.issueDescription}
                      </div>
                      {(wo.installedByUser || wo.closedByUser) && (
                        <div style={{ fontSize: "0.80rem", color: "#9ca3af", marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                          {wo.installedByUser && <div>Installed by {wo.installedByUser.name}</div>}
                          {wo.closedByUser && <div>Closed {wo.closedAt ? new Date(wo.closedAt).toLocaleDateString() : ""} by {wo.closedByUser.name}</div>}
                        </div>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={["CLOSED", "COMPLETED", "CANCELLED"].includes(wo.status)}
                          onClick={() => setIssueModalWo(wo)}
                        >
                          Issue Part
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={["CLOSED", "COMPLETED", "CANCELLED"].includes(wo.status)}
                          onClick={() => setInstallModalWo(wo)}
                        >
                          Install Part
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={["CLOSED", "COMPLETED", "CANCELLED"].includes(wo.status)}
                          onClick={() => setCloseModalWo(wo)}
                        >
                          Close
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {issueModalWo && (
        <IssueInventoryModal
          item={null}
          prefilledWorkOrderId={issueModalWo.id}
          prefilledCatalogId={issueModalWo.seatInsertTypeId}
          onClose={() => setIssueModalWo(null)}
          onDone={() => { setIssueModalWo(null); load(); }}
        />
      )}

      {installModalWo && (
        <InstallSeatModal
          workOrderId={installModalWo.id}
          onClose={() => setInstallModalWo(null)}
          onDone={() => { setInstallModalWo(null); load(); }}
        />
      )}

      {closeModalWo && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="card" style={{ width: 400, background: "#1f2937" }}>
            <h3 style={{ marginTop: 0 }}>Close Work Order</h3>
            <p className="muted" style={{ marginBottom: 16 }}>
              Are you sure you want to officially close WO <strong>{closeModalWo.workOrderNumber}</strong>?
            </p>
            <form onSubmit={handleCloseSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Close Notes (optional)</label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="E.g. Repaired and placed back in service."
                  rows={3}
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                <Button type="button" variant="secondary" onClick={() => { setCloseModalWo(null); setCloseNotes(""); }}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger">
                  Confirm Close
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
