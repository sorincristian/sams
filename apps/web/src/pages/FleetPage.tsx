import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api";
import type { Bus, Garage } from "@sams/types";
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

  // Modals state
  const [isBusModalOpen, setIsBusModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Partial<Bus> | null>(null);
  const [isGarageModalOpen, setIsGarageModalOpen] = useState(false);
  const [editingGarage, setEditingGarage] = useState<Partial<Garage> | null>(null);

  // Feedback state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchGarages = useCallback(async () => {
    try {
      const res = await api.get("/garages");
      // Sorted alphabetically as requested by default, but let's make sure
      const sorted = res.data.sort((a: Garage, b: Garage) => a.name.localeCompare(b.name));
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
      const res = await api.get(url);
      setBuses(res.data.items);
      setTotal(res.data.total);
      // Ensure page isn't out of bounds if search results change
      if (res.data.page > 1 && res.data.items.length === 0) {
        setPage(1);
      } else {
        setPage(res.data.page);
      }
    } catch (err) {
      console.error("Failed to fetch buses", err);
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

  // Bus Actions
  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingBus?.id) {
        await api.put(`/buses/${editingBus.id}`, editingBus);
        showSuccess("Bus updated successfully");
        fetchBuses();
      } else {
        await api.post("/buses", editingBus);
        showSuccess("Bus created successfully");
        setPage(1); // Reset to page 1 to see new bus
        fetchBuses();
      }
      setIsBusModalOpen(false);
      setEditingBus(null);
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to save bus");
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

  // Garage Actions
  const handleSaveGarage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingGarage?.id) {
        await api.put(`/garages/${editingGarage.id}`, editingGarage);
        showSuccess("Garage updated successfully");
      } else {
        await api.post("/garages", editingGarage);
        showSuccess("Garage created successfully");
      }
      await fetchGarages();
      setEditingGarage(null); // Reset form
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to save garage");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGarage = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete garage ${name}?`)) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.delete(`/garages/${id}`);
      showSuccess(`Garage ${name} deleted`);
      fetchGarages();
      if (garageIdFilter === id) setGarageIdFilter("");
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to delete garage");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="fleet-page-container">
      <div className="header-actions">
        <h1>Fleet Management</h1>
        <div className="button-group">
          <button onClick={() => { setEditingGarage({}); setIsGarageModalOpen(true); }} className="btn btn-secondary">
            Manage Garages
          </button>
          <button onClick={() => { setEditingBus({ status: "ACTIVE" }); setIsBusModalOpen(true); }} className="btn btn-primary">
            Add Bus
          </button>
        </div>
      </div>

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
            {garages.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
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
              ) : buses.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>No buses found.</td></tr>
              ) : (
                buses.map((bus) => (
                  <tr key={bus.id}>
                    <td>{bus.fleetNumber}</td>
                    <td>{bus.model}</td>
                    <td>{bus.manufacturer}</td>
                    <td>{bus.garage?.name || "—"}</td>
                    <td>
                      <span className={`status-badge status-${bus.status.toLowerCase()}`}>
                        {bus.status}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => { setEditingBus(bus); setIsBusModalOpen(true); }} className="btn btn-sm btn-link" disabled={submitting}>Edit</button>
                      <button onClick={() => handleDeleteBus(bus.id, bus.fleetNumber)} className="btn btn-sm btn-danger-link" disabled={submitting}>Delete</button>
                    </td>
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

      {/* Bus Modal */}
      {isBusModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{editingBus?.id ? "Edit Bus" : "Add Bus"}</h2>
            <form onSubmit={handleSaveBus}>
              <div className="form-group">
                <label>Fleet Number</label>
                <input required type="text" value={editingBus?.fleetNumber || ""} onChange={e => setEditingBus({ ...editingBus, fleetNumber: e.target.value })} disabled={submitting} />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input required type="text" value={editingBus?.model || ""} onChange={e => setEditingBus({ ...editingBus, model: e.target.value })} disabled={submitting} />
              </div>
              <div className="form-group">
                <label>Manufacturer</label>
                <input required type="text" value={editingBus?.manufacturer || ""} onChange={e => setEditingBus({ ...editingBus, manufacturer: e.target.value })} disabled={submitting} />
              </div>
              <div className="form-group">
                <label>Garage</label>
                <select required value={editingBus?.garageId || ""} onChange={e => setEditingBus({ ...editingBus, garageId: e.target.value })} disabled={submitting}>
                  <option value="" disabled>Select a garage...</option>
                  {garages.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select required value={editingBus?.status || "ACTIVE"} onChange={e => setEditingBus({ ...editingBus, status: e.target.value })} disabled={submitting}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setIsBusModalOpen(false); setEditingBus(null); }} className="btn btn-secondary" disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Garage Modal */}
      {isGarageModalOpen && (
        <div className="modal-backdrop">
          <div className="modal modal-large">
            <h2>Manage Garages</h2>
            <div className="garage-manager-layout">
              <div className="garage-list">
                <h3>Existing Garages</h3>
                <ul>
                  {garages.map(g => (
                    <li key={g.id}>
                      <span>{g.name} <small>({g.code})</small></span>
                      <div className="garage-actions">
                        <button onClick={() => setEditingGarage(g)} className="btn btn-sm btn-link" disabled={submitting}>Edit</button>
                        <button onClick={() => handleDeleteGarage(g.id, g.name)} className="btn btn-sm btn-danger-link" disabled={submitting}>Delete</button>
                      </div>
                    </li>
                  ))}
                  {garages.length === 0 && <li>No garages found.</li>}
                </ul>
              </div>
              <div className="garage-form">
                <h3>{editingGarage?.id ? "Edit Garage" : "Add New Garage"}</h3>
                <form onSubmit={handleSaveGarage}>
                  <div className="form-group">
                    <label>Name</label>
                    <input required type="text" value={editingGarage?.name || ""} onChange={e => setEditingGarage({ ...editingGarage, name: e.target.value })} disabled={submitting} />
                  </div>
                  {!editingGarage?.id && (
                     <div className="form-group">
                       <label>Code (3 chars)</label>
                       <input maxLength={3} type="text" value={editingGarage?.code || ""} onChange={e => setEditingGarage({ ...editingGarage, code: e.target.value })} disabled={submitting} placeholder="Auto-generated if blank" />
                     </div>
                  )}
                  <div className="modal-actions">
                    {editingGarage?.id && (
                       <button type="button" onClick={() => setEditingGarage({})} className="btn btn-secondary" disabled={submitting}>Cancel Edit</button>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Saving..." : "Save Garage"}</button>
                  </div>
                </form>
              </div>
            </div>
            <div className="modal-actions modal-footer-actions">
               <button type="button" onClick={() => { setIsGarageModalOpen(false); setEditingGarage(null); fetchBuses(); }} className="btn btn-secondary" disabled={submitting}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
