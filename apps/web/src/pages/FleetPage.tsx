import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api";
import type { Bus, Garage } from "@sams/types";
import { FleetStatsWidget } from "../components/FleetStatsWidget";
import { BusImportModal } from "../components/BusImportModal";
import "./FleetPage.css";

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function FleetPage() {
  // State
  const [buses, setBuses] = useState<Bus[]>([]);
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loadingBuses, setLoadingBuses] = useState(false);
  
  // Filters & Pagination
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [garageIdFilter, setGarageIdFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [apiError, setApiError] = useState(false);

  // Modals / Edit state
  const [isBusModalOpen, setIsBusModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [addingBus, setAddingBus] = useState<Partial<Bus> | null>(null);
  
  // Inline editing state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [inlineEditForm, setInlineEditForm] = useState<Partial<Bus>>({});

  // Feedback state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchGarages = useCallback(async () => {
    try {
      const res = await api.get("/garages");
      // Sorted alphabetically as requested by default, defensively check array
      const items = Array.isArray(res.data) ? res.data : [];
      const sorted = items.slice().sort((a: Garage, b: Garage) => (a.name || "").localeCompare(b.name || ""));
      setGarages(sorted);
    } catch (err) {
      console.error("Failed to fetch garages", err);
    }
  }, []);

  const fetchBuses = useCallback(async () => {
    setLoadingBuses(true);
    let url = `/buses?page=${page}&pageSize=${pageSize}`;
    if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
    if (garageIdFilter) url += `&garageId=${encodeURIComponent(garageIdFilter)}`;
    try {
      setApiError(false);
      const res = await api.get(url);
      
      const items = res.data?.items;
      if (Array.isArray(items)) {
        setBuses(items);
        setTotal(res.data.total || 0);
        
        // Ensure page isn't out of bounds if search results change
        if (res.data.page > 1 && items.length === 0) {
          setPage(1);
        } else {
          setPage(res.data.page || 1);
        }
      } else {
        setApiError(true);
        setBuses([]);
      }
    } catch (err) {
      console.error("Failed to fetch buses", err);
      setApiError(true);
      setBuses([]);
    } finally {
      setLoadingBuses(false);
    }
  }, [page, pageSize, debouncedSearch, garageIdFilter]);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  // Reset page to 1 when search or garage filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, garageIdFilter]);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Bus Flow - Inline Edits
  const startInlineEdit = (bus: Bus) => {
    setEditingRowId(bus.id);
    setInlineEditForm({
      model: bus.model,
      manufacturer: bus.manufacturer,
      garageId: bus.garageId,
      status: bus.status
    });
  };

  const saveInlineEdit = async (id: string) => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.put(`/buses/${id}`, inlineEditForm);
      showSuccess("Bus updated successfully");
      setEditingRowId(null);
      fetchBuses();
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to update bus");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post("/buses", addingBus);
      showSuccess("Bus created successfully");
      setPage(1); // Reset to page 1 to see new bus
      fetchBuses();
      setIsBusModalOpen(false);
      setAddingBus(null);
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to create bus");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBus = async (id: string, fleetNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete bus ${fleetNumber}?`)) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.delete(`/buses/${id}`);
      showSuccess(`Bus ${fleetNumber} deleted`);
      fetchBuses();
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to delete bus");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const busItems = Array.isArray((buses as any)?.items) ? (buses as any).items : (Array.isArray(buses) ? buses : []);
  const garageItems = Array.isArray(garages) ? garages : [];
  const totalItems = typeof (buses as any)?.total === "number" ? (buses as any).total : (typeof total === "number" ? total : 0);

  if (loadingBuses && busItems.length === 0) return <div style={{ padding: "2rem", textAlign: "center", fontSize: "1.25rem" }}>Loading fleet...</div>;
  if (apiError && busItems.length === 0) return <div style={{ padding: "2rem", textAlign: "center", fontSize: "1.25rem", color: "#dc2626" }}>Failed to load fleet.</div>;

  return (
    <div className="fleet-page-container">
      <div className="header-actions">
        <h1>Fleet Management</h1>
        <div className="button-group">
          <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary">
            Bulk Import
          </button>
          <button onClick={() => { setAddingBus({ status: "ACTIVE" }); setIsBusModalOpen(true); }} className="btn btn-primary">
            Add Bus
          </button>
        </div>
      </div>

      {/* <FleetStatsWidget /> */}

      {errorMsg && <div className="toast toast-error">{errorMsg}</div>}
      {successMsg && <div className="toast toast-success">{successMsg}</div>}

      <div className="card filters-card">
        <div className="filters-row">
          <input
            type="text"
            placeholder="Search by fleet number, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-input search-input"
          />
          <select
            value={garageIdFilter}
            onChange={(e) => setGarageIdFilter(e.target.value)}
            className="filter-input"
          >
            <option value="">All garages</option>
            {garageItems.map((g: any) => (
              <option key={g.id} value={g.id}>{g?.name ?? "Unknown Garage"}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-responsive">
          <table className="fleet-table">
            <thead>
              <tr>
                <th>Fleet #</th>
                <th>Model</th>
                <th>Manufacturer</th>
                <th>Garage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingBuses ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
              ) : apiError ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#dc2626" }}>Error loading fleet data. Please try again.</td></tr>
              ) : busItems.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>No buses found.</td></tr>
              ) : (
                busItems.map((bus: any) => (
                  <tr key={bus?.id} className={editingRowId === bus?.id ? "editing-row" : ""}>
                    <td>
                      <a href={`/fleet/buses/${bus.id}`} style={{ fontWeight: "bold", color: "#2563eb", textDecoration: "none" }}>
                        {bus.fleetNumber}
                      </a>
                    </td>
                    {editingRowId === bus.id ? (
                      <>
                        <td><input type="text" className="filter-input" value={inlineEditForm.model || ""} onChange={e => setInlineEditForm({...inlineEditForm, model: e.target.value})} disabled={submitting} /></td>
                        <td><input type="text" className="filter-input" value={inlineEditForm.manufacturer || ""} onChange={e => setInlineEditForm({...inlineEditForm, manufacturer: e.target.value})} disabled={submitting} /></td>
                        <td>
                          <select className="filter-input" value={inlineEditForm.garageId || ""} onChange={e => setInlineEditForm({...inlineEditForm, garageId: e.target.value})} disabled={submitting}>
                            {garageItems.map((g: any) => <option key={g.id} value={g.id}>{g?.name ?? "Unknown"}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="filter-input" value={inlineEditForm.status || ""} onChange={e => setInlineEditForm({...inlineEditForm, status: e.target.value})} disabled={submitting}>
                             <option value="ACTIVE">ACTIVE</option>
                             <option value="MAINTENANCE">MAINTENANCE</option>
                             <option value="RETIRED">RETIRED</option>
                          </select>
                        </td>
                        <td>
                          <button onClick={() => saveInlineEdit(bus.id)} className="btn btn-sm btn-primary" disabled={submitting}>Save</button>
                          <button onClick={() => setEditingRowId(null)} className="btn btn-sm btn-secondary" style={{ marginLeft: "4px" }} disabled={submitting}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{bus?.model ?? "—"}</td>
                        <td>{bus?.manufacturer ?? "—"}</td>
                        <td>{bus?.garage?.name ?? "—"}</td>
                        <td>
                          <span className={`status-badge status-${(bus?.status || "ACTIVE").toLowerCase()}`}>
                            {bus?.status || "ACTIVE"}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => startInlineEdit(bus)} className="btn btn-sm btn-link" disabled={submitting || editingRowId !== null}>Edit</button>
                          <button onClick={() => handleDeleteBus(bus.id, bus.fleetNumber)} className="btn btn-sm btn-danger-link" disabled={submitting || editingRowId !== null}>Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!loadingBuses && total > 0 && (
          <div className="pagination">
            <span className="pagination-info">Page {page} of {totalPages} ({total} total buses)</span>
            <div className="pagination-controls">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
                className="btn btn-pagination"
              >
                Previous
              </button>
              <button 
                disabled={page >= totalPages} 
                onClick={() => setPage(p => p + 1)}
                className="btn btn-pagination"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Bus Modal */}
      {isBusModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Add New Bus</h2>
            <form onSubmit={handleSaveAddBus}>
              <div className="form-group">
                <label>Fleet Number</label>
                <input required type="text" value={addingBus?.fleetNumber || ""} onChange={e => setAddingBus({ ...addingBus, fleetNumber: e.target.value })} disabled={submitting} />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input required type="text" value={addingBus?.model || ""} onChange={e => setAddingBus({ ...addingBus, model: e.target.value })} disabled={submitting} />
              </div>
              <div className="form-group">
                <label>Manufacturer</label>
                <input required type="text" value={addingBus?.manufacturer || ""} onChange={e => setAddingBus({ ...addingBus, manufacturer: e.target.value })} disabled={submitting} />
              </div>
              <div className="form-group">
                <label>Garage</label>
                <select required value={addingBus?.garageId || ""} onChange={e => setAddingBus({ ...addingBus, garageId: e.target.value })} disabled={submitting}>
                  <option value="" disabled>Select a garage...</option>
                  {garageItems.map((g: any) => <option key={g.id} value={g.id}>{g?.name ?? "Unknown"}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select required value={addingBus?.status || "ACTIVE"} onChange={e => setAddingBus({ ...addingBus, status: e.target.value })} disabled={submitting}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setIsBusModalOpen(false); setAddingBus(null); }} className="btn btn-secondary" disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Saving..." : "Add Bus"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {/* {isImportModalOpen && (
        <BusImportModal 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={() => {
            setIsImportModalOpen(false);
            setPage(1);
            fetchBuses();
          }} 
        />
      )} */}
    </div>
  );
}
