import React from "react";
import { api } from "../../../../api";

interface PartBottomSheetProps {
  hotspot: any;
  onClose: () => void;
}

export function PartBottomSheet({ hotspot, onClose }: PartBottomSheetProps) {
  const [mode, setMode] = React.useState<"VIEW" | "ADD_TO_WO">("VIEW");
  const [woList, setWoList] = React.useState<any[]>([]);
  const [loadingWO, setLoadingWO] = React.useState(false);

  // New WO vs Existing mapping
  const [woOption, setWoOption] = React.useState<"NEW" | "EXISTING">("NEW");
  
  // New WO forms
  const [busId, setBusId] = React.useState("");
  const [issueDesc, setIssueDesc] = React.useState("");
  
  // Existing WO forms
  const [selectedWOId, setSelectedWOId] = React.useState("");
  const [addNotes, setAddNotes] = React.useState("");
  
  const [submitting, setSubmitting] = React.useState(false);

  const part = hotspot.seatInsertType;

  // Load existing Work Orders strictly if accessing WO mode
  React.useEffect(() => {
    if (mode === "ADD_TO_WO") {
      setLoadingWO(true);
      api.get("/work-orders")
        .then((res: any) => {
          // Keep only active work orders ideally, but returning all for mapping
          setWoList(res.data.filter((wo: any) => !["COMPLETED", "CANCELLED"].includes(wo.status)));
        })
        .finally(() => setLoadingWO(false));
    }
  }, [mode]);

  async function handleSubmitWO() {
    if (!part) return;
    setSubmitting(true);
    try {
      let targetWoId = selectedWOId;

      if (woOption === "NEW") {
        if (!busId || !issueDesc) {
           alert("Bus ID and Description required for new WO.");
           setSubmitting(false);
           return;
        }
        // Actually, busId needs to be a real Bus UUID from /fleet/buses endpoint.
        // For POC/speed if a bus isn't strictly known by UUID, we might fail unless we autocomplete.
        // Let's assume the user pastes the Bus ID or we hard fallback to a known ID if this is a strict simulation.
        // In a real mobile app, this would be a bus selector.
        const res = await api.post("/work-orders", {
          busId: busId,
          issueDescription: issueDesc,
          priority: "HIGH"
        });
        targetWoId = res.data.id;
      }

      if (!targetWoId) {
         setSubmitting(false);
         return;
      }

      // Add item
      await api.post(`/work-orders/${targetWoId}/items`, {
        seatInsertTypeId: part.id,
        quantity: 1,
        notes: addNotes || `Mapped via Area: ${hotspot.seatLabel}`
      });

      alert(`Part added to Work Order ${woOption === "NEW" ? "" : "successfully"}`);
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to process Work Order transition");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="absolute inset-0 bg-black/60 z-40 touch-none" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-gray-900 border-t border-gray-700 rounded-t-3xl p-6 z-50 flex flex-col gap-4 overflow-y-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5)] safe-bottom animate-slide-up">
        
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-2 opacity-50" />

        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white m-0 tracking-tight leading-tight">
              {hotspot.seatLabel}
            </h2>
            {part && <p className="text-blue-400 font-bold tracking-wide mt-1 mb-0 text-sm">{part.partNumber}</p>}
          </div>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 border-none outline-none">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {!part ? (
          <div className="p-4 bg-red-900/20 text-red-400 border border-red-900/50 rounded-lg text-sm">
             No catalog part physically mapped to this geometric sector.
          </div>
        ) : (
          mode === "VIEW" ? (
            <div className="flex flex-col gap-5 mt-2">
               <div className="flex flex-col gap-3 text-sm">
                 <div className="flex justify-between border-b border-gray-800 pb-2">
                   <span className="text-gray-500">Description</span>
                   <span className="text-gray-200 text-right max-w-[60%]">{part.description}</span>
                 </div>
                 <div className="flex justify-between border-b border-gray-800 pb-2">
                   <span className="text-gray-500">Component Type</span>
                   <span className="text-gray-200 font-bold">{part.componentType || "—"}</span>
                 </div>
                 <div className="flex justify-between border-b border-gray-800 pb-2">
                   <span className="text-gray-500">Vendor</span>
                   <span className="text-gray-200">{part.vendor || "—"}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-500">Stock Availability</span>
                   <span className="text-green-400 font-semibold">{part.minStockLevel || 0} Units Known</span>
                 </div>
               </div>
               
               {hotspot.notes && (
                 <div className="p-3 bg-gray-800 rounded border border-gray-700 text-sm text-gray-300 italic">
                   "{hotspot.notes}"
                 </div>
               )}

               <div className="flex flex-col gap-3 mt-4">
                 <button onClick={() => setMode("ADD_TO_WO")} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl text-lg shadow-lg active:scale-[0.98] transition-transform border-none outline-none">
                   Attach to Work Order
                 </button>
                 <div className="flex gap-3">
                   <button className="flex-1 py-3 bg-gray-800 text-gray-200 font-semibold rounded-lg text-sm border-none shadow active:scale-[0.98]">
                     Issue from Stock
                   </button>
                   <button className="flex-1 py-3 bg-gray-800 text-gray-200 font-semibold rounded-lg text-sm border-none shadow active:scale-[0.98]">
                     SOP Guide
                   </button>
                 </div>
               </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-2">
               <button onClick={() => setMode("VIEW")} className="text-sm text-gray-400 font-semibold text-left mb-2 bg-transparent border-none p-0 outline-none">
                 ← Back to Details
               </button>
               
               <div className="flex bg-gray-800 p-1 rounded-lg">
                 <button className={`flex-1 py-2 text-sm font-bold rounded-md outline-none border-none transition-colors ${woOption === "NEW" ? "bg-gray-700 text-white" : "bg-transparent text-gray-400"}`} onClick={() => setWoOption("NEW")}>New Request</button>
                 <button className={`flex-1 py-2 text-sm font-bold rounded-md outline-none border-none transition-colors ${woOption === "EXISTING" ? "bg-gray-700 text-white" : "bg-transparent text-gray-400"}`} onClick={() => setWoOption("EXISTING")}>Active Orders</button>
               </div>

               {woOption === "NEW" ? (
                 <div className="flex flex-col gap-4">
                   <label className="flex flex-col gap-1 text-sm text-gray-400 font-semibold">
                     Bus Identifier UUID
                     <input value={busId} onChange={e => setBusId(e.target.value)} placeholder="Enter Bus ID..." className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
                   </label>
                   <label className="flex flex-col gap-1 text-sm text-gray-400 font-semibold">
                     Complaint / Issue Description
                     <textarea value={issueDesc} onChange={e => setIssueDesc(e.target.value)} placeholder="Describe the vandalism or failure..." className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-white min-h-[80px]" />
                   </label>
                 </div>
               ) : (
                 <div className="flex flex-col gap-4">
                   {loadingWO ? (
                     <div className="text-gray-500 text-sm">Syncing orders...</div>
                   ) : (
                     <label className="flex flex-col gap-1 text-sm text-gray-400 font-semibold">
                       Select Active Order
                       <select value={selectedWOId} onChange={e => setSelectedWOId(e.target.value)} className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-white appearance-none">
                         <option value="">— Choose order limit —</option>
                         {woList.map(wo => (
                           <option key={wo.id} value={wo.id}>{wo.workOrderNumber} · Bus {wo.bus?.fleetNumber || "N/A"}</option>
                         ))}
                       </select>
                     </label>
                   )}
                   <label className="flex flex-col gap-1 text-sm text-gray-400 font-semibold">
                     Additional Notes (Optional)
                     <input value={addNotes} onChange={e => setAddNotes(e.target.value)} placeholder={`e.g. Needs replacement for ${hotspot.seatLabel}`} className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
                   </label>
                 </div>
               )}

               <button 
                 disabled={submitting || (woOption === "NEW" ? (!busId || !issueDesc) : !selectedWOId)} 
                 onClick={handleSubmitWO} 
                 className="w-full mt-4 py-4 bg-blue-600 text-white font-bold rounded-xl text-lg shadow-lg outline-none border-none disabled:opacity-50 active:scale-[0.98]"
               >
                 {submitting ? "Processing..." : "Confirm Bind"}
               </button>
            </div>
          )
        )}
      </div>
    </>
  );
}
