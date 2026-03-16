import React, { useState, useRef } from "react";
import { api } from "../api";
import "./BusImportModal.css"; 

interface BusImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function BusImportModal({ onClose, onSuccess }: BusImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<string>("UPSERT");
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
    formData.append("mode", importMode);

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
      alert(`Import complete!
Created: ${res.data.created}
Updated: ${res.data.updated}
Skipped: ${res.data.skipped}
Errors: ${res.data.failed}`);
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
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1rem" }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </button>
                <a 
                  href="/api/buses/import/template" 
                  download="sams_fleet_import_template.csv" 
                  className="btn btn-secondary"
                  style={{ textDecoration: 'none' }}
                >
                  Download Import Template
                </a>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                {file ? file.name : "No file selected"}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "2rem" }}>
              <label>Import Mode</label>
              <select 
                value={importMode} 
                onChange={e => setImportMode(e.target.value)} 
                className="filter-input"
                style={{ width: "100%" }}
              >
                <option value="UPSERT">Upsert (Create new, Update existing)</option>
                <option value="CREATE_ONLY">Create Only (Skip existing)</option>
                <option value="UPDATE_ONLY">Update Only (Skip new)</option>
              </select>
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
            {(() => {
              const totalRows = previewData.totalRows ?? previewData.total ?? 0;
              const validEntries = previewData.validRows ?? previewData.valid ?? 0;
              const errorRows = previewData.errorRows ?? previewData.errors ?? 0;
              const skippedRows = previewData.skippedRows ?? previewData.skipped ?? Math.max(0, totalRows - validEntries - errorRows);
              const duplicateRows = previewData.duplicateRows ?? 0;

              return (
                <React.Fragment>
                  <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
                     <div className="stat-card" style={{ padding: "1rem" }}>
                       <div className="stat-label">Total Rows</div>
                       <div className="stat-value" style={{ fontSize: "1.5rem" }}>{totalRows}</div>
                     </div>
                     <div className="stat-card" style={{ padding: "1rem", borderTop: "3px solid #16a34a" }}>
                       <div className="stat-label">Valid Entries</div>
                       <div className="stat-value text-green" style={{ fontSize: "1.5rem" }}>{validEntries}</div>
                     </div>
                     <div className="stat-card" style={{ padding: "1rem", borderTop: "3px solid #dc2626" }}>
                       <div className="stat-label">Errors / Skipped</div>
                       <div className="stat-value" style={{ fontSize: "1.5rem", color: "#dc2626" }}>{errorRows + skippedRows}</div>
                     </div>
                  </div>

            {(previewData.rows || []).length > 0 && (
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
                           <span className={`status-badge ${
                             row.isValid && row.action === 'CREATE' ? 'status-active' :
                             row.isValid && row.action === 'UPDATE' ? 'status-maintenance' :
                             row.action === 'SKIP' ? 'status-retired' : ''
                           }`}>
                             {!row.isValid ? <strong style={{ color: "#dc2626" }}>ERROR</strong> : row.action}
                           </span>
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
                 {(previewData.rows || []).length > 100 && (
                   <div style={{ textAlign: "center", padding: "1rem", color: "#6b7280" }}>Showing first 100 rows...</div>
                 )}
               </div>
            )}

                  <div className="modal-actions">
                    <button onClick={() => setPreviewData(null)} className="btn btn-secondary" disabled={uploading}>Back</button>
                    <button 
                      onClick={handleCommit} 
                      className="btn btn-primary" 
                      disabled={validEntries === 0 || uploading}
                    >
                      {uploading ? "Importing..." : `Commit ${validEntries} Valid Rows`}
                    </button>
                  </div>
                </React.Fragment>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
