import React from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { FleetPage } from "../pages/FleetPage";
import { InventoryPage } from "../pages/InventoryPage";
import { TransactionsLedgerPage } from "../pages/TransactionsLedgerPage";
import { WorkOrdersPage } from "../pages/WorkOrdersPage";
import { WorkOrderDetailPage } from "../pages/WorkOrderDetailPage";
import { SeatInsertCatalogPage } from "../pages/SeatInsertCatalogPage";
import { DiagramViewerPage } from "../pages/DiagramViewerPage";
import { HelpPage } from "../pages/HelpPage";
import { SeatChangeReportPage } from "../pages/SeatChangeReportPage";
import { SeatInsertsDashboard } from "../modules/seat-inserts/SeatInsertsDashboard";
import { canView } from "../lib/rbac";

export function Shell({ user, onLogout }: { user: any; onLogout: () => void }) {
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
          {canView(user, 'dashboard') && <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>Dashboard</NavLink>}
          {canView(user, 'fleet') && <NavLink to="/fleet" className={({ isActive }) => (isActive ? "active" : "")}>Fleet</NavLink>}
          <NavLink to="/garages" className={({ isActive }) => (isActive ? "active" : "")}>Garages</NavLink>
          {canView(user, 'inventory') && (
            <>
              <NavLink to="/inventory" end className={({ isActive }) => (isActive ? "active" : "")}>Inventory</NavLink>
              {canView(user, 'reports') && <NavLink to="/inventory/seat-changes" className={({ isActive }) => (isActive ? "active" : "")}>Seat Change Report</NavLink>}
            </>
          )}
          {canView(user, 'transactions') && <NavLink to="/transactions" className={({ isActive }) => (isActive ? "active" : "")}>Ledger</NavLink>}
          {canView(user, 'catalog') && <NavLink to="/catalog" className={({ isActive }) => (isActive ? "active" : "")}>Catalog</NavLink>}
          {canView(user, 'work_orders') && <NavLink to="/work-orders" className={({ isActive }) => (isActive ? "active" : "")}>Work Orders</NavLink>}
          <NavLink to="/import-history" className={({ isActive }) => (isActive ? "active" : "")}>Import History</NavLink>
          <NavLink to="/seat-inserts" className={({ isActive }) => (isActive ? "active" : "")}>Command Centre</NavLink>
          <NavLink to="/help" className={({ isActive }) => (isActive ? "active" : "")}>Help</NavLink>
          {canView(user, 'admin') && (
            <>
              <div style={{ marginTop: 16, marginBottom: 8, padding: "4px 8px", background: "#1e293b", borderRadius: 5, display: "inline-block" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.04em" }}>SYSTEM</span>
                <span style={{ fontSize: "0.72rem", color: "#64748b", marginLeft: 6 }}>Admin</span>
              </div>
              <NavLink to="/admin/users" className={({ isActive }) => (isActive ? "active" : "")}>Users</NavLink>
              <NavLink to="/admin/roles" className={({ isActive }) => (isActive ? "active" : "")}>Roles</NavLink>
            </>
          )}
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
          <Route path="/fleet/buses/:id" element={
            <React.Suspense fallback={<div>Loading Bus...</div>}>
              {React.createElement(React.lazy(() => import('../pages/BusDetailPage').then(m => ({ default: m.BusDetailPage }))))}
            </React.Suspense>
          } />
          <Route path="/garages" element={
            <React.Suspense fallback={<div>Loading Garages...</div>}>
              {React.createElement(React.lazy(() => import('../pages/GarageDashboard').then(m => ({ default: m.GarageDashboard }))))}
            </React.Suspense>
          } />
          <Route path="/inventory" element={<InventoryPage user={user} />} />
          <Route path="/inventory/seat-changes" element={<SeatChangeReportPage />} />
          <Route path="/transactions" element={<TransactionsLedgerPage />} />
          <Route path="/work-orders" element={<WorkOrdersPage />} />
          <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
          <Route path="/catalog" element={<SeatInsertCatalogPage />} />
          <Route path="/import-history" element={
            <React.Suspense fallback={<div>Loading Import History...</div>}>
              {React.createElement(React.lazy(() => import('../pages/ImportHistoryPage').then(m => ({ default: m.ImportHistoryPage }))))}
            </React.Suspense>
          } />
          <Route path="/seat-inserts" element={<SeatInsertsDashboard />} />
          <Route path="/diagram/:attachmentId" element={<DiagramViewerPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/admin/users" element={
            <React.Suspense fallback={<div>Loading Users...</div>}>
              {React.createElement(React.lazy(() => import('../pages/admin/UsersPage').then(m => ({ default: m.UsersPage }))), { user })}
            </React.Suspense>
          } />
          <Route path="/admin/roles" element={
            <React.Suspense fallback={<div>Loading Roles...</div>}>
              {React.createElement(React.lazy(() => import('../pages/admin/RolesPage').then(m => ({ default: m.RolesPage }))), { user })}
            </React.Suspense>
          } />
        </Routes>
      </main>
    </div>
  );
}
