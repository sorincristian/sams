import React, { useState, useEffect } from "react";
import { X, Truck, Package, Hammer, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "../../../api";

interface BatchesModalProps {
  onClose: () => void;
  onMutationSuccess: () => void;
}

export function BatchesModal({ onClose, onMutationSuccess }: BatchesModalProps) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await api.get("/seat-inserts/reupholstery/batches");
      setBatches(res.data);
    } catch (e: any) {
      alert("Failed to fetch batches: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!window.confirm(`Transition batch to ${newStatus}?`)) return;
    try {
      await api.put(`/seat-inserts/batches/${id}/status`, { status: newStatus });
      onMutationSuccess();
      fetchBatches();
    } catch (e: any) {
      alert("Failed to update batch: " + e.message);
    }
  };

  const handleMarkReturned = async (id: string) => {
    if (!window.confirm(`Mark batch as RETURNED and restore inventory?`)) return;
    try {
      await api.post(`/seat-inserts/batches/${id}/return`);
      onMutationSuccess();
      fetchBatches();
    } catch (e: any) {
      alert("Failed to process batch return: " + e.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AWAITING_PICKUP": return <span className="text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded text-xs font-bold border border-yellow-200">AWAITING PICKUP</span>;
      case "IN_TRANSIT": return <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-xs font-bold border border-blue-200">IN TRANSIT</span>;
      case "IN_PRODUCTION": return <span className="text-purple-700 bg-purple-100 px-2 py-0.5 rounded text-xs font-bold border border-purple-200">IN PRODUCTION</span>;
      case "RETURNED": return <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200">RETURNED</span>;
      default: return <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-5xl max-h-[90vh] rounded-xl shadow-lg border border-border flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">Manage Reupholstery Batches</h2>
            <p className="text-xs text-muted-foreground mt-1">Track and advance bulk shipments through the vendor pipeline.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto w-full p-0">
          {loading ? (
             <div className="p-10 text-center animate-pulse text-slate-400 font-medium">Loading active batches...</div>
          ) : batches.length === 0 ? (
             <div className="p-10 text-center text-slate-400 font-medium flex flex-col items-center">
               <CheckCircle2 className="w-10 h-10 mb-3 opacity-20" />
               No batches currently in pipeline.
             </div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-100 text-slate-500 uppercase text-xs sticky top-0 border-b border-border shadow-sm text-nowrap">
                <tr>
                  <th className="px-4 py-3 font-semibold">Batch Number</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Seat Profile</th>
                  <th className="px-4 py-3 font-semibold text-center">Qty</th>
                  <th className="px-4 py-3 font-semibold">Target Return</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Pipeline Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batches.map(batch => {
                  const isOverdue = new Date(batch.expectedReturnDate) < new Date() && batch.status !== "RETURNED";
                  
                  return (
                    <tr key={batch.id} className={`hover:bg-slate-50 transition-colors ${batch.status === "RETURNED" ? "opacity-60" : ""}`}>
                      <td className="px-4 py-4 font-mono font-medium whitespace-nowrap">{batch.batchNumber}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{batch.location?.name || "Unknown"}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{batch.seatType} - {batch.color}</td>
                      <td className="px-4 py-4 text-center font-bold px-2">{batch._count?.inserts || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-bold" : ""}`}>
                          {isOverdue && <AlertTriangle className="w-3 h-3" />}
                          {new Date(batch.expectedReturnDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(batch.status)}</td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          {batch.status === "AWAITING_PICKUP" && (
                            <button onClick={() => handleUpdateStatus(batch.id, "IN_TRANSIT")} className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium text-xs rounded flex items-center gap-1 transition-colors">
                              <Truck className="w-3 h-3" /> Ship
                            </button>
                          )}
                          {batch.status === "IN_TRANSIT" && (
                            <button onClick={() => handleUpdateStatus(batch.id, "IN_PRODUCTION")} className="px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium text-xs rounded flex items-center gap-1 transition-colors">
                              <Hammer className="w-3 h-3" /> Arrived
                            </button>
                          )}
                          {batch.status === "IN_PRODUCTION" && (
                            <button onClick={() => handleMarkReturned(batch.id)} className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-medium text-xs rounded flex items-center gap-1 transition-colors shadow-sm">
                              <CheckCircle2 className="w-3 h-3" /> Mark Returned
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
