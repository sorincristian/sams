import React from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { resolveAssetUrl } from "../utils/assetUrl";
import { AttachmentsModal } from "../modules/seat-inserts/components/AttachmentsModal";

export function PartDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [part, setPart] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"ATTACHMENTS" | "DIAGRAMS" | "HOTSPOTS">("DIAGRAMS");
  const [showUpload, setShowUpload] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/catalog/${id}/detail`)
      .then((res) => setPart(res.data))
      .catch((err) => setError("Failed to load part details."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="muted p-4">Loading part details...</div>;
  if (error || !part) return <div className="text-red-500 p-4">{error || "Part not found"}</div>;

  const primaryDiagram = part.catalogAttachments?.find((a: any) => a.attachmentType === "DIAGRAM" && a.isPrimary) 
    || part.catalogAttachments?.find((a: any) => a.attachmentType === "DIAGRAM");

  const diagrams = part.catalogAttachments?.filter((a: any) => a.attachmentType === "DIAGRAM") || [];
  const photos = part.catalogAttachments?.filter((a: any) => a.attachmentType === "PHOTO") || [];
  const guides = part.catalogAttachments?.filter((a: any) => a.attachmentType === "INSTALL_GUIDE") || [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-center bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-white m-0">
             {part.partNumber}
          </h1>
          <p className="text-gray-400 mt-1 mb-0">{part.description} · {part.vendor || "No Vendor"}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/catalog" className="px-4 py-2 bg-gray-700 text-gray-200 rounded-md text-sm hover:bg-gray-600 no-underline">
            Back to Catalog
          </Link>
          {primaryDiagram && (
             <Link to={`/catalog/${part.id}/diagram/${primaryDiagram.id}`} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-500 no-underline font-semibold">
               Interactive Mappings
             </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Metadata */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-blue-400 m-0 mb-4 font-semibold">Specifications</h3>
            <div className="flex flex-col gap-4">
              <SpecRow label="Part Number" value={part.partNumber} />
              <SpecRow label="Component Type" value={part.componentType || "—"} />
              <SpecRow label="Trim Spec" value={part.trimSpec || "—"} />
              <SpecRow label="Min Stock Level" value={part.minStockLevel} />
              <SpecRow label="Reorder Point" value={part.reorderPoint} />
              <SpecRow label="Unit Cost" value={`$${Number(part.unitCost).toFixed(2)}`} />
              <SpecRow label="Status" value={part.active ? "ACTIVE" : "INACTIVE"} />
            </div>
          </div>
        </div>

        {/* Right Column - Primary Preview & Manager */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col overflow-hidden">
            <div className="flex border-b border-gray-700">
              <TabButton active={activeTab === "DIAGRAMS"} onClick={() => setActiveTab("DIAGRAMS")}>
                Primary Mapping
              </TabButton>
              <TabButton active={activeTab === "ATTACHMENTS"} onClick={() => setActiveTab("ATTACHMENTS")}>
                Asset Directory ({part.catalogAttachments?.length || 0})
              </TabButton>
            </div>
            
            <div className="p-6 bg-gray-900 border-b border-gray-700">
              <div className="flex justify-between items-center bg-gray-800 border-l-[3px] border-blue-500 p-4 rounded text-sm text-gray-300">
                <span>Manage files attached to this part entity including assembly diagrams, installation guides, and photo references.</span>
                <button onClick={() => setShowUpload(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold border-none cursor-pointer">
                  + Upload Asset
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === "DIAGRAMS" && (
                <div className="flex flex-col gap-4 items-center justify-center p-8 bg-gray-900 rounded border border-gray-800">
                  {primaryDiagram ? (
                    <div className="flex flex-col items-center">
                       <h3 className="text-gray-300 mb-2">Primary Blueprint Mounted</h3>
                       <p className="text-gray-500 text-sm mb-6 max-w-[400px] text-center">Interactive mapping grid is available for {primaryDiagram.fileName}. To manipulate coordinate boundary boxes, transition into Interactive session.</p>
                       <Link to={`/catalog/${part.id}/diagram/${primaryDiagram.id}`} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-500 no-underline">
                         Launch Visualizer Workspace
                       </Link>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center">
                      <p>No primary blueprint diagram mounted.</p>
                      <p className="text-sm">Switch to the Asset Directory tab to upload engineering diagrams.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "ATTACHMENTS" && (
                <div className="flex flex-col gap-6">
                   <div className="flex justify-between items-center mb-2">
                     <h3 className="text-blue-400 m-0 text-md">Diagrams ({diagrams.length})</h3>
                   </div>
                   {diagrams.length === 0 && <span className="text-sm text-gray-500 pb-4">No mapping blueprints attached.</span>}
                   {diagrams.map((att: any) => <AttachmentRow key={att.id} attachment={att} isDiagram={true} partId={id!} reload={() => window.location.reload()} />)}

                   <div className="flex justify-between items-center mt-4 mb-2">
                     <h3 className="text-blue-400 m-0 text-md">Installation Guides ({guides.length})</h3>
                   </div>
                   {guides.length === 0 && <span className="text-sm text-gray-500 pb-4">No SOP guides attached.</span>}
                   {guides.map((att: any) => <AttachmentRow key={att.id} attachment={att} isDiagram={false} partId={id!} reload={() => window.location.reload()} />)}

                   <div className="flex justify-between items-center mt-4 mb-2">
                     <h3 className="text-blue-400 m-0 text-md">Photos ({photos.length})</h3>
                   </div>
                   {photos.length === 0 && <span className="text-sm text-gray-500 pb-4">No photo evidence attached.</span>}
                   {photos.map((att: any) => <AttachmentRow key={att.id} attachment={att} isDiagram={false} partId={id!} reload={() => window.location.reload()} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showUpload && (
        <AttachmentsModal 
          partId={id!} 
          onClose={() => setShowUpload(false)} 
          onSaved={() => {
            setShowUpload(false);
            window.location.reload();
          }} 
        />
      )}
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-700/50">
      <span className="text-gray-400 text-xs font-semibold uppercase">{label}</span>
      <span className="text-gray-100 text-sm">{value}</span>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-semibold text-sm border-0 border-b-2 bg-transparent cursor-pointer hover:bg-gray-800 transition-colors ${
        active ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400"
      }`}
    >
      {children}
    </button>
  );
}

function AttachmentRow({ attachment, isDiagram, partId, reload }: { attachment: any; isDiagram: boolean; partId: string; reload: () => void }) {
  
  async function markPrimary() {
    await api.patch(`/catalog/attachments/${attachment.id}/primary`);
    reload();
  }

  async function deleteAtt() {
    if (!confirm("Are you sure you want to permanently delete this file?")) return;
    await api.delete(`/catalog/attachments/${attachment.id}`);
    reload();
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-700 shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <a href={resolveAssetUrl(attachment.urlOrPath) || ""} target="_blank" rel="noreferrer" className="text-blue-400 text-sm font-semibold hover:underline no-underline">
            {attachment.fileName}
          </a>
          {attachment.isPrimary && <span className="bg-blue-600 text-white text-[0.65rem] px-2 py-0.5 rounded-full font-bold">PRIMARY_BOUND</span>}
        </div>
        <span className="text-xs text-gray-500">{new Date(attachment.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="flex items-center gap-4">
        {isDiagram && !attachment.isPrimary && (
          <button onClick={markPrimary} className="text-xs text-blue-400 hover:text-blue-300 bg-transparent border-0 cursor-pointer font-bold w-auto p-0">
            Set Primary
          </button>
        )}
        <button onClick={deleteAtt} className="text-xs text-red-500 hover:text-red-400 bg-transparent border-0 cursor-pointer font-bold w-auto p-0">
          Delete
        </button>
      </div>
    </div>
  );
}
