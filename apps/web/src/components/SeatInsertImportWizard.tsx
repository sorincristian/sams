import React, { useState, useRef, useCallback } from "react";
import { api } from "../api";
import { CatalogAutocomplete } from "./CatalogAutocomplete";
import "./BusImportWizard.css"; // Reuse existing styles

interface SeatInsertImportWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 'upload' | 'mapping' | 'preview' | 'confirm' | 'result';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'mapping', label: 'Mapping' },
  { key: 'preview', label: 'Preview' },
  { key: 'confirm', label: 'Confirm' },
  { key: 'result', label: 'Result' },
];

const SYSTEM_FIELDS = [
  { key: 'partNumber', label: 'Part Number', required: true },
  { key: 'description', label: 'Description', required: true },
  { key: 'category', label: 'Category (Cushion/Back)', required: true },
  { key: 'vendor', label: 'Vendor', required: false },
  { key: 'manufacturerPartNumber', label: 'Manufacturer Part #', required: false }
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string): string {
  return name.split('.').pop()?.toUpperCase() || 'FILE';
}

export function SeatInsertImportWizard({ onClose, onSuccess }: SeatInsertImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [mappedHeaders, setMappedHeaders] = useState<Record<string, string | null>>({});
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEPS.findIndex(s => s.key === step);

  // --- Drag and Drop ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (['csv', 'xls', 'xlsx'].includes(ext || '')) {
        setFile(droppedFile);
        setPreviewData(null);
        setErrorMsg(null);
      } else {
        setErrorMsg('Unsupported file type. Please upload a .csv, .xls, or .xlsx file.');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setPreviewData(null);
      setErrorMsg(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreviewData(null);
    setMappedHeaders({});
    setDetectedHeaders([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Preview ---
  const runPreview = async (sendMapping = false) => {
    if (!file) return;
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    if (sendMapping) {
      formData.append("columnMapping", JSON.stringify(mappedHeaders));
    }

    try {
      const res = await api.post("/seat-inserts/import/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setPreviewData(res.data);
      setDetectedHeaders(res.data.detectedHeaders || []);

      if (!sendMapping) {
        setMappedHeaders(res.data.mappedHeaders || {});
      }

      if (step === 'upload') setStep('mapping');
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.error?.includes("Missing required column mappings")) {
        setDetectedHeaders(data.detectedHeaders || []);
        setMappedHeaders(data.mappedHeaders || {});
        setErrorMsg(data.error);
        if (step === 'upload') setStep('mapping');
      } else {
        setErrorMsg(data?.error || "Failed to parse the file. Please check the format.");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Commit ---
  const handleCommit = async () => {
    if (!previewData) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post("/seat-inserts/import/commit", { rows: previewData.rows });
      setCommitResult(res.data);
      setStep('result');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Stepper ---
  const renderStepper = () => (
    <div className="wizard-stepper">
      {STEPS.map((s, i) => (
        <div
          key={s.key}
          className={`wizard-step-indicator ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'completed' : ''}`}
        >
          <div className="step-dot">{i < stepIndex ? '✓' : i + 1}</div>
          <div className="step-label">{s.label}</div>
        </div>
      ))}
    </div>
  );

  // --- STEP 1: Upload ---
  const renderUpload = () => (
    <div>
      <input
        type="file"
        accept=".csv,.xls,.xlsx"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="import-file-input"
      />

      <div
        className={`import-dropzone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <svg className="dropzone-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <div className="dropzone-text">
          {file ? 'File selected — drop a new file to replace' : 'Drag & drop catalog spreadsheet here'}
        </div>
        <div className="dropzone-hint">
          or <span className="dropzone-browse" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>browse files</span>
        </div>
      </div>

      {file && (
        <div className="file-info-card">
          <div className="file-icon">{getFileExtension(file.name)}</div>
          <div className="file-details">
            <div className="file-name">{file.name}</div>
            <div className="file-size">{formatFileSize(file.size)}</div>
          </div>
          <button className="file-remove" onClick={removeFile} type="button">Remove</button>
        </div>
      )}
    </div>
  );

  const renderMapping = () => (
    <div>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        Please verify the mappings below to build the Seat Insert Catalog dictionary.
      </p>
      <table className="mapping-table">
        <thead>
          <tr>
            <th>System Field</th>
            <th>Detected Column</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {SYSTEM_FIELDS.map(field => (
            <tr key={field.key}>
              <td>
                <strong>{field.label}</strong>
                {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
              </td>
              <td>
                <select 
                   value={mappedHeaders[field.key] || ""} 
                   onChange={(e) => setMappedHeaders(prev => ({ ...prev, [field.key]: e.target.value }))}
                   style={{ width: '100%', padding: '4px' }}
                >
                   <option value="">— Not mapped —</option>
                   {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </td>
              <td>
                {mappedHeaders[field.key] ? (
                  <span className="mapping-auto-badge">✓ Mapped</span>
                ) : (
                  <span className="mapping-manual-badge">⚠ Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPreview = () => {
    if (!previewData) return null;

    const rows = previewData.rows || [];
    const totalRows = previewData.totalRows || 0;
    const skippedRows = previewData.skippedRows || 0;
    const validCushions = previewData.validCushions || 0;
    const validBacks = previewData.validBacks || 0;

    return (
      <div>
        <div className="wizard-stats">
          <div className="wizard-stat-card">
            <div className="wizard-stat-value">{totalRows}</div>
            <div className="wizard-stat-label">Total Evaluated</div>
          </div>
          <div className="wizard-stat-card" style={{ borderTop: '3px solid #3b82f6' }}>
            <div className="wizard-stat-value" style={{ color: '#3b82f6' }}>{validCushions}</div>
            <div className="wizard-stat-label">Cushion Inserts</div>
          </div>
          <div className="wizard-stat-card" style={{ borderTop: '3px solid #8b5cf6' }}>
            <div className="wizard-stat-value" style={{ color: '#8b5cf6' }}>{validBacks}</div>
            <div className="wizard-stat-label">Back Inserts</div>
          </div>
          <div className="wizard-stat-card" style={{ borderTop: '3px solid #d97706' }}>
            <div className="wizard-stat-value" style={{ color: '#d97706' }}>{skippedRows}</div>
            <div className="wizard-stat-label">Skipped rows</div>
          </div>
        </div>

        {skippedRows > 0 && (
           <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef3c7', color: '#92400e', borderRadius: '6px', fontSize: '13px' }}>
              <strong>Skipped: unsupported item type (only cushion/back inserts allowed)</strong>
           </div>
        )}

        <div className="preview-table-wrap">
          <table className="preview-table">
            <thead>
              <tr>
                <th>Row</th>
                <th>Action</th>
                <th>Category</th>
                <th>Part #</th>
                <th>Description</th>
                <th>Vendor</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((row: any, i: number) => (
                <tr key={i} className={`row-${row.action?.toLowerCase()}`}>
                  <td>{row.rowNumber}</td>
                  <td>
                    <span className={`action-badge ${row.action?.toLowerCase()}`}>
                      {row.action}
                    </span>
                  </td>
                  <td>{row.data?.category === 'CUSHION' ? 'Cushion Insert' : row.data?.category === 'BACK' ? 'Back Insert' : row.data?.rawCategory || '—'}</td>
                  <td>{row.data?.partNumber || '—'}</td>
                  <td>{row.data?.description || '—'}</td>
                  <td>{row.data?.vendor || '—'}</td>
                  <td style={{ fontSize: '0.75rem', color: row.action === 'SKIPPED' ? '#d97706' : '#16a34a' }}>
                    {row.errors || 'Valid catalog record'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderConfirm = () => {
    if (!previewData) return null;
    const skippedRows = previewData.skippedRows || 0;
    const validCushions = previewData.validCushions || 0;
    const validBacks = previewData.validBacks || 0;

    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Ready to Import Catalog</h3>
        </div>

        <div className="review-summary">
           <div className="review-row">
             <span className="review-label">Cushions to Catalog</span>
             <span className="review-value" style={{ color: '#3b82f6' }}>{validCushions}</span>
           </div>
           <div className="review-row">
             <span className="review-label">Backs to Catalog</span>
             <span className="review-value" style={{ color: '#8b5cf6' }}>{validBacks}</span>
           </div>
           {skippedRows > 0 && (
             <div className="review-row">
               <span className="review-label">Skipped (Frames/Covers/Hardware)</span>
               <span className="review-value" style={{ color: '#d97706' }}>{skippedRows}</span>
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!commitResult) return null;
    const { insertedCushions, insertedBacks, updatedRows, skippedRows } = commitResult;

    return (
      <div className="result-screen">
        <div className="result-icon success">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        </div>
        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 700 }}>Catalog Import Standardized</h3>
        <p style={{ margin: '0 0 1rem', color: '#6b7280', fontSize: '0.875rem' }}>Seat insert records successfully upserted into the dictionary.</p>

        <div className="result-stats">
          <div className="result-stat" style={{ background: '#eff6ff' }}>
            <div className="result-stat-value" style={{ color: '#3b82f6' }}>{insertedCushions}</div>
            <div className="result-stat-label" style={{ color: '#1e40af' }}>Cushions Inserted</div>
          </div>
          <div className="result-stat" style={{ background: '#f5f3ff' }}>
            <div className="result-stat-value" style={{ color: '#8b5cf6' }}>{insertedBacks}</div>
            <div className="result-stat-label" style={{ color: '#5b21b6' }}>Backs Inserted</div>
          </div>
          <div className="result-stat" style={{ background: '#f0fdf4' }}>
             <div className="result-stat-value" style={{ color: '#16a34a' }}>{updatedRows}</div>
             <div className="result-stat-label" style={{ color: '#166534' }}>Rows Updated</div>
          </div>
          <div className="result-stat" style={{ background: '#fffbeb' }}>
             <div className="result-stat-value" style={{ color: '#d97706' }}>{skippedRows}</div>
             <div className="result-stat-label" style={{ color: '#92400e' }}>Rows Skipped</div>
          </div>
        </div>
      </div>
    );
  };

  const handleNext = async () => {
    if (step === 'upload') await runPreview(false);
    else if (step === 'mapping') { await runPreview(true); setStep('preview'); }
    else if (step === 'preview') setStep('confirm');
    else if (step === 'confirm') await handleCommit();
  };

  const handleBack = () => {
    if (step === 'mapping') setStep('upload');
    else if (step === 'preview') setStep('mapping');
    else if (step === 'confirm') setStep('preview');
  };

  const canGoNext = () => {
    if (step === 'upload') return !!file;
    if (step === 'mapping') return true;
    if (step === 'preview') return (previewData?.validCushions > 0 || previewData?.validBacks > 0);
    if (step === 'confirm') return true;
    return false;
  };

  return (
    <div className="import-wizard-backdrop" onClick={onClose}>
      <div className="import-wizard" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-header">
          <h2>Seat Insert Catalog Wizard</h2>
          <p>Import cushion & back insert definitions (strictly filtered)</p>
        </div>

        {renderStepper()}

        <div className="wizard-body">
          {errorMsg && <div className="wizard-error">{errorMsg}</div>}

          {loading ? (
            <div className="wizard-loading">
              <div className="wizard-spinner" />
              <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
                {step === 'confirm' ? 'Saving to Catalog...' : 'Analyzing rows...'}
              </div>
            </div>
          ) : (
            <>
              {step === 'upload' && renderUpload()}
              {step === 'mapping' && renderMapping()}
              {step === 'preview' && renderPreview()}
              {step === 'confirm' && renderConfirm()}
              {step === 'result' && renderResult()}
            </>
          )}
        </div>

        <div className="wizard-footer">
          {step === 'result' ? (
             <>
               <div />
               <button className="btn btn-primary" onClick={onSuccess}>Done</button>
             </>
          ) : (
             <>
               <div>
                 {step !== 'upload' && <button className="btn btn-secondary" onClick={handleBack} disabled={loading}>Back</button>}
               </div>
               <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                 <button className="btn btn-primary" onClick={handleNext} disabled={!canGoNext() || loading}>
                   {step === 'confirm' ? 'Execute Catalog Import' : step === 'upload' ? 'Analyze File' : 'Continue'}
                 </button>
               </div>
             </>
          )}
        </div>
      </div>
    </div>
  );
}
