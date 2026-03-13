import React from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { FleetPage } from "../pages/FleetPage";
import { InventoryPage } from "../pages/InventoryPage";
import { TransactionsLedgerPage } from "../pages/TransactionsLedgerPage";
import { WorkOrdersPage } from "../pages/WorkOrdersPage";
import { WorkOrderDetailPage } from "../pages/WorkOrderDetailPage";
import { SeatInsertCatalogPage } from "../pages/SeatInsertCatalogPage";
import { HelpPage } from "../pages/HelpPage";

export function Shell({ user, onLogout }: { user: { name: string; role: string } | null; onLogout: () => void }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <h2>SAMS</h2>
        <p className="muted" style={{ color: "#9ca3af", fontSize: "0.72rem", marginTop: -6 }}>Seat &amp; Asset Mgmt System</p>
        <div style={{ marginTop: 4, marginBottom: 8, padding: "4px 8px", background: "#1e3a5f", borderRadius: 5, display: "inline-block" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#60a5fa", letterSpacing: "0.04em" }}>SIMS</span>
          <span style={{ fontSize: "0.72rem", color: "#93c5fd", marginLeft: 6 }}>Inventory Module</span>
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>Dashboard</NavLink>
          <NavLink to="/fleet" className={({ isActive }) => (isActive ? "active" : "")}>Fleet</NavLink>
          <NavLink to="/inventory" className={({ isActive }) => (isActive ? "active" : "")}>Inventory</NavLink>
          <NavLink to="/transactions" className={({ isActive }) => (isActive ? "active" : "")}>Ledger</NavLink>
          <NavLink to="/catalog" className={({ isActive }) => (isActive ? "active" : "")}>Catalog</NavLink>
          <NavLink to="/work-orders" className={({ isActive }) => (isActive ? "active" : "")}>Work Orders</NavLink>
          <NavLink to="/help" className={({ isActive }) => (isActive ? "active" : "")}>Help</NavLink>
        </nav>
      </aside>
      <main className="content">
        <div className="topbar">
          <div>
            <strong>{user?.name ?? "User"}</strong>
            <div className="muted">{user?.role}</div>
          </div>
          <button style={{ width: "auto" }} onClick={onLogout}>Sign out</button>
        </div>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/fleet" element={<FleetPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/transactions" element={<TransactionsLedgerPage />} />
          <Route path="/work-orders" element={<WorkOrdersPage />} />
          <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
          <Route path="/catalog" element={<SeatInsertCatalogPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Routes>
      </main>
    </div>
  );
}
