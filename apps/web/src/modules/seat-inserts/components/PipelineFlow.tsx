import React, { useState } from "react";
import { ArrowRight, Package, Truck, Hammer, MapPin, Settings } from "lucide-react";
import { BatchesModal } from "./BatchesModal";

interface PipelineFlowProps {
  metrics: {
    dirty: number;
    packed: number;
    inTransit: number;
    returned: number;
  };
  onMutationSuccess: () => void;
}

export function PipelineFlow({ metrics, onMutationSuccess }: PipelineFlowProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const nodes = [
    { id: "dirty", label: "Gross Dirty", count: metrics.dirty, icon: <MapPin className="w-5 h-5 text-orange-500" />, color: "border-orange-200 bg-orange-50/50" },
    { id: "packed", label: "Packed at Garage", count: metrics.packed, icon: <Package className="w-5 h-5 text-yellow-500" />, color: "border-yellow-200 bg-yellow-50/50" },
    { id: "transit", label: "In Reupholstery", count: metrics.inTransit, icon: <Truck className="w-5 h-5 text-blue-500" />, color: "border-blue-200 bg-blue-50/50" },
    { id: "returned", label: "Returned Clean", count: metrics.returned, icon: <Hammer className="w-5 h-5 text-emerald-500" />, color: "border-emerald-200 bg-emerald-50/50" }
  ];

  return (
    <>
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-muted-foreground" />
            Logistics Pipeline
          </h3>
          <button 
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border hover:bg-muted text-xs font-semibold rounded-md shadow-sm transition-colors"
          >
            <Settings className="w-3 h-3" />
            Manage Batches
          </button>
        </div>
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <div className={`flex flex-col items-center justify-center border ${node.color} rounded-xl p-4 w-full md:w-40 transition-transform hover:-translate-y-1 hover:shadow-md cursor-default`}>
              <div className="p-3 bg-background rounded-full shadow-sm mb-3">
                {node.icon}
              </div>
              <span className="text-2xl font-black text-foreground mb-1">{node.count}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center line-clamp-2">{node.label}</span>
            </div>
            {i < nodes.length - 1 && (
              <div className="flex justify-center items-center h-full text-muted-foreground/30 rotate-90 md:rotate-0 my-2 md:my-0">
                <ArrowRight className="w-6 h-6" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
    {modalOpen && <BatchesModal onClose={() => setModalOpen(false)} onMutationSuccess={onMutationSuccess} />}
    </>
  );
}
