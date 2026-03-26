import React, { useState, useEffect } from "react";
import { X, PackagePlus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api } from "../../../api";

interface VendorOrdersModalProps {
  locationId: string;
  vendorId?: string;
  onClose: () => void;
  onMutationSuccess: () => void;
}

export function VendorOrdersModal({ locationId, vendorId, onClose, onMutationSuccess }: VendorOrdersModalProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [locationId, vendorId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let url = `/seat-inserts/vendor-orders?garageId=${locationId}`;
      if (vendorId) url += `&vendorId=${vendorId}`;
      const res = await api.get(url);
      setOrders(res.data);
    } catch (e: any) {
      alert("Failed to fetch vendor orders: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveOrder = async (id: string, items: any[]) => {
    if (!window.confirm("Mark all pending lines on this order as received?")) return;
    try {
      const receiveLines = items.map(l => ({ lineId: l.id, receiveQuantity: l.quantityOrdered - l.quantityReceived })).filter(l => l.receiveQuantity > 0);
      
      await api.post(`/seat-inserts/vendor-orders/${id}/receive`, {
        lines: receiveLines,
        notes: "Received via bulk UI action"
      });
      onMutationSuccess();
      fetchOrders();
    } catch (e: any) {
      alert("Failed to receive order: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-5xl max-h-[90vh] rounded-xl shadow-lg border border-border flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">Vendor Orders</h2>
            <p className="text-xs text-muted-foreground mt-1">Manage replacements and new stock from active vendors.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCreating(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold text-sm flex items-center gap-2 shadow-sm hover:bg-primary/90 transition-colors"
            >
              <PackagePlus className="w-4 h-4" /> New Order
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto w-full p-0">
          {loading ? (
             <div className="p-10 text-center animate-pulse text-slate-400 font-medium">Loading vendor orders...</div>
          ) : orders.length === 0 ? (
             <div className="p-10 text-center text-slate-400 font-medium flex flex-col items-center">
               <CheckCircle2 className="w-10 h-10 mb-3 opacity-20" />
               No vendor orders found for your scope.
             </div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-100 text-slate-500 uppercase text-xs sticky top-0 border-b border-border shadow-sm text-nowrap">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order #</th>
                  <th className="px-4 py-3 font-semibold">Target Delivery</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Lines Progress</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map(order => {
                  const isOverdue = new Date(order.expectedDeliveryDate) < new Date() && !["RECEIVED", "CLOSED", "CANCELLED"].includes(order.status);
                  
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-mono font-medium whitespace-nowrap">{order.orderNumber}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-bold" : ""}`}>
                          {isOverdue && <AlertTriangle className="w-3 h-3" />}
                          {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : "TBD"}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap font-bold text-xs">{order.status}</td>
                      <td className="px-4 py-4 min-w-[200px]">
                        <div className="flex flex-col gap-1 w-full mx-auto">
                          {order.lines.map((l: any) => (
                             <div key={l.id} className="flex justify-between text-xs items-center gap-4 bg-white border border-border px-2 py-1 rounded">
                               <span className="font-medium text-slate-700 truncate">{l.seatInsertType?.name || "Insert"}</span>
                               <span className="font-mono">{l.quantityReceived}/{l.quantityOrdered}</span>
                             </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap align-top">
                        <div className="flex justify-end gap-2">
                          {(order.status === "CONFIRMED" || order.status === "PARTIALLY_RECEIVED" || order.status === "SUBMITTED") && (
                            <button onClick={() => handleReceiveOrder(order.id, order.lines)} className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-medium text-xs rounded flex items-center gap-1 transition-colors shadow-sm">
                              <PackagePlus className="w-3 h-3" /> Quick Receive
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
      
      {isCreating && locationId && (
        <CreateVendorOrderModal 
          locationId={locationId}
          onClose={() => setIsCreating(false)}
          onSuccess={() => {
            setIsCreating(false);
            fetchOrders();
            onMutationSuccess();
          }}
        />
      )}
    </div>
  );
}

function CreateVendorOrderModal({ locationId, onClose, onSuccess }: any) {
  const [vendorId, setVendorId] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [vendors, setVendors] = useState<any[]>([]);
  const [insertTypes, setInsertTypes] = useState<any[]>([]);
  
  const [items, setItems] = useState<{seatInsertTypeId: string, quantity: number}[]>([{seatInsertTypeId: "", quantity: 1}]);

  useEffect(() => {
    api.get("/seat-inserts/vendors").then(res => {
      setVendors(res.data);
      if (res.data.length === 1) setVendorId(res.data[0].id);
    }).catch(console.error);

    api.get("/seat-inserts/types").then(res => setInsertTypes(res.data)).catch(console.error);
  }, []);

  const handleSubmit = async () => {
    try {
      const validItems = items.filter(i => i.seatInsertTypeId && i.quantity > 0);
      if (validItems.length === 0) throw new Error("Add at least one item.");
      
      await api.post("/seat-inserts/vendor-orders", {
        garageId: locationId,
        vendorId,
        expectedDeliveryDate: expectedReturnDate,
        items: validItems
      });
      onSuccess();
    } catch(e: any) {
      alert("Failed to create order: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border flex flex-col p-5">
        <h3 className="text-lg font-bold mb-4">Place Order</h3>
        
        <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Vendor</label>
        <select 
          className="w-full border border-input bg-background px-3 py-2 rounded-md mb-4 text-sm" 
          value={vendorId} 
          onChange={e => setVendorId(e.target.value)} 
        >
          <option value="">Select Vendor...</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        
        <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Expected Delivery</label>
        <input 
          type="date"
          className="w-full border border-input bg-background px-3 py-2 rounded-md mb-4 text-sm" 
          value={expectedReturnDate} 
          onChange={e => setExpectedReturnDate(e.target.value)} 
        />
        
        <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Order Lines</label>
        <div className="space-y-2 mb-6 max-h-[30vh] overflow-y-auto">
          {items.map((line, i) => (
             <div key={i} className="flex gap-2">
               <select className="flex-1 border px-2 py-1 rounded text-sm" value={line.seatInsertTypeId} onChange={e => {
                 const newItems = [...items];
                 newItems[i].seatInsertTypeId = e.target.value;
                 setItems(newItems);
               }}>
                 <option value="">Select Insert Type...</option>
                 {insertTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
               <input type="number" min="1" className="w-20 border px-2 py-1 rounded text-sm" value={line.quantity} onChange={e => {
                 const newItems = [...items];
                 newItems[i].quantity = parseInt(e.target.value) || 0;
                 setItems(newItems);
               }} />
               <button onClick={() => {
                 const newItems = items.filter((_, idx) => idx !== i);
                 setItems(newItems);
               }} disabled={items.length === 1} className="p-1 px-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-50">X</button>
             </div>
          ))}
          <button onClick={() => setItems([...items, {seatInsertTypeId: "", quantity: 1}])} className="text-sm font-medium text-blue-600 hover:underline">+ Add Line</button>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-slate-100 rounded-md">Cancel</button>
          <button 
            disabled={!vendorId || !expectedReturnDate} 
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:opacity-50"
          >
            Submit Order
          </button>
        </div>
      </div>
    </div>
  );
}
