import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Bus, Garage, WorkOrder } from "@sams/types";

// Extended Bus type local to this view
type BusDetail = Bus & {
  workOrders: WorkOrder[];
  busCompatibility: any;
  createdAt: string;
  updatedAt: string;
};

export function BusDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [bus, setBus] = useState<BusDetail | null>(null);
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Bus>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  useEffect(() => {
    Promise.all([
      api.get(`/buses/${id}`).then(res => setBus(res.data)),
      api.get("/garages").then(res => setGarages(res.data))
    ])
    .catch(err => {
      console.error(err);
      setErrorMsg("Failed to load bus details.");
    })
    .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.put(`/buses/${id}`, editForm);
      setBus(prev => prev ? { ...prev, ...res.data } : null);
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Failed to update bus");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = () => {
    if (bus) {
      setEditForm({
        fleetNumber: bus.fleetNumber,
        model: bus.model,
        manufacturer: bus.manufacturer,
        garageId: bus.garageId,
        status: bus.status
      });
      setIsEditing(true);
    }
  };

  if (loading) {
    return <div className="fleet-page-container"><div style={{ padding: "2rem", textAlign: "center" }}>Loading Bus Details...</div></div>;
  }

  if (!bus) {
    return <div className="fleet-page-container"><div className="toast toast-error">Bus not found or could not be loaded.</div></div>;
  }

  return (
    <div className="fleet-page-container">
      <div className="header-actions">
        <div>
          <button onClick={() => navigate("/fleet")} className="btn btn-link" style={{ padding: 0, marginBottom: "0.5rem" }}>&larr; Back to Fleet</button>
          <h1 style={{ margin: 0 }}>Bus {bus.fleetNumber}</h1>
        </div>
        {!isEditing && (
          <button onClick={startEditing} className="btn btn-primary">Edit Bus</button>
        )}
      </div>

      {errorMsg && <div className="toast toast-error" style={{ marginBottom: "1rem" }}>{errorMsg}</div>}

      <div className="garage-manager-layout">
        <div className="card">
          <h3 style={{ marginTop: 0, borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem" }}>Details</h3>
          {isEditing ? (
            <form onSubmit={handleSave}>
              <div className="form-group">
                 <label>Fleet Number</label>
                 <input type="text" value={editForm.fleetNumber || ""} onChange={e => setEditForm({...editForm, fleetNumber: e.target.value})} disabled={submitting} required />
              </div>
              <div className="form-group">
                 <label>Model</label>
                 <input type="text" value={editForm.model || ""} onChange={e => setEditForm({...editForm, model: e.target.value})} disabled={submitting} required />
              </div>
              <div className="form-group">
                 <label>Manufacturer</label>
                 <input type="text" value={editForm.manufacturer || ""} onChange={e => setEditForm({...editForm, manufacturer: e.target.value})} disabled={submitting} required />
              </div>
              <div className="form-group">
                 <label>Garage</label>
                 <select value={editForm.garageId || ""} onChange={e => setEditForm({...editForm, garageId: e.target.value})} disabled={submitting} required>
                   {garages.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                 </select>
              </div>
              <div className="form-group">
                 <label>Status</label>
                 <select value={editForm.status || "ACTIVE"} onChange={e => setEditForm({...editForm, status: e.target.value})} disabled={submitting} required>
                   <option value="ACTIVE">ACTIVE</option>
                   <option value="MAINTENANCE">MAINTENANCE</option>
                   <option value="RETIRED">RETIRED</option>
                 </select>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</button>
                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary" disabled={submitting}>Cancel</button>
              </div>
            </form>
          ) : (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", marginBottom: "1rem" }}>
                <span className="stat-label">Status</span>
                <span><span className={`status-badge status-${bus.status.toLowerCase()}`}>{bus.status}</span></span>
                
                <span className="stat-label">Model</span>
                <span style={{ fontWeight: 500 }}>{bus.model}</span>
                
                <span className="stat-label">Manufacturer</span>
                <span style={{ fontWeight: 500 }}>{bus.manufacturer}</span>
                
                <span className="stat-label">Garage</span>
                <span style={{ fontWeight: 500 }}>{bus.garage?.name || "Unassigned"}</span>

                <span className="stat-label">Created At</span>
                <span style={{ color: "#6b7280" }}>{new Date(bus.createdAt).toLocaleDateString()}</span>
              </div>
              
              {bus.busCompatibility && (
                <div style={{ marginTop: "2rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                   <h4 style={{ marginTop: 0 }}>Compatibility Mapping</h4>
                   <div style={{ fontSize: "0.875rem" }}>
                     <div><strong>Label:</strong> {bus.busCompatibility.busTypeLabel}</div>
                     <div><strong>Range:</strong> {bus.busCompatibility.fleetRangeStart} - {bus.busCompatibility.fleetRangeEnd}</div>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem" }}>Recent Work Orders</h3>
          {bus.workOrders?.length ? (
            <ul className="breakdown-list" style={{ marginTop: 0 }}>
              {bus.workOrders.map(wo => (
                <li key={wo.id} style={{ display: "block", cursor: "pointer" }} onClick={() => navigate(`/work-orders/${wo.id}`)}>
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                     <strong style={{ color: "#2563eb" }}>#{wo.workOrderNumber}</strong>
                     <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{new Date(wo.createdAt).toLocaleDateString()}</span>
                   </div>
                   <div style={{ fontSize: "0.875rem" }}>{wo.issueDescription}</div>
                   <div style={{ marginTop: "0.25rem" }}><span className={`status-badge status-${wo.status.toLowerCase() === 'open' ? 'maintenance' : 'active'}`}>{wo.status}</span></div>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: "#6b7280", fontStyle: "italic", paddingTop: "1rem" }}>No recent work orders for this bus.</div>
          )}
        </div>
      </div>
    </div>
  );
}
