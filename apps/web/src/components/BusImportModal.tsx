import React, { useState, useRef } from "react";
import { api } from "../api";
import "./BusImportModal.css"; 

interface BusImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function BusImportModal({ onClose, onSuccess }: BusImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setPreviewData(null);
      setErrorMsg(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/buses/import/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setPreviewData(res.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Failed to parse excel file");
    } finally {
      setUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData || previewData.valid === 0) return;
    setUploading(true);
    setErrorMsg(null);

    try {
      const res = await api.post("/buses/import/commit", { rows: previewData.rows });
      alert(`Import complete! Created: ${res.data.created}, Updated: ${res.data.updated}`);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Failed to commit import transaction");
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal modal-large">
        <h2>Bulk Import Fleet Data</h2>
        
        {errorMsg && <div className="toast toast-error" style={{ marginBottom: "1rem" }}>{errorMsg}</div>}

        {!previewData ? (
          <div>
            <p>Upload an Excel (.xlsx or .csv) file to update your fleet. Valid rows will be created or updated based on their Fleet Number.</p>
            <div style={{ backgroundColor: "#f9fafb", padding: "1rem", borderRadius: "8px", border: "1px dashed #d1d5db", margin: "1.5rem 0", textAlign: "center" }}>
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <button 
                className="btn btn-secondary" 
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </button>
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                {file ? file.name : "No file selected"}
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={onClose} className="btn btn-secondary" disabled={uploading}>Cancel</button>
              <button onClick={handlePreview} className="btn btn-primary" disabled={!file || uploading}>
                {uploading ? "Analyzing..." : "Preview Import"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
               <div className="stat-card" style={{ padding: "1rem" }}>
                 <div className="stat-label">Total Rows</div>
                 <div className="stat-value" style={{ fontSize: "1.5rem" }}>{previewData.total}</div>
               </div>
               <div className="stat-card" style={{ padding: "1rem", borderTop: "3px solid #16a34a" }}>
                 <div className="stat-label">Valid Entries</div>
                 <div className="stat-value text-green" style={{ fontSize: "1.5rem" }}>{previewData.valid}</div>
               </div>
               <div className="stat-card" style={{ padding: "1rem", borderTop: "3px solid #dc2626" }}>
                 <div className="stat-label">Errors</div>
                 <div className="stat-value" style={{ fontSize: "1.5rem", color: "#dc2626" }}>{previewData.errors}</div>
               </div>
            </div>

            {previewData.rows.length > 0 && (
               <div className="table-responsive" style={{ maxHeight: "400px", overflowY: "auto", marginBottom: "1.5rem" }}>
                 <table className="fleet-table" style={{ fontSize: "0.875rem" }}>
                   <thead>
                     <tr>
                       <th>Row</th>
                       <th>Action</th>
                       <th>Fleet #</th>
                       <th>Model</th>
                       <th>Garage</th>
                       <th>Status</th>
                     </tr>
                   </thead>
                   <tbody>
                     {previewData.rows.slice(0, 100).map((row: any, i: number) => (
                       <tr key={i} style={{ backgroundColor: row.isValid ? "transparent" : "#fef2f2" }}>
                         <td>{row.rowNumber}</td>
                         <td>
                           {row.isValid ? (
                             <span className={`status-badge ${row.action === 'CREATE' ? 'status-active' : 'status-maintenance'}`}>
                               {row.action}
                             </span>
                           ) : (
                             <strong style={{ color: "#dc2626" }}>SKIP</strong>
                           )}
                         </td>
                         <td>{row.data.fleetNumber}</td>
                         <td>{row.data.model}</td>
                         <td>{row.data.garageName}</td>
                         <td style={{ maxWidth: "200px" }}>
                           {!row.isValid ? (
                             <span style={{ color: "#dc2626" }}>{row.errors.join(", ")}</span>
                           ) : (
                             <span className="text-green">Valid</span>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {previewData.rows.length > 100 && (
                   <div style={{ textAlign: "center", padding: "1rem", color: "#6b7280" }}>Showing first 100 rows...</div>
                 )}
               </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setPreviewData(null)} className="btn btn-secondary" disabled={uploading}>Back</button>
              <button 
                onClick={handleCommit} 
                className="btn btn-primary" 
                disabled={previewData.valid === 0 || uploading}
              >
                {uploading ? "Importing..." : `Commit ${previewData.valid} Valid Rows`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
