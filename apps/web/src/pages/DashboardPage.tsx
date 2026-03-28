import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { 
  Building2, Bus, PackageSearch, AlertTriangle, ArrowRightLeft, 
  Settings2, Activity, Clock, Box, PlusCircle, PenTool, LayoutDashboard, 
  Truck, ScrollText, CheckCircle2, ChevronRight, FileDown, UploadCloud
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { VendorOrdersModal } from "../modules/seat-inserts/components/VendorOrdersModal";

// Interfaces mapped from multiple endpoints
interface DashboardData {
  counts: { garages: number; buses: number; seatInsertTypes: number; openWorkOrders: number };
  lowStock: { garage: string; partNumber: string; quantityOnHand: number; minStockLevel: number }[];
  recentWorkOrders: { id: string; workOrderNumber: string; bus: { fleetNumber: string }; status: string; priority?: string }[];
}

export function DashboardPage() {
  const navigate = useNavigate();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [vendorOrders, setVendorOrders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, voRes, txRes, catRes] = await Promise.allSettled([
        api.get("/dashboard"),
        api.get("/seat-inserts/vendor-orders"),
        api.get("/inventory/transactions"),
        api.get("/v1/catalog")
      ]);

      if (dashRes.status === "fulfilled") setData(dashRes.value.data);
      if (voRes.status === "fulfilled") setVendorOrders(voRes.value.data);
      if (txRes.status === "fulfilled") setTransactions(txRes.value.data);
      if (catRes.status === "fulfilled") setCatalog(catRes.value.data);
      
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Dashboard fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <Activity className="w-10 h-10 animate-pulse mb-4" />
        <h3 className="text-lg font-semibold animate-pulse">Initializing Operations Center...</h3>
      </div>
    );
  }

  // Derived KPI metrics
  const missingDiagrams = catalog.filter(p => !p._count?.catalogAttachments && !p.catalogAttachments?.length).length;
  const pendingOrders = vendorOrders.filter(o => o.status !== "RECEIVED" && o.status !== "CLOSED").length;
  const txToday = transactions.filter(t => new Date(t.createdAt).toDateString() === new Date().toDateString()).length;
  const lowStockThreshold = data?.lowStock?.length || 0;

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* 1. Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-slate-900 m-0">Operations Command Center</h1>
          <div className="text-slate-500 font-medium flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            System Live Data • Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchData} loading={loading}>
            Refresh Sync
          </Button>
          <Button variant="primary" onClick={() => navigate("/work-orders")}>
            <PenTool className="w-4 h-4" /> Resolve Issues
          </Button>
        </div>
      </div>

      {/* 2. Quick Actions */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => navigate("/work-orders")} className="flex items-center gap-2 min-w-max px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all font-semibold text-sm text-slate-700">
          <Settings2 className="w-4 h-4 text-blue-600" /> Create Work Order
        </button>
        <button onClick={() => navigate("/catalog")} className="flex items-center gap-2 min-w-max px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-500 hover:shadow-md transition-all font-semibold text-sm text-slate-700">
          <PlusCircle className="w-4 h-4 text-emerald-600" /> Catalog New Part
        </button>
        <button onClick={() => setIsVendorModalOpen(true)} className="flex items-center gap-2 min-w-max px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-purple-500 hover:shadow-md transition-all font-semibold text-sm text-slate-700">
          <Truck className="w-4 h-4 text-purple-600" /> Manage Vendors
        </button>
        <button onClick={() => navigate("/transactions")} className="flex items-center gap-2 min-w-max px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-orange-500 hover:shadow-md transition-all font-semibold text-sm text-slate-700">
          <ScrollText className="w-4 h-4 text-orange-600" /> View Ledger
        </button>
        <button onClick={() => navigate("/import-history")} className="flex items-center gap-2 min-w-max px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-500 hover:shadow-md transition-all font-semibold text-sm text-slate-700">
          <UploadCloud className="w-4 h-4 text-slate-600" /> Ext. Import Jobs
        </button>
      </div>

      {/* 3. Operational KPIs Array */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Garages", val: data?.counts?.garages || 0, icon: <Building2 className="w-5 h-5 opacity-70" />, color: "bg-blue-50 text-blue-700", border: "border-blue-100" },
          { label: "Fleet Vehicles", val: data?.counts?.buses || 0, icon: <Bus className="w-5 h-5 opacity-70" />, color: "bg-blue-50 text-blue-700", border: "border-blue-100" },
          { label: "Verified Insert Types", val: data?.counts?.seatInsertTypes || 0, icon: <Box className="w-5 h-5 opacity-70" />, color: "bg-blue-50 text-blue-700", border: "border-blue-100" },
          { label: "Open Work Orders", val: data?.counts?.openWorkOrders || 0, icon: <Settings2 className="w-5 h-5 opacity-80" />, color: data?.counts?.openWorkOrders ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-700", border: data?.counts?.openWorkOrders ? "border-amber-200" : "border-slate-200" },
          { label: "Low Stock Triggers", val: lowStockThreshold, icon: <AlertTriangle className="w-5 h-5 opacity-80" />, color: lowStockThreshold > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700", border: lowStockThreshold > 0 ? "border-red-200" : "border-emerald-200" },
          { label: "Pending Vendor Deliveries", val: pendingOrders, icon: <Truck className="w-5 h-5 opacity-80" />, color: "bg-indigo-50 text-indigo-700", border: "border-indigo-100" },
          { label: "Ledger Actions Today", val: txToday, icon: <ArrowRightLeft className="w-5 h-5 opacity-80" />, color: "bg-slate-50 text-slate-700", border: "border-slate-200" },
          { label: "Parts Missing Diagrams", val: missingDiagrams, icon: <FileDown className="w-5 h-5 opacity-80" />, color: missingDiagrams > 0 ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700", border: missingDiagrams > 0 ? "border-orange-200" : "border-emerald-200" }
        ].map((kpi, idx) => (
          <div key={idx} className={`flex flex-col p-5 bg-white rounded-2xl border ${kpi.border} shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group`}>
            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-20 transition-transform group-hover:scale-150 ${kpi.color}`}></div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${kpi.color}`}>{kpi.icon}</div>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{kpi.label}</span>
            </div>
            <div className={`text-4xl font-extrabold ${kpi.color.includes("text-slate") ? "text-slate-900" : kpi.color.split(" ")[1]}`}>
              {kpi.val.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 4. Actionable Target Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Urgent Actions: Low Stock */}
        <div className="flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 min-h-[400px]">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Low Stock Triggers</h3>
            <button onClick={() => navigate("/inventory?lowStock=1")} className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wide">Resolve All</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {data?.lowStock.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-50" />
                <span className="font-semibold">Inventory is perfectly balanced.</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {data?.lowStock.slice(0, 8).map(row => (
                    <tr key={`${row.garage}-${row.partNumber}`} onClick={() => navigate("/inventory")} className="hover:bg-slate-50 cursor-pointer group">
                      <td className="px-5 py-3 align-top">
                        <div className="font-bold text-slate-900">{row.partNumber}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{row.garage}</div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 text-red-700 font-bold border border-red-100">
                          {row.quantityOnHand} <span className="text-[10px] text-red-400 opacity-80 uppercase tracking-wider font-semibold">/ {row.minStockLevel} MIN</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Work Orders */}
        <div className="flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 min-h-[400px]">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><Settings2 className="w-4 h-4 text-slate-500" /> Active Work Orders</h3>
            <button onClick={() => navigate("/work-orders")} className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wide">View Board</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {data?.recentWorkOrders.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-3">
                <CheckCircle2 className="w-10 h-10 text-slate-300" />
                <span className="font-semibold text-sm">No active tasks currently open.</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {data?.recentWorkOrders.slice(0, 8).map(wo => (
                    <tr key={wo.id} onClick={() => navigate(`/work-orders/${wo.id}`)} className="hover:bg-slate-50 cursor-pointer group">
                      <td className="px-5 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">WO {wo.workOrderNumber}</span>
                          {wo.priority === "HIGH" && <span className="bg-red-500 h-2 w-2 rounded-full" title="High Priority"></span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">Bus {wo.bus.fleetNumber}</div>
                      </td>
                      <td className="px-5 py-3 text-right align-middle">
                         <span className={`inline-flex items-center justify-center px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold tracking-wider uppercase`}>
                           {wo.status}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Ledger Pulse */}
        <div className="flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 min-h-[400px]">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-slate-500" /> Ledger Pulse</h3>
            <button onClick={() => navigate("/transactions")} className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wide">Full Ledger</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-semibold text-sm mt-8">No recent activity detected.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {transactions.slice(0, 8).map((tx, idx) => (
                  <div key={idx} className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm text-slate-900 truncate">Part {tx.seatInsertType?.partNumber}</span>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${tx.type === 'ISSUE' || tx.type.includes('OUT') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {tx.type} {tx.type === 'ISSUE' || tx.type.includes('OUT') ? `-${tx.quantity}` : `+${tx.quantity}`}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex justify-between">
                      <span className="truncate">{tx.garage?.name}</span>
                      <span className="text-slate-400 whitespace-nowrap ml-2"><Clock className="w-3 h-3 inline mr-1 -mt-0.5" />{new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
      
      {isVendorModalOpen && (
        <VendorOrdersModal 
          locationId=""
          onClose={() => setIsVendorModalOpen(false)}
          onMutationSuccess={fetchData}
        />
      )}
    </div>
  );
}
