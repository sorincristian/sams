import React from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { FleetPage } from "../pages/FleetPage";
import { InventoryPage } from "../pages/InventoryPage";
import { InventoryAddPage } from "../pages/InventoryAddPage";
import { TransactionsLedgerPage } from "../pages/TransactionsLedgerPage";
import { WorkOrdersPage } from "../pages/WorkOrdersPage";
import { WorkOrderDetailPage } from "../pages/WorkOrderDetailPage";
import { SeatInsertCatalogPage } from "../pages/SeatInsertCatalogPage";
import { PartDetailsPage } from "../pages/PartDetailsPage";
import { DiagramViewerPage } from "../pages/DiagramViewerPage";
import { HelpPage } from "../pages/HelpPage";
import { SeatChangeReportPage } from "../pages/SeatChangeReportPage";
import { SeatInsertsDashboard } from "../modules/seat-inserts/SeatInsertsDashboard";
import { EmailCentrePage } from "../pages/admin/EmailCentrePage";
import { SeatOrdersPage } from "../modules/seat-orders/pages/SeatOrdersPage";
import { SeatOrderCreatePage } from "../modules/seat-orders/pages/SeatOrderCreatePage";
import { SeatOrderDetailPage } from "../modules/seat-orders/pages/SeatOrderDetailPage";
import { canView } from "../lib/rbac";

type NavModule = {
  path: string;
  label: string;
  exact?: boolean;
  guard?: string;
};

const MODULE_REGISTRY: NavModule[] = [
  { path: '/', label: 'Dashboard', exact: true, guard: 'dashboard' },
  { path: '/fleet', label: 'Fleet', guard: 'fleet' },
  { path: '/garages', label: 'Garages' },
  { path: '/inventory', label: 'Inventory', exact: true, guard: 'inventory' },
  { path: '/catalog', label: 'Catalog', guard: 'catalog' },
  { path: '/work-orders', label: 'Work Orders', guard: 'work_orders' },
  { path: '/transactions', label: 'Ledger', guard: 'transactions' },
  { path: '/procurement/seat-orders', label: 'Seat Orders', guard: 'procurement' },
  { path: '/import-history', label: 'Import History' },
  { path: '/seat-inserts', label: 'Command Centre' },
  { path: '/inventory/seat-changes', label: 'Seat Change Report', guard: 'reports' },
  { path: '/help', label: 'Help' }
];

const ADMIN_REGISTRY: NavModule[] = [
  { path: '/admin/users', label: 'Users', guard: 'admin' },
  { path: '/admin/roles', label: 'Roles', guard: 'admin' },
  { path: '/admin/email-centre', label: 'Email Centre', guard: 'admin' },
];

export function Shell({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <h2>SAMS</h2>
        <p className="muted" style={{ color: "#9ca3af", fontSize: "0.72rem", marginTop: -6 }}>Seat &amp; Asset Mgmt System</p>
        <nav style={{ marginTop: "16px" }}>
          {MODULE_REGISTRY.map(mod => (
            (!mod.guard || canView(user, mod.guard)) && (
              <NavLink key={mod.path} to={mod.path} end={mod.exact} className={({ isActive }) => (isActive ? "active" : "")}>
                {mod.label}
              </NavLink>
            )
          ))}
          
          {(user?.role === 'SYSTEM_ADMIN' || canView(user, 'admin')) && (
            <>
              <div style={{ marginTop: 16, marginBottom: 8, padding: "4px 8px", background: "#1e293b", borderRadius: 5, display: "inline-block" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.04em" }}>SYSTEM</span>
                <span style={{ fontSize: "0.72rem", color: "#64748b", marginLeft: 6 }}>Admin</span>
              </div>
              {ADMIN_REGISTRY.map(mod => (
                (!mod.guard || canView(user, mod.guard)) && (
                  <NavLink key={mod.path} to={mod.path} end={mod.exact} className={({ isActive }) => (isActive ? "active" : "")}>
                    {mod.label}
                  </NavLink>
                )
              ))}
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
          <Route path="/inventory/add" element={<InventoryAddPage />} />
          <Route path="/inventory/seat-changes" element={<SeatChangeReportPage />} />
          <Route path="/transactions" element={<TransactionsLedgerPage />} />
          <Route path="/work-orders" element={<WorkOrdersPage />} />
          <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
          <Route path="/catalog" element={<SeatInsertCatalogPage />} />
          <Route path="/catalog/:id" element={<PartDetailsPage />} />
          <Route path="/catalog/:id/diagram/:attachmentId" element={<DiagramViewerPage />} />
          <Route path="/import-history" element={
            <React.Suspense fallback={<div>Loading Import History...</div>}>
              {React.createElement(React.lazy(() => import('../pages/ImportHistoryPage').then(m => ({ default: m.ImportHistoryPage }))))}
            </React.Suspense>
          } />
          <Route path="/seat-inserts" element={<SeatInsertsDashboard />} />
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
          <Route path="/admin/email-centre" element={<EmailCentrePage />} />
          <Route path="/procurement/seat-orders" element={<SeatOrdersPage />} />
          <Route path="/procurement/seat-orders/new" element={<SeatOrderCreatePage />} />
          <Route path="/procurement/seat-orders/:id" element={<SeatOrderDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
