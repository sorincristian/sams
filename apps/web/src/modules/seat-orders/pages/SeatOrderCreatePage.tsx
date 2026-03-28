import React, { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../api";

export function SeatOrderCreatePage() {
  const navigate = useNavigate();
  const [garages, setGarages] = useState<any[]>([]);
  const [garageId, setGarageId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<any[]>([]);

  useEffect(() => {
    api.get("/api/garages").then((res: any) => setGarages(res.data)).catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!garageId) return alert("Select a garage");
    if (lines.length === 0) return alert("Add at least one line item");

    try {
      const res = await api.post("/api/seat-orders", {
        garageId,
        notes,
        lines
      });
      navigate(`/procurement/seat-orders/${res.data.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create order");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/procurement/seat-orders" className="p-2 hover:bg-slate-100 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Create New Seat Order</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Requesting Garage</label>
            <select 
              value={garageId}
              onChange={e => setGarageId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
            >
              <option value="">-- Select Garage --</option>
              {garages.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Order Notes (Optional)</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 h-24"
              placeholder="e.g. Rush delivery needed"
            />
          </div>
        </div>

        <div>
          {/* We will inject SeatOrderLineTable here later */}
          <div className="p-4 bg-orange-50 text-orange-800 border border-orange-200 rounded-lg text-sm mb-4">
            (Placeholder) Line items should be inserted via CatalogAutocomplete
          </div>
          <button 
            type="button" 
            onClick={() => {
              // Mock line addition for now
              const mockLine = {
                seatInsertTypeId: "123", // Needs real ID
                quantity: 1,
                unitCost: 0,
                description: "Mock Seat Part"
              };
              setLines([...lines, mockLine]);
            }}
            className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded font-semibold transition"
          >
            + Add Line
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button 
            onClick={handleSave}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-black text-white px-6 py-2 rounded-lg font-bold"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>
        </div>
      </div>
    </div>
  );
}
