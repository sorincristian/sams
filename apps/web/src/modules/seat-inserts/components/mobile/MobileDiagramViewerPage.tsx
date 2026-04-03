import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../../../../api";
import { resolveAssetUrl } from "../../../../utils/assetUrl";
import { DiagramCanvas } from "./DiagramCanvas";
import { HotspotOverlay } from "./HotspotOverlay";
import { PartBottomSheet } from "./PartBottomSheet";

export function MobileDiagramViewerPage() {
  const { attachmentId } = useParams<{ attachmentId: string }>();
  const [searchParams] = useSearchParams();
  const initHotspotId = searchParams.get("hotspot");
  const initSeatLabel = searchParams.get("seatLabel");

  const [attachment, setAttachment] = React.useState<any>(null);
  const [hotspots, setHotspots] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const [selectedHotspot, setSelectedHotspot] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (!attachmentId) return;
    setLoading(true);

    Promise.all([
      api.get(`/catalog/attachments/${attachmentId}`),
      api.get(`/catalog/attachments/${attachmentId}/hotspots`)
    ])
      .then(([attRes, hsRes]) => {
        setAttachment(attRes.data);
        const fetchedHotspots = hsRes.data;
        setHotspots(fetchedHotspots);

        // Auto-focus logic
        if (initHotspotId) {
          const match = fetchedHotspots.find((h: any) => h.id === initHotspotId);
          if (match) setSelectedHotspot(match);
        } else if (initSeatLabel) {
          const match = fetchedHotspots.find((h: any) => h.seatLabel.toLowerCase() === initSeatLabel.toLowerCase());
          if (match) setSelectedHotspot(match);
        }
      })
      .catch(() => setError("Failed to load diagram data."))
      .finally(() => setLoading(false));
  }, [attachmentId, initHotspotId, initSeatLabel]);

  if (loading) return <div className="p-4 text-center text-gray-400 mt-20">Loading interactive diagram...</div>;
  if (error || !attachment) return <div className="p-4 text-center text-red-500 mt-20">{error || "Diagram not found"}</div>;

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gray-800/80 backdrop-blur border-b border-gray-700 p-4 safe-top">
        <h1 className="text-lg font-bold text-white m-0">Diagram Viewer</h1>
        <p className="text-xs text-gray-400 m-0 mt-1">{attachment.busTypeLabel || "Standard Architecture"}</p>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden touch-none p-safe">
        <DiagramCanvas pdfUrl={resolveAssetUrl(attachment.urlOrPath) || ""} focusHotspot={selectedHotspot}>
          {(scale: number, offset: { x: number; y: number }) => (
            <HotspotOverlay 
              hotspots={hotspots}
              scale={scale}
              offset={offset}
              selectedId={selectedHotspot?.id}
              onSelect={(h: any) => setSelectedHotspot(h)}
            />
          )}
        </DiagramCanvas>
      </div>

      {/* Bottom Sheet */}
      {selectedHotspot && (
        <PartBottomSheet 
          hotspot={selectedHotspot} 
          onClose={() => setSelectedHotspot(null)}
        />
      )}
    </div>
  );
}
