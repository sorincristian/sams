import React, { useEffect, useCallback } from "react";
import { api } from "../api";
import type { InventoryRow, InventoryTransactionType } from "@sams/types";
import { Plus, Minus, Check, X } from "lucide-react";
import { Button } from "../components/ui/Button";

interface Props {
  item: InventoryRow;
  onClose: () => void;
  onDone: () => void;
}

export function AdjustInventoryModal({ item, onClose, onDone }: Props) {
  const [adjustType, setAdjustType] = React.useState<"ADJUST_IN" | "ADJUST_OUT">("ADJUST_IN");
  const [quantity, setQuantity] = React.useState<number | "">(1);
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const parsedQuantity = quantity === "" ? 0 : quantity;
  const isDeduction = adjustType === "ADJUST_OUT";
  const projectedQOH = isDeduction
    ? item.quantityOnHand - parsedQuantity
    : item.quantityOnHand + parsedQuantity;

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (parsedQuantity < 1) {
      setError("Quantity must be at least 1");
      return;
    }
    if (isDeduction && projectedQOH < 0) {
      setError(`Cannot deduct ${parsedQuantity} — only ${item.quantityOnHand} on hand.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/inventory/transaction", {
        inventoryItemId: item.id,
        type: adjustType as InventoryTransactionType,
        quantity: parsedQuantity,
        notes: notes.trim() || undefined,
      });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }, [parsedQuantity, isDeduction, projectedQOH, adjustType, item.id, item.quantityOnHand, notes, onDone]);

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
            <h3 id="modal-title" className="text-[28px] font-bold text-[#f8fafc] mb-1 tracking-tight">Adjust Inventory</h3>
            <div className="text-[15px] sm:text-[16px] text-[#94a3b8] leading-snug flex flex-col gap-1">
              <span className="font-medium text-slate-300">{item.seatInsertType.partNumber} — {item.seatInsertType.description}</span>
              <div className="flex items-center gap-2 mt-1">
                <span>Garage: <strong className="text-slate-200">{item.garage.name}</strong></span>
                <span className="text-slate-600 font-bold">•</span>
                <span>Current on hand: <strong className="text-slate-200">{item.quantityOnHand}</strong></span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="flex flex-col gap-6 flex-1">

              {/* Adjustment toggle buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  size="default"
                  variant={adjustType === "ADJUST_IN" ? "primary" : "outline"}
                  className={`h-12 rounded-[14px] ${adjustType !== "ADJUST_IN" ? "!bg-slate-400/10 !text-[#cbd5e1] !border-slate-400/15 hover:!bg-slate-400/20 hover:!text-white" : "shadow-inner"}`}
                  onClick={() => setAdjustType("ADJUST_IN")}
                  aria-label="Set adjustment type to add inventory"
                >
                  <Plus className="w-4 h-4" /> Adjust In
                </Button>
                <Button
                  type="button"
                  size="default"
                  variant={adjustType === "ADJUST_OUT" ? "primary" : "outline"}
                  className={`h-12 rounded-[14px] ${adjustType !== "ADJUST_OUT" ? "!bg-slate-400/10 !text-[#cbd5e1] !border-slate-400/15 hover:!bg-slate-400/20 hover:!text-white" : "shadow-inner"}`}
                  onClick={() => setAdjustType("ADJUST_OUT")}
                  aria-label="Set adjustment type to deduct inventory"
                >
                  <Minus className="w-4 h-4" /> Adjust Out
                </Button>
              </div>

              {/* Form fields: Quantity */}
              <div>
                <label className="block text-[13px] tracking-[0.01em] text-[#cbd5e1] mb-2 font-medium">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuantity(val === "" ? "" : Number(val));
                  }}
                  required
                  aria-label="Quantity to adjust"
                  className="w-full bg-[#0f172a]/90 border border-slate-400/20 rounded-[14px] text-[#f8fafc] min-h-[52px] px-4 py-[14px] text-[16px] outline-none transition-all duration-120 hover:border-slate-400/30 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/15 placeholder-[#64748b]"
                />
              </div>

              {/* Quantity preview */}
              <div className="flex flex-col items-center justify-center p-[18px] rounded-2xl bg-[#020617]/55 border border-blue-500/20 mt-2">
                <span className="text-[13px] text-[#94a3b8] mb-1 font-medium tracking-wide uppercase">Projected on hand</span>
                <span className={`text-[36px] font-bold leading-none ${projectedQOH < 0 ? 'text-red-400' : projectedQOH === 0 ? 'text-amber-400' : 'text-[#34d399]'}`}>
                  {projectedQOH}
                </span>
              </div>

              {/* Notes field */}
              <div className="mt-2">
                <label className="block text-[13px] tracking-[0.01em] text-[#cbd5e1] mb-2 font-medium">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. damaged parts removed, cycle count correction"
                  aria-label="Adjustment notes"
                  className="w-full bg-[#0f172a]/90 border border-slate-400/20 rounded-[14px] text-[#f8fafc] min-h-[96px] px-4 py-[14px] text-[16px] outline-none transition-all duration-120 hover:border-slate-400/30 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/15 placeholder-[#64748b] resize-y"
                />
              </div>

            </div>

            {/* Footer actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-10 pt-6 border-t border-slate-700/50">
              <Button
                type="button"
                variant="outline"
                className="h-11 sm:h-12 px-[18px] rounded-[14px] !bg-transparent !text-[#cbd5e1] !border-slate-400/20 hover:!bg-slate-400/10 transition-colors"
                onClick={onClose}
                aria-label="Cancel adjustment"
              >
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || projectedQOH < 0 || parsedQuantity < 1}
                className="h-11 sm:h-12 px-[18px] rounded-[14px] hover:brightness-110 active:scale-95 transition-all text-white border-none shadow-md"
                style={{ background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)" }}
                aria-label="Confirm inventory adjustment"
              >
                <Check className="w-4 h-4" /> 
                {loading ? "Saving..." : `Confirm ${adjustType === "ADJUST_IN" ? "+ Add" : "− Remove"}`}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
