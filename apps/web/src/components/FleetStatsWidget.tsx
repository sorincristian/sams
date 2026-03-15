import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { FleetStats } from "@sams/types";
import "./FleetStatsWidget.css";

export function FleetStatsWidget() {
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get("/buses/stats")
      .then(res => {
        setStats(res.data);
      })
      .catch(err => {
        console.error("Failed to fetch fleet stats", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="card stats-card loading-state">Loading fleet statistics...</div>;
  }

  if (error) {
    return <div className="card stats-card error-state">Failed to load statistics</div>;
  }

  const statsSafe = stats ?? {
    totalBuses: 0,
    totalGarages: 0,
    activeBuses: 0,
    maintenanceBuses: 0,
    retiredBuses: 0,
    busesByGarage: [],
    busesByManufacturer: []
  };

  const garageBreakdown = Array.isArray(statsSafe.busesByGarage) ? statsSafe.busesByGarage : [];
  const mfgBreakdown = Array.isArray(statsSafe.busesByManufacturer) ? statsSafe.busesByManufacturer : [];

  return (
    <div className="fleet-stats-widget">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Buses</div>
          <div className="stat-value">{statsSafe.totalBuses ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Buses</div>
          <div className="stat-value text-green">{statsSafe.activeBuses ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Maintenance</div>
          <div className="stat-value text-amber">{statsSafe.maintenanceBuses ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Garages</div>
          <div className="stat-value">{statsSafe.totalGarages ?? 0}</div>
        </div>
      </div>
      
      <div className="stats-breakdowns">
        <div className="card half-card">
          <h3>Buses by Garage</h3>
          <ul className="breakdown-list">
            {garageBreakdown.slice().sort((a: any,b: any) => (b?.count ?? 0) - (a?.count ?? 0)).slice(0, 5).map((g: any) => (
              <li key={g?.garageId ?? Math.random()}>
                <span>{g?.garageName ?? "Unknown"}</span>
                <strong>{g?.count ?? 0}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="card half-card">
          <h3>Top Manufacturers</h3>
          <ul className="breakdown-list">
            {mfgBreakdown.slice().sort((a: any,b: any) => (b?.count ?? 0) - (a?.count ?? 0)).slice(0, 5).map((m: any) => (
              <li key={m?.manufacturer ?? Math.random()}>
                <span>{m?.manufacturer || "Unknown"}</span>
                <strong>{m?.count ?? 0}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
