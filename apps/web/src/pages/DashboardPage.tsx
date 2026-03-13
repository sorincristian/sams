import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { DashboardResponse } from "@sams/types";

export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = React.useState<DashboardResponse | null>(null);
  React.useEffect(() => {
    api.get("/dashboard").then((res) => setData(res.data));
  }, []);
  if (!data) return <div className="card">Loading...</div>;

  return (
    <div className="grid" style={{ gap: 20 }}>
      <h1>Dashboard</h1>
      <div className="grid stats">
        <div className="card"><strong>{data.counts.garages}</strong><div className="muted">Garages</div></div>
        <div className="card"><strong>{data.counts.buses}</strong><div className="muted">Buses</div></div>
        <div className="card"><strong>{data.counts.seatInsertTypes}</strong><div className="muted">Seat insert types</div></div>
        <div className="card"><strong>{data.counts.openWorkOrders}</strong><div className="muted">Open work orders</div></div>
      </div>
      <div className="grid two">
        <div className="card">
          <h3>Low stock</h3>
          <table>
            <thead><tr><th>Garage</th><th>Part</th><th>Qty</th></tr></thead>
            <tbody>
              {data.lowStock.length === 0 ? <tr><td colSpan={3}>No low stock items.</td></tr> :
                data.lowStock.map((row) => (
                  <tr
                    key={`${row.garage}-${row.partNumber}`}
                    style={{ cursor: "pointer" }}
                    title="Click to view in Inventory"
                    onClick={() => navigate("/inventory?lowStock=1")}
                  >
                    <td>{row.garage}</td>
                    <td>{row.partNumber}</td>
                    <td style={{ color: "#ef4444", fontWeight: 700 }}>{row.quantityOnHand} / min {row.minStockLevel}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Recent work orders</h3>
          <table>
            <thead><tr><th>WO</th><th>Bus</th><th>Status</th></tr></thead>
            <tbody>
              {data.recentWorkOrders.map((wo) => (
                <tr key={wo.id}>
                  <td>{wo.workOrderNumber}</td>
                  <td>{wo.bus.fleetNumber}</td>
                  <td>{wo.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
