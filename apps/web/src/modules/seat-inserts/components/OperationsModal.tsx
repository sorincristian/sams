import React, { useState, useEffect } from "react";
import { X, Search, CheckSquare, Square, Trash2, ArrowRightCircle, AlertTriangle } from "lucide-react";
import { api } from "../../../api";

interface OperationsModalProps {
  locationId: string;
  locationName: string;
  onClose: () => void;
  onMutationSuccess: () => void;
}

export function OperationsModal({ locationId, locationName, onClose, onMutationSuccess }: OperationsModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Sub-modals
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [disposeModalOpen, setDisposeModalOpen] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [locationId]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/seat-inserts/items?locationId=${locationId}`);
      setItems(res.data);
      setSelected(new Set());
    } catch (e: any) {
      alert("Failed to fetch location items: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(i => i.id)));
  };

  // Actions
  const handleMarkDirty = async () => {
    if (!window.confirm(`Mark ${selected.size} items as DIRTY?`)) return;
    try {
      await Promise.all(Array.from(selected).map(id => api.post(`/seat-inserts/${id}/mark-dirty`)));
      onMutationSuccess();
      fetchItems();
    } catch (e: any) {
      alert("Failed to mark items dirty: " + e.message);
    }
  };

  const handleDispose = async (reason: string, notes: string) => {
    try {
      await Promise.all(Array.from(selected).map(id => api.post(`/seat-inserts/${id}/dispose`, { locationId, reason, notes })));
      setDisposeModalOpen(false);
      onMutationSuccess();
      fetchItems();
    } catch (e: any) {
      alert("Failed to dispose items: " + e.message);
    }
  };

  const handleCreateBatch = async (vendorId: string, expectedReturnDate: string) => {
    try {
      await api.post(`/seat-inserts/batches/send-to-vendor`, {
        insertIds: Array.from(selected),
        garageId: locationId,
        vendorId,
        expectedReturnDate,
      });
      setBatchModalOpen(false);
      onMutationSuccess();
      fetchItems();
    } catch (e: any) {
      alert("Failed to create batch: " + e.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW": return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">NEW</span>;
      case "DIRTY": return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">DIRTY</span>;
      case "PACKED_FOR_RETURN": return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">PACKED</span>;
      case "RETURNED": return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">RETURNED</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a]/95 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-xl shadow-lg border border-border flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">Operations: {locationName}</h2>
            <p className="text-xs text-muted-foreground mt-1">Select items to transition state lifecycles directly.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-3 border-b border-border bg-white flex justify-between items-center">
          <div className="flex items-center gap-3 text-sm font-medium">
            <button onClick={selectAll} className="flex items-center gap-2 text-primary hover:underline">
              {selected.size === items.length && items.length > 0 ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4"/>}
              {selected.size} Selected
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={selected.size === 0} 
              onClick={handleMarkDirty}
              className="bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              Mark Dirty
            </button>
            <button 
              disabled={selected.size === 0}
              onClick={() => setBatchModalOpen(true)}
              className="bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              Pack Batch
            </button>
            <button 
              disabled={selected.size === 0}
              onClick={() => setDisposeModalOpen(true)}
              className="bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              Dispose
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-0 bg-slate-50/30">
          {loading ? (
            <div className="p-10 text-center animate-pulse text-slate-400 font-medium">Loading items...</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-medium">No items found at this location.</div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-100 text-slate-500 uppercase text-xs sticky top-0 border-b border-border">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3 font-semibold">Seat ID</th>
                  <th className="px-4 py-3 font-semibold">Bus</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Color</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className={`border-b border-border hover:bg-slate-50 transition-colors ${selected.has(item.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(item.id)} className="text-slate-400 hover:text-primary">
                        {selected.has(item.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono opacity-70">{item.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 font-medium">{item.installedBus?.fleetNumber || "-"}</td>
                    <td className="px-4 py-3">{item.seatType}</td>
                    <td className="px-4 py-3">{item.color}</td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {batchModalOpen && (
        <CreateBatchForm 
          onCancel={() => setBatchModalOpen(false)} 
          onSubmit={handleCreateBatch} 
          count={selected.size} 
        />
      )}

      {disposeModalOpen && (
        <DisposeForm 
          onCancel={() => setDisposeModalOpen(false)} 
          onSubmit={handleDispose} 
          count={selected.size} 
        />
      )}
    </div>
  );
}

function CreateBatchForm({ onCancel, onSubmit, count }: any) {
  const [vendorId, setVendorId] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [vendors, setVendors] = useState<any[]>([]);

  useEffect(() => {
    api.get("/seat-inserts/vendors").then(res => {
      setVendors(res.data);
      if (res.data.length === 1) {
        setVendorId(res.data[0].id);
      }
    }).catch(console.error);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-[#0f172a]/95 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-sm rounded-xl shadow-xl border border-border flex flex-col p-5">
        <h3 className="text-lg font-bold mb-4">Create Reupholstery Batch</h3>
        <p className="text-sm text-slate-500 mb-4">Packing {count} items for external processing.</p>
        
        <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Vendor</label>
        <select 
          autoFocus
          className="w-full bg-[#0f172a] text-white border border-[#334155] px-3 py-2 rounded-md mb-4 text-sm outline-none focus:border-blue-500" 
          value={vendorId} 
          onChange={e => setVendorId(e.target.value)} 
        >
          <option value="">Select Vendor...</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        
        <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Expected Return</label>
        <input 
          type="date"
          className="w-full bg-[#0f172a] text-white border border-[#334155] px-3 py-2 rounded-md mb-6 text-sm outline-none focus:border-blue-500" 
          value={expectedReturnDate} 
          onChange={e => setExpectedReturnDate(e.target.value)} 
        />
        
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium hover:bg-slate-100 rounded-md">Cancel</button>
          <button 
            disabled={!vendorId || !expectedReturnDate} 
            onClick={() => onSubmit(vendorId, expectedReturnDate)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:opacity-50"
          >
            Create Batch
          </button>
        </div>
      </div>
    </div>
  );
}

function DisposeForm({ onCancel, onSubmit, count }: any) {
  const [reason, setReason] = useState("TORN");
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-sm rounded-xl shadow-xl border border-red-500/20 flex flex-col p-5">
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-lg font-bold">Dispose Items</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">Permanently disposing {count} items. This cannot be undone.</p>
        
        <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Reason</label>
        <select 
          className="w-full bg-[#0f172a] text-white border border-[#334155] px-3 py-2 rounded-md mb-4 text-sm outline-none focus:border-blue-500" 
          value={reason} 
          onChange={e => setReason(e.target.value)}
        >
          <option value="TORN">Torn Fabric</option>
          <option value="GRAFFITI">Permanent Graffiti</option>
          <option value="FOAM_DAMAGE">Foam / Structural Damage</option>
          <option value="HARDWARE_DAMAGE">Vandalized Hardware</option>
          <option value="OTHER">Other</option>
        </select>
        
        <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Notes (Optional)</label>
        <textarea 
          className="w-full bg-[#0f172a] text-white border border-[#334155] placeholder-slate-400 px-3 py-2 rounded-md mb-6 text-sm resize-none outline-none focus:border-blue-500" 
          rows={3}
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
        />
        
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium hover:bg-slate-100 rounded-md">Cancel</button>
          <button 
            onClick={() => onSubmit(reason, notes)}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-md"
          >
            Confirm Disposal
          </button>
        </div>
      </div>
    </div>
  );
}
