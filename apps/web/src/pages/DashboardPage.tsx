import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { DashboardResponse } from "@sams/types";
import { PageContainer, PageHeader } from "../components/shared/Page";
import { StatCard, SectionCard } from "../components/shared/Card";
import { DataTable } from "../components/shared/DataTable";
import { StatusBadge } from "../components/shared/StatusBadge";

export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = React.useState<DashboardResponse | null>(null);
  React.useEffect(() => {
    api.get("/dashboard").then((res) => setData(res.data));
  }, []);
  
  if (!data) return <PageContainer>Loading...</PageContainer>;

  return (
    <PageContainer>
      <PageHeader title="Dashboard" />
      
      <div className="grid stats" style={{ marginBottom: "var(--spacing-24)" }}>
        <StatCard label="Garages" value={data.counts.garages} />
        <StatCard label="Buses" value={data.counts.buses} />
        <StatCard label="Seat insert types" value={data.counts.seatInsertTypes} />
        <StatCard label="Open work orders" value={data.counts.openWorkOrders} />
      </div>

      <div className="grid two">
        <SectionCard title="Low stock">
          <DataTable headers={["Garage", "Part", "Qty"]}>
            {data.lowStock.length === 0 ? (
              <tr><td colSpan={3}>No low stock items.</td></tr>
            ) : (
              data.lowStock.map((row) => (
                <tr
                  key={`${row.garage}-${row.partNumber}`}
                  style={{ cursor: "pointer" }}
                  title="Click to view in Inventory"
                  onClick={() => navigate("/inventory?lowStock=1")}
                >
                  <td>{row.garage}</td>
                  <td>{row.partNumber}</td>
                  <td style={{ color: "var(--color-danger)", fontWeight: 700 }}>
                    {row.quantityOnHand} / min {row.minStockLevel}
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        </SectionCard>

        <SectionCard title="Recent work orders">
          <DataTable headers={["WO", "Bus", "Status"]}>
            {data.recentWorkOrders.map((wo) => {
              let variant: "success" | "warning" | "danger" | "neutral" = "neutral";
              if (wo.status === "OPEN" || wo.status === "IN_PROGRESS") variant = "warning";
              else if (wo.status === "COMPLETED") variant = "success";
              else if (wo.status === "CANCELLED") variant = "danger";

              return (
                <tr key={wo.id}>
                  <td>{wo.workOrderNumber}</td>
                  <td>{wo.bus.fleetNumber}</td>
                  <td><StatusBadge status={wo.status} variant={variant} /></td>
                </tr>
              );
            })}
          </DataTable>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
