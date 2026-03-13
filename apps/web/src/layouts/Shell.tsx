import React from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { FleetPage } from "../pages/FleetPage";
import { InventoryPage } from "../pages/InventoryPage";
import { TransactionsLedgerPage } from "../pages/TransactionsLedgerPage";
import { WorkOrdersPage } from "../pages/WorkOrdersPage";
import { WorkOrderDetailPage } from "../pages/WorkOrderDetailPage";

export function Shell({ user, onLogout }: { user: { name: string; role: string } | null; onLogout: () => void }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <h2>SAMS</h2>
        <p className="muted" style={{ color: "#9ca3af" }}>TTC Seat Inventory</p>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>Dashboard</NavLink>
          <NavLink to="/fleet" className={({ isActive }) => (isActive ? "active" : "")}>Fleet</NavLink>
          <NavLink to="/inventory" className={({ isActive }) => (isActive ? "active" : "")}>Inventory</NavLink>
          <NavLink to="/transactions" className={({ isActive }) => (isActive ? "active" : "")}>Ledger</NavLink>
          <NavLink to="/work-orders" className={({ isActive }) => (isActive ? "active" : "")}>Work Orders</NavLink>
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
        </Routes>
      </main>
    </div>
  );
}
