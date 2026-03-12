import React from "react";
import { api } from "../api";
import type { Bus } from "@sams/types";

export function FleetPage() {
  const [rows, setRows] = React.useState<Bus[]>([]);
  React.useEffect(() => { api.get("/buses").then((res) => setRows(res.data)); }, []);
  return (
    <div className="grid">
      <h1>Fleet</h1>
      <div className="card">
        <table>
          <thead><tr><th>Fleet</th><th>Model</th><th>Manufacturer</th><th>Garage</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((bus) => (
              <tr key={bus.id}>
                <td>{bus.fleetNumber}</td>
                <td>{bus.model}</td>
                <td>{bus.manufacturer}</td>
                <td>{bus.garage?.name}</td>
                <td>{bus.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
