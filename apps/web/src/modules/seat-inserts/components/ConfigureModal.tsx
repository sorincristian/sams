import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

export function ConfigureModal({
  isOpen,
  onClose,
  onApply,
  currentLocationId,
  garages
}: {
  isOpen: boolean;
  onClose: () => void;
  onApply: (locationId: string) => void;
  currentLocationId: string | null;
  garages: { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState<string>(currentLocationId || "");

  // Sync state if modal opens
  useEffect(() => {
    if (isOpen) setSelected(currentLocationId || "");
  }, [isOpen, currentLocationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Configure Command Centre</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Scope to Location (Required)</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Garages</option>
              {garages.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-3 opacity-50 cursor-not-allowed">
            <label className="block text-sm font-medium text-gray-700">Date Range (Optional)</label>
            <input type="text" disabled placeholder="Trailing 30 Days (Default)" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-500" />
            <p className="text-xs text-gray-500">Date picker coming soon in robust telemetry upgrades.</p>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t">
          <button 
            onClick={() => setSelected("")} 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Reset
          </button>
          <button 
            onClick={() => {
              onApply(selected);
              onClose();
            }} 
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Apply Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
