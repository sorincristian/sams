import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Plus, Trash2, Mail, ShieldAlert, ShoppingCart, Loader2 } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "../../../api";
import { Button } from "../../../components/ui/Button";
import { CatalogAutocomplete } from "../../../components/CatalogAutocomplete";

interface LineItem {
  id: string; // temp ui id
  seatInsertTypeId: string;
  partNumber: string;
  description: string;
  quantity: string;
  unitCost: number;
}

export function SeatOrderCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [garages, setGarages] = useState<any[]>([]);
  const [catalogParts, setCatalogParts] = useState<any[]>([]);
  
  // To power Autocomplete
  const [queryLocal, setQueryLocal] = useState("");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  const prefillGarageId = location.state?.garageId || "";
  const [garageId, setGarageId] = useState(prefillGarageId);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse location.state once and clear it.
  const [lines, setLines] = useState<LineItem[]>(() => {
    if (location.state?.item) {
      return [{
        id: Math.random().toString(36).slice(2),
        seatInsertTypeId: location.state.item.id,
        partNumber: location.state.item.partNumber || "SKU",
        description: location.state.item.description || "Prefilled Item",
        quantity: "1",
        unitCost: location.state.item.unitCost || 0
      }];
    }
    return [];
  });

  useEffect(() => {
    api.get("/api/garages").then((res: any) => setGarages(res.data)).catch(console.error);
    api.get("/api/seat-insert-types").then((res: any) => setCatalogParts(res.data)).catch(console.error);

    // Dedup route state
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const totalQuantity = lines.reduce((sum, l) => sum + Number(l.quantity || 0), 0);
  const totalCost = lines.reduce((sum, l) => sum + (Number(l.quantity || 0) * l.unitCost), 0);
  const requiresApproval = totalQuantity > 20 || totalCost > 1000;

  const handleAddLine = () => {
    if (!selectedPartId) {
      setError("Please select a valid part from the catalog to add.");
      return;
    }
    const part = catalogParts.find(p => p.id === selectedPartId);
    if (!part) return;

    if (lines.some(l => l.seatInsertTypeId === part.id)) {
      setError("This part is already in the order. Please adjust the quantity instead.");
      return;
    }

    setLines([...lines, {
      id: Math.random().toString(36).slice(2),
      seatInsertTypeId: part.id,
      partNumber: part.partNumber,
      description: part.description,
      quantity: "1",
      unitCost: part.unitCost || 0
    }]);
    setSelectedPartId(null);
    setQueryLocal("");
    setError(null);
  };

  const handleUpdateQuantity = (id: string, qty: string) => {
    setLines(lines.map(l => l.id === id ? { ...l, quantity: qty } : l));
  };

  const handleRemoveLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const handleSave = async () => {
    if (saving) return;

    if (!garageId) {
      setError("Please select a Requesting Garage.");
      return;
    }
    if (lines.length === 0) {
      setError("Please add at least one line item.");
      return;
    }
    const hasInvalidQty = lines.some(l => Number(l.quantity || 0) < 1);
    if (hasInvalidQty) {
      setError("All line items must have a valid quantity of at least 1.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payloadLines = lines.map(l => ({
        seatInsertTypeId: l.seatInsertTypeId,
        quantity: Number(l.quantity || 0),
        unitCost: l.unitCost,
        description: l.description
      }));

      const res = await api.post("/api/seat-orders", {
        garageId,
        notes: notes.trim() || undefined,
        lines: payloadLines
      });
      navigate(`/procurement/seat-orders/${res.data.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to create order");
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      
      {/* Header Block */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghostDark" 
          onClick={() => navigate("/procurement/seat-orders")}
          className="!p-3 rounded-full border-[#334155] !bg-[#1e293b]"
          aria-label="Back to orders"
        >
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#f8fafc] flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-blue-500" />
            Create Seat Order
          </h1>
          <p className="text-[#94a3b8] mt-1 text-sm font-medium">Draft a new procurement request to Harvey Shop.</p>
        </div>
        <div className="ml-auto">
          <span className="px-3 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-[8px] text-[11px] font-bold tracking-wider uppercase">DRAFT</span>
        </div>
      </div>

      {error && (
        <div className="px-5 py-4 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center">
          <ShieldAlert className="w-5 h-5 mr-3 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Form Body */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Order Context */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-[#f8fafc] mb-6">Order Context</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[13px] tracking-[0.01em] text-[#cbd5e1] mb-2 font-medium">
                  Requesting Garage
                </label>
                <select 
                  value={garageId}
                  onChange={e => setGarageId(e.target.value)}
                  className="w-full bg-[#1e293b]/50 border border-slate-400/20 rounded-[14px] text-[#f8fafc] min-h-[52px] px-4 py-[14px] text-[16px] outline-none transition-all focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/15 cursor-pointer"
                >
                  <option value="">-- Select Garage --</option>
                  {garages.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="row-span-2">
                <label className="block text-[13px] tracking-[0.01em] text-[#cbd5e1] mb-2 font-medium">
                  Delivery Instructions / Notes
                </label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-[#1e293b]/50 border border-slate-400/20 rounded-[14px] text-[#f8fafc] h-full min-h-[120px] px-4 py-[14px] text-[16px] outline-none transition-all placeholder-slate-500 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/15 resize-y"
                  placeholder="e.g. Rush delivery needed, deliver to bay 4"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 sm:p-8 border-b border-[#334155] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-bold text-[#f8fafc] flex items-center gap-2">Line Items</h2>
            </div>
            
            <div className="p-4 sm:p-6 bg-[#1e293b]/30">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 catalog-autocomplete-dark-override">
                  <CatalogAutocomplete
                    catalogParts={catalogParts}
                    queryLocal={queryLocal}
                    setQueryLocal={setQueryLocal}
                    selectedPartId={selectedPartId}
                    setSelectedPartId={setSelectedPartId}
                    placeholder="Search Seat Insert part # or description..."
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleAddLine} 
                  className="shrink-0 bg-[#0f172a] text-[#f8fafc] border border-slate-400/20 hover:bg-slate-800"
                >
                  <Plus className="w-4 h-4 text-blue-400" />
                  Add Row
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1e293b]/50 border-y border-[#334155] text-[#94a3b8] text-[13px] uppercase tracking-wider">
                    <th className="p-4 pl-6 sm:pl-8 font-semibold">SKU / Part Number</th>
                    <th className="p-4 font-semibold">Description</th>
                    <th className="p-4 font-semibold w-32">Quantity</th>
                    <th className="p-4 font-semibold text-right w-32">Unit Cost</th>
                    <th className="p-4 pr-6 sm:pr-8 font-semibold text-right w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/50">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500 font-medium">
                        Order is empty. Add a line item from the catalog.
                      </td>
                    </tr>
                  ) : (
                    lines.map((l) => (
                      <tr key={l.id} className="hover:bg-[#1e293b]/20 transition-colors">
                        <td className="p-4 pl-6 sm:pl-8 font-bold text-[#cbd5e1]">{l.partNumber}</td>
                        <td className="p-4 text-[#94a3b8] font-medium">{l.description}</td>
                        <td className="p-4">
                          <input
                            type="number"
                            min="1"
                            value={l.quantity}
                            onChange={(e) => handleUpdateQuantity(l.id, e.target.value)}
                            className="w-full bg-[#0f172a] border border-slate-400/30 rounded-lg text-[#f8fafc] px-3 py-2 text-center font-bold focus:border-blue-500 focus:outline-none"
                            aria-label="Quantity"
                          />
                        </td>
                        <td className="p-4 text-right text-[#94a3b8] font-mono">${l.unitCost.toFixed(2)}</td>
                        <td className="p-4 pr-6 sm:pr-8 text-right">
                          <button 
                            onClick={() => handleRemoveLine(l.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition"
                            aria-label={`Remove ${l.partNumber}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Totals anchor */}
            {lines.length > 0 && (
              <div className="bg-[#1e293b]/80 p-6 flex justify-end gap-10 border-t border-[#334155]">
                <div className="text-right">
                  <div className="text-[12px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Total Items</div>
                  <div className="text-xl font-bold text-[#f8fafc]">{totalQuantity}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Estimated Cost</div>
                  <div className="text-xl font-black text-[#f8fafc]">${totalCost.toFixed(2)}</div>
                </div>
              </div>
            )}
            
          </div>

        </div>

        {/* Sidebar Context */}
        <div className="lg:col-span-4 space-y-6">

          {/* Email Preview Status */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl p-6">
            <h3 className="text-[15px] font-bold text-[#f8fafc] flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-blue-400" />
              Email Preview Tracker
            </h3>
            <div className="p-4 rounded-xl border border-dashed border-[#334155] bg-[#1e293b]/30 text-center">
              <p className="text-sm font-medium text-slate-400">Preview rendering is unavailable until the order draft is saved.</p>
            </div>
          </div>

          {/* Approval Panel */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl p-6">
            <h3 className="text-[15px] font-bold text-[#f8fafc] flex items-center gap-2 mb-4">
              <ShieldAlert className={`w-5 h-5 ${requiresApproval ? 'text-amber-500' : 'text-slate-400'}`} />
              Approval Requirements
            </h3>
            
            {requiresApproval ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-bold text-amber-500 mb-1">Manager Approval Required</p>
                <div className="text-[13px] text-amber-500/80 font-medium">
                  {totalQuantity > 20 && <div>• Total quantity exceeds 20 items</div>}
                  {totalCost > 1000 && <div>• Total cost exceeds $1,000 threshold</div>}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-sm font-medium text-slate-400">Order falls within auto-approval thresholds. No explicit manager override needed.</p>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="sticky top-6">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || lines.length === 0}
              className="w-full rounded-[16px] h-[56px] text-[16px] shadow-lg shadow-blue-500/20"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              {saving ? "Saving Draft..." : "Save Draft"}
            </Button>
            <p className="text-center text-xs text-slate-500 font-medium mt-3">Saves securely in preparation for review and dispatch.</p>
          </div>

        </div>

      </div>
    </div>
  );
}
