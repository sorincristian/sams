import React, { useEffect, useState } from "react";
import { Plus, Eye, Edit, Send, PackageCheck, RefreshCw, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../api";
import { Button } from "../../../components/ui/Button";

interface OrderLight {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  totalQuantity: number;
  garage: { name: string } | null;
}

export function SeatOrdersPage() {
  const [orders, setOrders] = useState<OrderLight[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/seat-orders");
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: "bg-slate-700/50 text-slate-300 border-slate-600/50",
      PENDING_APPROVAL: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      SENDING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      SENT: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
      PARTIALLY_RECEIVED: "bg-[#34d399]/10 text-[#34d399] border-[#34d399]/20",
      RECEIVED: "bg-[#059669]/20 text-[#10b981] border-[#059669]/30",
      CANCELLED: "bg-slate-800 text-slate-400 border-slate-700"
    };
    
    const classes = map[status] || "bg-slate-800 text-slate-300 border-slate-700";
    return <span className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold tracking-wider uppercase border ${classes}`}>{status.replace(/_/g, " ")}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#f8fafc]">Seat Orders</h1>
          <p className="text-[#94a3b8] mt-1 text-sm font-medium">Manage Harvey Shop procurement and email dispatch natively.</p>
        </div>
        <Button 
          variant="primary"
          onClick={() => navigate("/procurement/seat-orders/new")}
          className="rounded-[14px]"
        >
          <Plus className="w-5 h-5 mr-1" />
          New Order
        </Button>
      </div>

      {/* Surface Panel */}
      <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#1e293b]/50 border-b border-[#334155] text-[#94a3b8] text-[13px] uppercase tracking-wider">
                <th className="p-5 font-semibold">Order ID</th>
                <th className="p-5 font-semibold">Date</th>
                <th className="p-5 font-semibold">Location</th>
                <th className="p-5 font-semibold">Timeline Status</th>
                <th className="p-5 font-semibold text-right">Items</th>
                <th className="p-5 font-semibold text-center w-[220px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
                    <span className="font-medium">Loading orders...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-slate-500 font-medium">
                    No orders found. Click "New Order" to provision seats.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr 
                    key={o.id} 
                    className="hover:bg-[#1e293b]/50 transition-colors group cursor-pointer"
                    onClick={(e) => {
                      // Prevent navigation if clicking a button
                      if ((e.target as HTMLElement).closest('button')) return;
                      navigate(`/procurement/seat-orders/${o.id}`);
                    }}
                  >
                    <td className="p-5 font-medium text-[#f8fafc]">{o.orderNumber}</td>
                    <td className="p-5 text-[#94a3b8]">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="p-5 text-[#94a3b8] font-medium">{o.garage?.name || "Unknown"}</td>
                    <td className="p-5">
                      {getStatusBadge(o.status)}
                    </td>
                    <td className="p-5 text-right font-bold text-[#f8fafc]">{o.totalQuantity} <span className="text-slate-500 font-normal text-sm ml-1">qty</span></td>
                    <td className="p-5">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghostDark"
                          size="sm"
                          onClick={() => navigate(`/procurement/seat-orders/${o.id}`)}
                          className="!px-3 !bg-[#1e293b] hover:!bg-[#334155] border-[#334155]"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {(o.status === "DRAFT" || o.status === "REJECTED") && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => navigate(`/procurement/seat-orders/${o.id}`)}
                            className="!px-3"
                          >
                            <Edit className="w-4 h-4 text-white" />
                          </Button>
                        )}
                        
                        {(o.status === "APPROVED") && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => navigate(`/procurement/seat-orders/${o.id}`)}
                            className="!px-3"
                          >
                            <Send className="w-4 h-4 text-white" />
                          </Button>
                        )}

                        {(o.status === "FAILED") && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => navigate(`/procurement/seat-orders/${o.id}`)}
                            className="!px-3"
                          >
                            <RefreshCw className="w-4 h-4 text-white" />
                          </Button>
                        )}

                        {(o.status === "SENT" || o.status === "PARTIALLY_RECEIVED") && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => navigate(`/procurement/seat-orders/${o.id}`)}
                            className="!px-3"
                          >
                            <PackageCheck className="w-4 h-4 text-white" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
