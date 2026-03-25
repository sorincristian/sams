import React, { useEffect, useState } from "react";
import { LayoutDashboard, Settings } from "lucide-react";
import { api } from "../../api";

import { useSearchParams } from "react-router-dom";
import { KPIBox } from "./components/KPIBox";
import { AlertsPanel } from "./components/AlertsPanel";
import { InventoryTable } from "./components/InventoryTable";
import { PipelineFlow } from "./components/PipelineFlow";
import { TrendChart } from "./components/TrendChart";
import { ConfigureModal } from "./components/ConfigureModal";

export function SeatInsertsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationId = searchParams.get("locationId") || "";
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const [garages, setGarages] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [summary, setSummary] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [replacements, setReplacements] = useState<any>({ reasonBreakdown: [] });
  const [disposals, setDisposals] = useState<any>({ reasonBreakdown: [] });

  const fetchDashboardData = async (isBackground = false) => {
    console.log("Fetching seat inserts data...");
    try {
      if (!isBackground) setLoading(true);
      const query = locationId ? `?locationId=${locationId}` : "";
      const results = await Promise.allSettled([
        api.get(`/seat-inserts/dashboard/summary${query}`),
        api.get(`/seat-inserts/inventory/by-location${query}`),
        api.get(`/seat-inserts/replacements${query}`),
        api.get(`/seat-inserts/disposals${query}`),
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
    console.log("SeatInsertsDashboard configured");
    fetchDashboardData(false);
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [locationId]);

  useEffect(() => {
    api.get("/garages").then(res => {
      setGarages(res.data);
      if (res.data.length === 1 && !searchParams.get("locationId")) {
        setSearchParams({ locationId: res.data[0].id });
      }
    }).catch(console.error);
  }, []);

  if (!summary) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto text-center font-mono">
        Seat Inserts Loading...
      </div>
    );
  }

  if (error) {
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

  const selectedGarageName = locationId ? garages.find(g => g.id === locationId)?.name : null;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            Seat Inserts: {selectedGarageName || "All Garages"}
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
          <button onClick={() => setIsConfigureOpen(true)} className="bg-card border border-border text-foreground hover:bg-muted px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configure
          </button>
        </div>
      </div>

      {/* Top Section - KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Logistics Pipeline</h2>
            <PipelineFlow metrics={{
              dirty: safeSummary.dirtyInventory || 0,
              packed: safeSummary.packedForReturn || 0,
              inTransit: 0,
              returned: safeSummary.returned || 0
            }} onMutationSuccess={fetchDashboardData} />
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Live Inventory by Location</h2>
            <InventoryTable data={inventory || []} loading={loading} onMutationSuccess={fetchDashboardData} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 mt-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Disposals</h2>
              <TrendChart title="Disposal Factors" data={disposals?.reasonBreakdown || []} loading={loading} />
            </div>
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Replacements</h2>
              <TrendChart title="Replacement Factors" data={replacements?.reasonBreakdown || []} loading={loading} />
            </div>
          </div>
        </div>

        {/* Side Column - Alerts */}
        <div className="bg-white rounded-2xl shadow p-6 h-full min-h-[600px] flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Active Exceptions</h2>
          <div className="flex-1 -mx-2 px-2 overflow-y-auto">
            <AlertsPanel locationId={locationId} />
          </div>
        </div>
      </div>

      <ConfigureModal 
        isOpen={isConfigureOpen} 
        onClose={() => setIsConfigureOpen(false)} 
        currentLocationId={locationId} 
        garages={garages} 
        onApply={(locId) => {
          if (locId) setSearchParams({ locationId: locId });
          else setSearchParams({});
        }} 
      />
    </div>
  );
}
