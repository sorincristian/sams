import React from "react";

interface HotspotOverlayProps {
  hotspots: any[];
  scale: number;
  offset: { x: number; y: number };
  selectedId?: string;
  onSelect: (hotspot: any) => void;
}

export function HotspotOverlay({ hotspots, selectedId, onSelect }: HotspotOverlayProps) {
  // SVG or absolute divs approach? Absolute divs using % matching the coordinates.
  // Because the parent scales down perfectly natively in the translate container.
  
  return (
    <>
      {hotspots.map(h => {
        const isSelected = h.id === selectedId;
        return (
          <div
            key={h.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(h);
            }}
            className={`absolute border-2 transition-all cursor-pointer box-border flex items-start justify-start overflow-hidden ${
              isSelected ? "border-yellow-400 bg-yellow-400/30 z-20 shadow-[0_0_15px_rgba(250,204,21,0.6)]" : "border-blue-500 bg-blue-500/10 z-10"
            }`}
            style={{
              left: `${h.x * 100}%`,
              top: `${h.y * 100}%`,
              width: `${h.width * 100}%`,
              height: `${h.height * 100}%`,
            }}
          >
             <span className={`text-[0.6rem] font-bold px-1 rounded-br whitespace-nowrap overflow-hidden transition-colors ${
               isSelected ? "bg-yellow-500 text-yellow-900" : "bg-blue-600/90 text-white"
             }`}>
               {h.seatLabel}
             </span>
          </div>
        );
      })}
    </>
  );
}
