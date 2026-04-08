import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Save, AlertTriangle, ArrowRight } from 'lucide-react';

interface SeatInsertItem {
  seatInsertTypeId: string;
  partNumber: string;
  description: string;
  busRangeLabel: string;
  currentQty: number;
}

export function InventoryAddPage() {
  const navigate = useNavigate();

  const [garages, setGarages] = useState<{ id: string; name: string }[]>([]);
  const [busRanges, setBusRanges] = useState<{ id: string; fleetRangeLabel: string; manufacturer: string }[]>([]);
  
  const [selectedGarageId, setSelectedGarageId] = useState('');
  const [selectedBusRangeId, setSelectedBusRangeId] = useState('');
  
  const [globalCatalog, setGlobalCatalog] = useState<any[]>([]);
  const [garageInventory, setGarageInventory] = useState<Record<string, number>>({});
  
  const [quantities, setQuantities] = useState<Record<string, string>>({}); // Use string for blank default
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [fetchingItems, setFetchingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/garages'),
      api.get('/v1/catalog/bus-compat'),
      api.get('/v1/catalog')
    ])
      .then(([gRes, bRes, cRes]) => {
        setGarages(gRes.data);
        setBusRanges(bRes.data);
        setGlobalCatalog(cRes.data);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load system metadata.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedGarageId) {
      setFetchingItems(true);
      api.get('/inventory')
        .then(res => {
          const map: Record<string, number> = {};
          res.data.forEach((i: any) => {
            if (i.garageId === selectedGarageId) map[i.seatInsertTypeId] = i.quantityOnHand;
          });
          setGarageInventory(map);
        })
        .catch(console.error)
        .finally(() => setFetchingItems(false));
    } else {
      setGarageInventory({});
    }
  }, [selectedGarageId]);

  const items: SeatInsertItem[] = useMemo(() => {
    let filtered = globalCatalog;
    if (selectedBusRangeId) {
      const range = busRanges.find(b => b.id === selectedBusRangeId);
      if (range) {
        filtered = filtered.filter(p => (p.busRanges || []).includes(range.fleetRangeLabel));
      }
    }
    return filtered.map(p => ({
      seatInsertTypeId: p.id,
      partNumber: p.partNumber,
      description: p.description,
      busRangeLabel: (p.busRanges || []).join(', '),
      currentQty: garageInventory[p.id] || 0
    }));
  }, [globalCatalog, selectedBusRangeId, busRanges, garageInventory]);

  const handleQuantityChange = (seatInsertTypeId: string, val: string) => {
    if (val === '') {
      setQuantities(prev => ({ ...prev, [seatInsertTypeId]: '' }));
      return;
    }
    const num = parseInt(val, 10);
    // Prevent negative numbers entirely in the UI
    if (!isNaN(num) && num >= 0) {
      setQuantities(prev => ({ ...prev, [seatInsertTypeId]: num.toString() }));
    }
  };

  const hasAnyPositiveQty = useMemo(() => {
    return Object.values(quantities).some(v => v !== '' && parseInt(v, 10) > 0);
  }, [quantities]);

  const handleSubmit = async () => {
    if (!selectedGarageId) {
      setError("Garage must be selected.");
      return;
    }
    
    if (!hasAnyPositiveQty) {
      setError("Please enter a positive numeric quantity for at least one item.");
      return;
    }

    setSaving(true);
    setError(null);

    const payloadItems = Object.entries(quantities)
      .map(([id, q]) => ({ seatInsertTypeId: id, quantity: parseInt(q, 10) }))
      .filter(i => i.quantity > 0 && !isNaN(i.quantity));

    try {
      await api.post('/inventory/seat-inserts/intake', {
        garageId: selectedGarageId,
        busCompatibilityId: selectedBusRangeId || null,
        notes: notes.trim() || undefined,
        items: payloadItems
      });

      navigate('/inventory');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || 'Failed to submit intake.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 max-w-[1400px] mx-auto muted">Loading intake form...</div>;
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghostDark" 
            onClick={() => navigate("/inventory")}
            className="shrink-0 !w-11 !h-11 !p-0 rounded-full border-[#334155] !bg-[#1e293b]"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#f8fafc] leading-tight flex items-center gap-3">
              Add Inventory
            </h1>
            <p className="text-[#94a3b8] mt-1 text-sm font-medium">Bulk intake compatible seat inserts into a specific facility.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-5 py-4 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center">
          <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
          {error}
        </div>
      )}

      <div className="card space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300">Target Garage</label>
            <select
              className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2.5 text-slate-100 font-medium h-[46px]"
              value={selectedGarageId}
              onChange={(e) => setSelectedGarageId(e.target.value)}
            >
              <option value="">-- Select a Garage --</option>
              {garages.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300">Fleet Bus Range Context</label>
            <select
              className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2.5 text-slate-100 font-medium h-[46px]"
              value={selectedBusRangeId}
              onChange={(e) => setSelectedBusRangeId(e.target.value)}
              disabled={!selectedGarageId}
            >
              <option value="">-- View Full Catalog (Optional Filter) --</option>
              {busRanges.map(b => (
                <option key={b.id} value={b.id}>{b.manufacturer} - {b.fleetRangeLabel}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden border border-emerald-900/40">
        <div className="px-6 py-4 border-b border-emerald-900/30 bg-emerald-900/10 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-emerald-300 flex items-center gap-2">
              Full Catalog Items
            </h2>
            <p className="text-sm text-emerald-400/70 font-medium mt-0.5">Filter applied: {selectedBusRangeId ? busRanges.find(b => b.id === selectedBusRangeId)?.fleetRangeLabel : 'None (Showing All)'}</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
            {fetchingItems ? (
              <div className="p-6 text-sm font-medium text-emerald-500/60">Resolving dependencies...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-sm font-medium text-emerald-500/60">No seat inserts map to this fleet range currently.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1e293b]/50 border-b border-[#334155] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3 whitespace-nowrap">Part Number</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Current Stock</th>
                    <th className="px-6 py-3 text-right text-emerald-400">Intake Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]">
                  {items.map(item => (
                    <tr key={item.seatInsertTypeId} className="hover:bg-emerald-900/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-200">{item.partNumber}</td>
                      <td className="px-6 py-4 text-sm text-slate-300 font-medium">{item.description}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-400">{item.currentQty}</td>
                      <td className="px-6 py-4 text-right w-48">
                        <div className="flex justify-end">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            className="w-24 bg-[#0f172a] border border-emerald-500/40 rounded-md px-3 py-1.5 text-right font-bold text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 placeholder:text-slate-600"
                            value={quantities[item.seatInsertTypeId] || ''}
                            onChange={(e) => handleQuantityChange(item.seatInsertTypeId, e.target.value)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="p-6 bg-[#1e293b]/30 border-t border-[#334155]">
             <div className="space-y-2 max-w-lg mb-6">
               <label className="text-sm font-bold text-slate-300">Intake Notes (Optional)</label>
               <textarea 
                  className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2.5 text-slate-100 font-medium h-[80px] resize-none"
                  placeholder="E.g., Delivered via transport #842"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
               />
             </div>
             
             <div className="flex items-center justify-end border-t border-[#374151] pt-6 gap-4">
                <Button variant="ghostDark" onClick={() => navigate('/inventory')} disabled={saving}>Cancel</Button>
                <Button 
                  variant="primary" 
                  disabled={!hasAnyPositiveQty || saving}
                  onClick={handleSubmit} 
                  className="min-w-[180px] bg-emerald-600 hover:bg-emerald-500 text-white border-none data-[disabled=true]:bg-slate-700 disabled:opacity-50"
                  style={!hasAnyPositiveQty || saving ? { background: '#334155', color: '#94a3b8' } : undefined}
                >
                  {saving ? 'Processing...' : (
                     <div className="flex items-center">Save Intake Records <Save className="w-4 h-4 ml-2" /></div>
                  )}
                </Button>
             </div>
          </div>
        </div>
    </div>
  );
}
