import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Garage } from "@sams/types";
import "./FleetPage.css"; // Reuse card/table styling

export function GarageDashboard() {
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGarage, setEditingGarage] = useState<Partial<Garage> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchGarages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/garages");
      setGarages(res.data);
    } catch (err) {
      console.error("Failed to fetch garages", err);
      showError("Failed to load garages. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

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
      setIsModalOpen(false);
      setEditingGarage(null);
      fetchGarages();
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to save garage");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGarage = async (garage: Garage) => {
    if ((garage as any)._count?.buses > 0) {
      showError(`Cannot delete garage ${garage.name} because it has assigned buses. Please reassign or delete them first.`);
      return;
    }
    if (!window.confirm(`Are you sure you want to delete garage ${garage.name}?`)) return;
    setSubmitting(true);
    try {
      await api.delete(`/garages/${garage.id}`);
      showSuccess(`Garage ${garage.name} deleted successfully`);
      fetchGarages();
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to delete garage");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fleet-page-container">
      <div className="header-actions">
        <h1>Garage Dashboard</h1>
        <button onClick={() => { setEditingGarage({}); setIsModalOpen(true); }} className="btn btn-primary">
          Add Garage
        </button>
      </div>

      {errorMsg && <div className="toast toast-error">{errorMsg}</div>}
      {successMsg && <div className="toast toast-success">{successMsg}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Loading garages...</div>
      ) : garages.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>No garages found. Create one to get started.</div>
      ) : (
        <div className="stats-grid" style={{ gap: "1rem", alignItems: "stretch" }}>
          {garages.map(g => (
            <div key={g.id} className="card" style={{ display: "flex", flexDirection: "column", padding: "1.25rem", borderTop: "3px solid #6366f1", margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.125rem", color: "#111827", fontWeight: 600 }}>{g.name}</h3>
                <span className="status-badge status-active">{g.code}</span>
              </div>
              
              <div style={{ display: "flex", gap: "1rem", margin: "1rem 0", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div className="stat-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Total Buses</div>
                  <div className="stat-value" style={{ fontSize: "1.5rem" }}>{g._count?.buses || 0}</div>
                </div>
                {/* Fallbacks if active/maintenance aren't returned implicitly */}
                {(g as any).activeBuses !== undefined && (
                  <div>
                    <div className="stat-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Active</div>
                    <div className="stat-value text-green" style={{ fontSize: "1.5rem" }}>{(g as any).activeBuses}</div>
                  </div>
                )}
                {(g as any).maintenanceBuses !== undefined && (
                  <div>
                    <div className="stat-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Maint</div>
                    <div className="stat-value text-amber" style={{ fontSize: "1.5rem" }}>{(g as any).maintenanceBuses}</div>
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Link to={`/fleet?garageId=${g.id}`} className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
                  View Fleet
                </Link>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => { setEditingGarage(g); setIsModalOpen(true); }} className="btn btn-secondary btn-sm">Edit</button>
                  <button onClick={() => handleDeleteGarage(g)} className="btn btn-danger btn-sm" style={{ backgroundColor: "#ef4444", color: "white", padding: "0.25rem 0.75rem", borderRadius: "0.375rem", fontSize: "0.875rem", border: "none" }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editing Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{editingGarage?.id ? "Edit Garage" : "Add New Garage"}</h2>
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
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Saving..." : "Save Garage"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
