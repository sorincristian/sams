import React, { useState } from "react";
import { MapPin, Settings2 } from "lucide-react";
import { OperationsModal } from "./OperationsModal";

interface LocationStats {
  locationId: string;
  locationName: string;
  NEW: number;
  DIRTY: number;
  PACKED_FOR_RETURN: number;
  RETURNED: number;
  DISPOSED: number;
  total: number;
  thresholdNew: number;
  thresholdDirty: number;
}

interface InventoryTableProps {
  data: LocationStats[];
  loading: boolean;
  onMutationSuccess: () => void;
}

export function InventoryTable({ data, loading, onMutationSuccess }: InventoryTableProps) {
  const [activeLocation, setActiveLocation] = useState<{id: string, name: string} | null>(null);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm p-12 flex flex-col items-center justify-center text-muted-foreground">
        <MapPin className="w-10 h-10 opacity-20 mb-3" />
        <p className="font-medium text-sm">No Location Data Mapped</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-slate-50/50">
          <h2 className="font-bold">Inventory Distribution by Garage</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-5 py-3 font-semibold">Location</th>
                <th className="px-5 py-3 font-semibold text-right">New</th>
                <th className="px-5 py-3 font-semibold text-right">Dirty</th>
                <th className="px-5 py-3 font-semibold text-right hidden sm:table-cell">Packed</th>
                <th className="px-5 py-3 font-semibold text-right hidden lg:table-cell">Returned</th>
                <th className="px-5 py-3 font-semibold text-right hidden md:table-cell">Disposed</th>
                <th className="px-5 py-3 font-semibold text-right">Total</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row) => (
                <tr key={row.locationId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {row.locationName}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.NEW < row.thresholdNew ? 'bg-red-50 text-red-600 border border-red-200' : 'text-emerald-600 bg-emerald-50'}`}>
                      {row.NEW}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.DIRTY > row.thresholdDirty ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'text-slate-600'}`}>
                      {row.DIRTY}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500 hidden sm:table-cell">{row.PACKED_FOR_RETURN}</td>
                  <td className="px-5 py-3 text-right text-slate-500 hidden lg:table-cell">{row.RETURNED}</td>
                  <td className="px-5 py-3 text-right text-slate-500 hidden md:table-cell">{row.DISPOSED}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-700">{row.total}</td>
                  <td className="px-5 py-3 text-right">
                    <button 
                      onClick={() => setActiveLocation({ id: row.locationId, name: row.locationName })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-sm whitespace-nowrap"
                    >
                      <Settings2 className="w-3 h-3" />
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {activeLocation && (
        <OperationsModal 
          locationId={activeLocation.id} 
          locationName={activeLocation.name} 
          onClose={() => setActiveLocation(null)} 
          onMutationSuccess={onMutationSuccess} 
        />
      )}
    </>
  );
}
