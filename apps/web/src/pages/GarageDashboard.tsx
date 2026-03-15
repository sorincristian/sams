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

  const handleDeleteGarage = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete garage ${name}?`)) return;
    setSubmitting(true);
    try {
      await api.delete(`/garages/${id}`);
      showSuccess(`Garage ${name} deleted successfully`);
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
        <div className="stats-grid">
          {garages.map(g => (
            <div key={g.id} className="card stat-card" style={{ alignItems: "flex-start", borderTop: "3px solid #6366f1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0 }}>{g.name}</h3>
                <span className="status-badge status-active">{g.code}</span>
              </div>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <div className="stat-label">Assigned Buses</div>
                <div className="stat-value" style={{ fontSize: "2rem" }}>{g._count?.buses || 0}</div>
              </div>
              
              <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
                <Link to={`/fleet?garageId=${g.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
                  View Fleet
                </Link>
                <button onClick={() => { setEditingGarage(g); setIsModalOpen(true); }} className="btn btn-link btn-sm">Edit</button>
                <button onClick={() => handleDeleteGarage(g.id, g.name)} className="btn btn-danger-link btn-sm">Delete</button>
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
