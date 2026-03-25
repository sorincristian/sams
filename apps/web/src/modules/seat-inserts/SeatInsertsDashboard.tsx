import React, { useEffect, useState } from "react";
import { LayoutDashboard, Settings } from "lucide-react";
import { api } from "../../api";

import { KPIBox } from "./components/KPIBox";
import { AlertsPanel } from "./components/AlertsPanel";
import { InventoryTable } from "./components/InventoryTable";
import { PipelineFlow } from "./components/PipelineFlow";
import { TrendChart } from "./components/TrendChart";

export function SeatInsertsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [summary, setSummary] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [replacements, setReplacements] = useState<any>({ reasonBreakdown: [] });
  const [disposals, setDisposals] = useState<any>({ reasonBreakdown: [] });

  const fetchDashboardData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const results = await Promise.allSettled([
        api.get("/seat-inserts/dashboard/summary"),
        api.get("/seat-inserts/inventory/by-location"),
        api.get("/seat-inserts/replacements"),
        api.get("/seat-inserts/disposals"),
      ]);

      const [sumRes, invRes, repRes, disRes] = results;

      if (sumRes.status === "fulfilled") setSummary(sumRes.value.data);
      if (invRes.status === "fulfilled") setInventory(invRes.value.data);
      if (repRes.status === "fulfilled") setReplacements(repRes.value.data);
      if (disRes.status === "fulfilled") setDisposals(disRes.value.data);

      const hasErrors = results.some(r => r.status === "rejected");
      if (hasErrors) {
        const firstError = results.find(r => r.status === "rejected") as PromiseRejectedResult;
        console.error("SeatInsertsDashboard error", firstError.reason);
        if (!isBackground) setError(firstError.reason?.message || "Failed to load partial command centre data");
      } else {
        setError(null);
      }

      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("SeatInsertsDashboard error", err);
      if (!isBackground) setError(err.message || "Failed to load command centre data");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    console.log("SeatInsertsDashboard mounted");
    fetchDashboardData(false);
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !summary) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-xl font-semibold text-muted-foreground animate-pulse">Loading Command Centre...</h2>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[500px]">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200">
          <h2 className="font-bold text-lg mb-2">System Interruption</h2>
          <p>{error}</p>
          <button onClick={() => fetchDashboardData(false)} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700">Retry Connection</button>
        </div>
      </div>
    );
  }

  const safeSummary = summary ?? {
    totalInventory: 0,
    newInventory: 0,
    dirtyInventory: 0,
    packedForReturn: 0,
    returned: 0,
    slaPercentage: 100
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            Seat Inserts Command Centre
          </h1>
          <div className="text-muted-foreground mt-2 text-sm flex items-center gap-3">
            <span>Live Executive Overview & Lifecycle Telemetry</span>
            {lastUpdated && (
              <span className="text-xs opacity-70 bg-muted px-2 py-0.5 rounded-full border border-border flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => fetchDashboardData(false)} 
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-semibold text-sm shadow-sm disabled:opacity-50 transition-colors"
          >
            {loading ? "Syncing..." : "Sync Telemetry"}
          </button>
          <button className="bg-card border border-border text-foreground hover:bg-muted px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configure
          </button>
        </div>
      </div>

      {/* Top Section - KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIBox 
          title="Total Inserts" 
          value={loading && !summary ? "-" : safeSummary.totalInventory} 
          trendValue={0} 
          trendLabel="stable baseline" 
        />
        <KPIBox 
          title="New Inventory" 
          value={loading && !summary ? "-" : safeSummary.newInventory} 
          trendValue={0} 
          state={safeSummary.newInventory < 50 ? "warning" : "normal"}
        />
        <KPIBox 
          title="Dirty &amp; Packed" 
          value={loading && !summary ? "-" : (safeSummary.dirtyInventory + safeSummary.packedForReturn)} 
          trendValue={0} 
        />
        <KPIBox 
          title="Vendor SLA %" 
          value={loading && !summary ? "-" : `${safeSummary.slaPercentage}%`} 
          trendValue={0} 
          state={safeSummary.slaPercentage < 90 ? "critical" : "normal"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column - Pipeline & Inventory */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <PipelineFlow metrics={{
            dirty: safeSummary.dirtyInventory || 0,
            packed: safeSummary.packedForReturn || 0,
            inTransit: 0, // Placeholder mapping or extrapolate from Batch
            returned: safeSummary.returned || 0
          }} onMutationSuccess={fetchDashboardData} />

          <InventoryTable data={inventory || []} loading={loading} onMutationSuccess={fetchDashboardData} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            <TrendChart title="Disposal Factors" data={disposals?.reasonBreakdown || []} loading={loading} />
            <TrendChart title="Replacement Factors" data={replacements?.reasonBreakdown || []} loading={loading} />
          </div>
        </div>

        {/* Side Column - Alerts */}
        <div className="h-full min-h-[600px] flex flex-col">
          <AlertsPanel />
        </div>
      </div>
    </div>
  );
}
