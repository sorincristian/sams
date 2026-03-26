import React from "react";
import { api } from "../../../api";

interface AttachmentsModalProps {
  partId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AttachmentsModal({ partId, onClose, onSaved }: AttachmentsModalProps) {
  const [form, setForm] = React.useState({
    attachmentType: "DIAGRAM",
    fileName: "",
    fileType: "image/png",
    urlOrPath: "",
    notes: "",
    isPrimary: false,
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post(`/catalog/${partId}/attachments`, form);
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to upload attachment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <h3 className="text-white text-xl font-bold mb-4 mt-0">Upload New Attachment</h3>
        {error && <div className="text-red-500 mb-4 font-semibold text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-semibold text-gray-200">
            Attachment Type *
            <select
              required
              value={form.attachmentType}
              onChange={(e) => setForm((f) => ({ ...f, attachmentType: e.target.value }))}
              className="bg-gray-900 border border-gray-700 text-white rounded-md p-2"
            >
              <option value="DIAGRAM">Engineering Diagram (Blueprint)</option>
              <option value="INSTALL_GUIDE">Installation Guide (PDF)</option>
              <option value="PHOTO">Reference Photo</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold text-gray-200">
            File Name *
            <input
              required
              placeholder="e.g. Proterra_Seat_Grid.png"
              value={form.fileName}
              onChange={(e) => setForm((f) => ({ ...f, fileName: e.target.value }))}
              className="bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-md p-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold text-gray-200">
            Asset URL *
            <input
              required
              placeholder="e.g. https://s3.amazonaws.com/model.pdf"
              value={form.urlOrPath}
              onChange={(e) => setForm((f) => ({ ...f, urlOrPath: e.target.value }))}
              className="bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-md p-2"
            />
          </label>

          {form.attachmentType === "DIAGRAM" && (
            <label className="flex items-center gap-3 mt-2 text-sm text-gray-200 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-600 focus:ring-blue-500"
              />
              Mark as Primary Interactive Mapping Target
            </label>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? "Uploading..." : "Save Attachment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
