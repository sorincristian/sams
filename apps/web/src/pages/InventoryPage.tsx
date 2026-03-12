import React from "react";
import { api } from "../api";
import type { InventoryRow } from "@sams/types";

export function InventoryPage() {
  const [rows, setRows] = React.useState<InventoryRow[]>([]);
  React.useEffect(() => { api.get("/inventory").then((res) => setRows(res.data)); }, []);
  return (
    <div className="grid">
      <h1>Inventory</h1>
      <div className="card">
        <table>
          <thead><tr><th>Garage</th><th>Part</th><th>Description</th><th>Qty</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.garage.name}</td>
                <td>{row.seatInsertType.partNumber}</td>
                <td>{row.seatInsertType.description}</td>
                <td>{row.quantityOnHand}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
