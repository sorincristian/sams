import React, { useEffect, useCallback, useMemo } from "react";
import { api } from "../api";
import type { InventoryRow, InventoryTransactionType } from "@sams/types";
import { CatalogAutocomplete } from "../components/CatalogAutocomplete";
import { MinusCircle, X, Loader2 } from "lucide-react";
import { Button } from "../components/ui/Button";

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  status: string;
  bus: { fleetNumber: string; garageId: string; garage: { id: string; name: string } };
}

interface Props {
  item: InventoryRow | null;
  prefilledWorkOrderId?: string;
  onClose: () => void;
  onDone: () => void;
}

export function IssueInventoryModal({ item: initialItem, prefilledWorkOrderId, onClose, onDone }: Props) {
  const [workOrders, setWorkOrders] = React.useState<WorkOrder[]>([]);
  const [inventoryItems, setInventoryItems] = React.useState<InventoryRow[]>([]);
  const [globalCatalog, setGlobalCatalog] = React.useState<any[]>([]);
  const [loadingWOs, setLoadingWOs] = React.useState(true);
  const [loadingItems, setLoadingItems] = React.useState(!initialItem);

  const [selectedWO, setSelectedWO] = React.useState(prefilledWorkOrderId ?? "");
  const [selectedCatalogId, setSelectedCatalogId] = React.useState(initialItem?.seatInsertTypeId ?? "");
  const [quantity, setQuantity] = React.useState("1");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [queryLocal, setQueryLocal] = React.useState("");

  const parsedQuantity = Number(quantity || 0);
  const targetGarageId = workOrders.find(w => w.id === selectedWO)?.bus.garage?.id || initialItem?.garageId;
  const resolvedItem = initialItem ?? inventoryItems.find((i) => i.seatInsertTypeId === selectedCatalogId && i.garageId === targetGarageId) ?? null;
  const currentQOH = resolvedItem ? resolvedItem.quantityOnHand : 0;
  const projectedQOH = currentQOH - parsedQuantity;

  React.useEffect(() => {
    api.get("/work-orders")
      .then((res) => {
        const open = (res.data as WorkOrder[]).filter((wo) => wo.status === "OPEN");
        setWorkOrders(open);
        if (!prefilledWorkOrderId && open.length > 0 && !selectedWO) {
          setSelectedWO(open[0].id);
        }
      })
      .finally(() => setLoadingWOs(false));

    if (!initialItem) {
      Promise.all([
        api.get("/inventory"),
        api.get("/v1/catalog")
      ])
        .then(([invRes, catRes]) => {
          setInventoryItems(invRes.data);
          setGlobalCatalog(catRes.data);
          if (catRes.data.length > 0) {
             const it = catRes.data[0];
             setSelectedCatalogId(it.id);
             setQueryLocal(`${it.partNumber} — ${it.description}`);
          }
        })
        .finally(() => setLoadingItems(false));
    }
  }, [initialItem, prefilledWorkOrderId, selectedWO]);

  const mappedCatalogParts = useMemo(() => {
    return globalCatalog.map(catalogItem => {
      const invMatches = inventoryItems.filter(i => i.seatInsertTypeId === catalogItem.id);
      const totalQoh = invMatches.reduce((sum, i) => sum + i.quantityOnHand, 0);

      return {
        id: catalogItem.id,
        partNumber: catalogItem.partNumber,
        description: catalogItem.description,
        componentType: `System QOH: ${totalQoh}`,
        vendor: catalogItem.vendor || ""
      };
    });
  }, [globalCatalog, inventoryItems]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (loading) return;
    if (e) e.preventDefault();
    if (workOrders.length === 0) {
      setError("No open work orders available.");
      return;
    }
    if (!selectedWO) { setError("Please select a work order."); return; }
    if (!resolvedItem) { setError("Target garage does not have an active ledger for this part yet. Restock first."); return; }
    if (parsedQuantity < 1) { setError("Quantity must be at least 1."); return; }
    if (projectedQOH < 0) {
      setError(`Cannot issue ${parsedQuantity} — only ${currentQOH} on hand.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post("/inventory/transaction", {
        inventoryItemId: resolvedItem.id,
        type: "ISSUE" as InventoryTransactionType,
        quantity: parsedQuantity,
        notes: notes.trim() || undefined,
        referenceType: "WORK_ORDER",
        referenceId: selectedWO,
      });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Transaction failed.");
      setLoading(false);
    }
  }, [selectedWO, resolvedItem, parsedQuantity, projectedQOH, notes, onDone]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handleSubmit]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-[#020617]/75 backdrop-blur-[10px]">
      <div 
        className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] rounded-[24px] flex flex-col relative"
        style={{
          width: "min(92vw, 720px)",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.45)",
          color: "#e5e7eb"
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="p-7 sm:p-8 flex flex-col h-full max-h-[90vh] overflow-y-auto">
          
          {/* Header section */}
          <div className="mb-8">
            <h3 id="modal-title" className="text-[28px] font-bold text-[#f8fafc] mb-1 tracking-tight">Issue Parts</h3>
            
            {resolvedItem ? (
              <div className="text-[15px] sm:text-[16px] text-[#94a3b8] leading-snug flex flex-col gap-1">
                <span className="font-medium text-slate-300">{resolvedItem.seatInsertType.partNumber} — {resolvedItem.seatInsertType.description}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span>Garage: <strong className="text-slate-200">{resolvedItem.garage.name}</strong></span>
                  <span className="text-slate-600 font-bold">•</span>
                  <span className={resolvedItem.quantityOnHand <= 5 ? "text-amber-400" : ""}>Current on hand: <strong className={resolvedItem.quantityOnHand <= 5 ? "text-amber-400 font-bold" : "text-slate-200"}>{resolvedItem.quantityOnHand}</strong></span>
                </div>
              </div>
            ) : (
              <div className="text-[15px] sm:text-[16px] text-[#94a3b8] leading-snug">
                Select an item to issue
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="flex flex-col gap-6 flex-1">

              {/* Inventory item picker */}
              {!initialItem && (
                <div>
                  <label className="block text-[13px] tracking-[0.01em] text-[#cbd5e1] mb-2 font-medium">
                    Inventory Item
                  </label>
                  {loadingItems ? (
                    <div className="text-[14px] text-slate-500 font-medium">Loading inventory...</div>
                  ) : (
                    <div className="catalog-autocomplete-dark-override">
                      <CatalogAutocomplete
                        catalogParts={mappedCatalogParts}
                        queryLocal={queryLocal}
                        setQueryLocal={setQueryLocal}
                        selectedPartId={selectedCatalogId}
                        setSelectedPartId={(id) => setSelectedCatalogId(id || "")}
                        placeholder="Search parts by number, description, or garage..."
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Work Order picker */}
              <div>
                <label className="block text-[13px] tracking-[0.01em] text-[#cbd5e1] mb-2 font-medium">
                  Work Order
                </label>
                {prefilledWorkOrderId ? (
                  <div className="w-full bg-[#0f172a]/90 border border-slate-400/20 rounded-[14px] text-[#f8fafc] px-4 py-[14px] text-[16px]">
                    {workOrders.find((wo) => wo.id === prefilledWorkOrderId)?.workOrderNumber ?? prefilledWorkOrderId}
                    <span className="ml-[8px] text-[13px] text-[#94a3b8]">(pre-selected)</span>
                  </div>
                ) : loadingWOs ? (
                  <div className="text-[14px] text-slate-500 font-medium">Loading work orders...</div>
                ) : workOrders.length === 0 ? (
                  <div className="text-[14px] text-amber-500 font-medium">No open work orders found.</div>
                ) : (
                  <select
                    value={selectedWO}
                    onChange={(e) => setSelectedWO(e.target.value)}
                    required
                    aria-label="Target work order"
                    className="w-full bg-[#0f172a]/90 border border-slate-400/20 rounded-[14px] text-[#f8fafc] min-h-[52px] px-4 py-[14px] text-[16px] outline-none transition-all duration-120 hover:border-slate-400/30 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/15"
                  >
                    {workOrders.map((wo) => (
                      <option key={wo.id} value={wo.id}>
                        {wo.workOrderNumber} — Bus {wo.bus.fleetNumber} ({wo.bus.garage.name})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[13px] tracking-[0.01em] text-[#cbd5e1] mb-2 font-medium">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  max={resolvedItem?.quantityOnHand}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  autoFocus
                  aria-label="Quantity to issue"
                  className="w-full bg-[#0f172a]/90 border border-slate-400/20 rounded-[14px] text-[#f8fafc] min-h-[52px] px-4 py-[14px] text-[16px] outline-none transition-all duration-120 hover:border-slate-400/30 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/15 placeholder-[#64748b]"
                />
              </div>

              {/* Quantity preview */}
              <div className={`flex flex-col items-center justify-center p-[18px] rounded-2xl bg-[#020617]/55 border mt-2 ${currentQOH <= 5 ? 'border-amber-500/30' : 'border-blue-500/20'}`}>
                <span className={`text-[13px] mb-1 font-medium tracking-wide uppercase ${currentQOH <= 5 ? 'text-amber-500/80' : 'text-[#94a3b8]'}`}>Projected on hand</span>
                <span className={`text-[36px] font-bold leading-none ${projectedQOH < 0 ? 'text-red-400' : projectedQOH === 0 ? 'text-amber-400' : 'text-[#34d399]'}`}>
                  {projectedQOH}
                </span>
              </div>

              {/* Notes field */}
              <div className={!resolvedItem ? "hidden" : "mt-2"}>
                <label className="block text-[13px] tracking-[0.01em] text-[#cbd5e1] mb-2 font-medium">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. row 3 replacement"
                  aria-label="Issue notes"
                  className="w-full bg-[#0f172a]/90 border border-slate-400/20 rounded-[14px] text-[#f8fafc] min-h-[96px] px-4 py-[14px] text-[16px] outline-none transition-all duration-120 hover:border-slate-400/30 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/15 placeholder-[#64748b] resize-y"
                />
              </div>

            </div>

            {/* Footer actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-10 pt-6 border-t border-slate-700/50">
              <Button
                type="button"
                variant="ghostDark"
                className="h-11 sm:h-12 px-[18px] rounded-[14px] transition-colors"
                onClick={onClose}
                aria-label="Cancel issue"
              >
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={loading || projectedQOH < 0 || parsedQuantity < 1 || workOrders.length === 0 || !selectedCatalogId}
                className="h-11 sm:h-12 px-[18px] rounded-[14px]"
                aria-label="Confirm inventory issue"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MinusCircle className="w-4 h-4" />} 
                {loading ? "Saving..." : "Confirm Issue"}
              </Button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
