import React, { useState, useRef, useCallback } from "react";
import { api } from "../api";
import { CatalogAutocomplete } from "./CatalogAutocomplete";
import "./BusImportWizard.css"; // Reuse existing css styles

interface AllocationImportWizardProps {
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
  { key: 'fleetNumber', label: 'Fleet Number', required: true },
  { key: 'garage', label: 'Garage / Depot', required: true },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string): string {
  return name.split('.').pop()?.toUpperCase() || 'FILE';
}

export function AllocationImportWizard({ onClose, onSuccess }: AllocationImportWizardProps) {
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (['csv', 'xls', 'xlsx'].includes(ext || '')) {
        setFile(droppedFile); setPreviewData(null); setErrorMsg(null);
      } else {
        setErrorMsg('Unsupported file type. Please upload a .csv, .xls, or .xlsx file.');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]); setPreviewData(null); setErrorMsg(null);
    }
  };

  const removeFile = () => {
    setFile(null); setPreviewData(null); setMappedHeaders({}); setDetectedHeaders([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runPreview = async (sendMapping = false) => {
    if (!file) return;
    setLoading(true); setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    if (sendMapping) formData.append("columnMapping", JSON.stringify(mappedHeaders));

    try {
      const res = await api.post("/buses/import/allocation/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setPreviewData(res.data);
      setDetectedHeaders(res.data.detectedHeaders || []);
      if (!sendMapping) setMappedHeaders(res.data.mappedHeaders || {});
      if (step === 'upload') setStep('mapping');
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.missingFields?.length) {
        setDetectedHeaders(data.detectedHeaders || []);
        setMappedHeaders(data.mappedHeaders || {});
        setErrorMsg(`Could not auto-detect required columns: ${data.missingFields.join(', ')}. Please map them manually.`);
        if (step === 'upload') setStep('mapping');
      } else {
        setErrorMsg(data?.error || "Failed to parse the file. Please check the format.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData) return;
    setLoading(true); setErrorMsg(null);
    try {
      const res = await api.post("/buses/import/allocation/commit", { rows: previewData.rows, filename: file?.name });
      setCommitResult(res.data);
      setStep('result');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadErrorCSV = () => {
    if (!previewData?.rows) return;
    const errorRows = previewData.rows.filter((r: any) => !r.isValid);
    if (errorRows.length === 0) return;

    const csvLines = ['Row Number,Fleet Number,Garage Name,Errors'];
    for (const row of errorRows) {
      const errStr = typeof row.errors === 'object' 
        ? Object.entries(row.errors).map(([k, v]) => `${k}: ${v}`).join('; ') 
        : String(row.errors || '');
      csvLines.push(`${row.rowNumber},"${row.data.fleetNumber || ''}","${row.data.garageName || ''}","${errStr}"`);
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'allocation_import_errors.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const renderStepper = () => (
    <div className="wizard-stepper">
      {STEPS.map((s, i) => (
        <div key={s.key} className={`wizard-step-indicator ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'completed' : ''}`}>
          <div className="step-dot">{i < stepIndex ? '✓' : i + 1}</div>
          <div className="step-label">{s.label}</div>
        </div>
      ))}
    </div>
  );

  const renderUpload = () => (
    <div>
      <input type="file" accept=".csv,.xls,.xlsx" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} id="import-file-input" />
      <div
        className={`import-dropzone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()} role="button" tabIndex={0}
      >
        <svg className="dropzone-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <div className="dropzone-text">{file ? 'File selected — drop a new file to replace' : 'Drag & drop your spreadsheet here'}</div>
        <div className="dropzone-hint">or <span className="dropzone-browse" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>browse files</span> · .csv, .xls, .xlsx</div>
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

  const MappingRow = ({ field, mapped, onChange }: any) => {
    const isAuto = !!mapped;
    const [query, setQuery] = useState(mapped || "");

    React.useEffect(() => { if (mapped && query !== mapped) setQuery(mapped); }, [mapped]);

    const mappingParts = React.useMemo(() => detectedHeaders.map(h => ({
      id: h, partNumber: h, description: "", vendor: "", componentType: ""
    })), [detectedHeaders]);

    return (
      <tr key={field.key}>
        <td><strong>{field.label}</strong>{field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}</td>
        <td>
          <CatalogAutocomplete catalogParts={mappingParts} queryLocal={query} setQueryLocal={setQuery} selectedPartId={mapped || null} setSelectedPartId={onChange} placeholder="— Not mapped —" getDisplayValue={(p) => p.partNumber} renderItem={(p) => (<div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{p.partNumber}</div>)} />
        </td>
        <td>{isAuto ? <span className="mapping-auto-badge">✓ Auto</span> : <span className="mapping-manual-badge">⚠ Manual</span>}</td>
      </tr>
    );
  };

  const renderMapping = () => (
    <div>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>We detected <strong>{detectedHeaders.length}</strong> columns. Please verify the mapping.</p>
      <table className="mapping-table">
        <thead><tr><th>System Field</th><th>Detected Column</th><th>Status</th></tr></thead>
        <tbody>
          {SYSTEM_FIELDS.map(field => (
            <MappingRow key={field.key} field={field} mapped={mappedHeaders[field.key] || null} detectedHeaders={detectedHeaders} onChange={(val: any) => setMappedHeaders(prev => ({ ...prev, [field.key]: val }))} />
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPreview = () => {
    if (!previewData) return null;
    const { rows = [], totalRows = 0, validRows = 0, errorRows = 0, duplicateRows = 0 } = previewData;

    return (
      <div>
        <div className="wizard-stats">
          <div className="wizard-stat-card"><div className="wizard-stat-value" style={{ color: '#111827' }}>{totalRows}</div><div className="wizard-stat-label">Total</div></div>
          <div className="wizard-stat-card" style={{ borderTop: '3px solid #16a34a' }}><div className="wizard-stat-value" style={{ color: '#16a34a' }}>{validRows}</div><div className="wizard-stat-label">Valid</div></div>
          <div className="wizard-stat-card" style={{ borderTop: '3px solid #dc2626' }}><div className="wizard-stat-value" style={{ color: '#dc2626' }}>{errorRows}</div><div className="wizard-stat-label">Error</div></div>
          {duplicateRows > 0 && <div className="wizard-stat-card" style={{ borderTop: '3px solid #7c3aed' }}><div className="wizard-stat-value" style={{ color: '#7c3aed' }}>{duplicateRows}</div><div className="wizard-stat-label">Duplicate</div></div>}
        </div>
        <div className="preview-table-wrap">
          <table className="preview-table">
            <thead>
              <tr><th>Row</th><th>Action</th><th>Fleet #</th><th>Mapped Garage</th><th>Message</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((row: any, i: number) => (
                <tr key={i} className={`row-${row.action?.toLowerCase() || 'error'}`}>
                  <td>{row.rowNumber}</td>
                  <td><span className={`action-badge ${row.action?.toLowerCase() || 'error'}`}>{row.isValid ? row.action : 'ERROR'}</span></td>
                  <td>{row.data?.fleetNumber || '—'}</td>
                  <td>{row.data?.garageName || '—'}</td>
                  <td style={{ maxWidth: '180px', fontSize: '0.75rem' }}>
                    {row.errors && Object.keys(row.errors).length > 0 ? (
                      <span style={{ color: '#dc2626' }}>{Object.entries(row.errors).map(([k, v]) => `${k}: ${v}`).join(', ')}</span>
                    ) : <span style={{ color: '#16a34a' }}>Valid</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 100 && <div style={{ textAlign: 'center', padding: '0.75rem', color: '#6b7280', fontSize: '0.8125rem' }}>Showing first 100 of {rows.length} rows</div>}
        {errorRows > 0 && (
          <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
            <button onClick={downloadErrorCSV} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>↓ Download Error Report</button>
          </div>
        )}
      </div>
    );
  };

  const renderConfirm = () => {
    if (!previewData) return null;
    const { validRows = 0, errorRows = 0 } = previewData;

    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Ready to Map Allocations</h3>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>Please review the matrix summary before committing.</p>
        </div>
        <div className="review-summary">
          <div className="review-row"><span className="review-label">File</span><span className="review-value">{file?.name || '—'}</span></div>
          <div className="review-row"><span className="review-label">Import Mode</span><span className="review-value">Fleet Allocation Map</span></div>
          <div className="review-row"><span className="review-label">Valid Bus Allocations</span><span className="review-value" style={{ color: '#16a34a' }}>{validRows}</span></div>
          {errorRows > 0 && <div className="review-row"><span className="review-label">Errors (skipped)</span><span className="review-value" style={{ color: '#dc2626' }}>{errorRows}</span></div>}
        </div>
        {errorRows > 0 && <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#fef3c7', borderRadius: '8px', fontSize: '0.8125rem', color: '#92400e' }}>⚠ {errorRows} rows with errors will be skipped.</div>}
      </div>
    );
  };

  const renderResult = () => {
    if (!commitResult) return null;
    const { createdGarages, matchedGarages, createdBuses, updatedBuses, skipped, failed } = commitResult;
    const isFullSuccess = (failed || 0) === 0 && (skipped || 0) === 0;

    return (
      <div className="result-screen">
        <div className={`result-icon ${isFullSuccess ? 'success' : 'partial'}`}>
          {isFullSuccess ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>}
        </div>
        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 700 }}>{isFullSuccess ? 'Allocation Successful!' : 'Allocation Complete with Skips'}</h3>
        
        <div className="result-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="result-stat" style={{ background: '#f0fdf4' }}>
            <div className="result-stat-value" style={{ color: '#16a34a' }}>{createdGarages}</div>
            <div className="result-stat-label" style={{ color: '#166534' }}>New Garages Created</div>
          </div>
          <div className="result-stat" style={{ background: '#e0f2fe' }}>
            <div className="result-stat-value" style={{ color: '#0369a1' }}>{matchedGarages}</div>
            <div className="result-stat-label" style={{ color: '#0c4a6e' }}>Matched Existing Garages</div>
          </div>
          <div className="result-stat" style={{ background: '#f0fdf4' }}>
            <div className="result-stat-value" style={{ color: '#16a34a' }}>{createdBuses}</div>
            <div className="result-stat-label" style={{ color: '#166534' }}>New Buses Registered</div>
          </div>
          <div className="result-stat" style={{ background: '#fffbeb' }}>
            <div className="result-stat-value" style={{ color: '#d97706' }}>{updatedBuses}</div>
            <div className="result-stat-label" style={{ color: '#92400e' }}>Existing Buses Updated</div>
          </div>
        </div>

        {previewData?.errorRows > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <button onClick={downloadErrorCSV} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>↓ Download Error Report</button>
          </div>
        )}
      </div>
    );
  };

  const canGoNext = (): boolean => {
    if (step === 'upload') return !!file;
    if (step === 'mapping') return true;
    if (step === 'preview') return (previewData?.validRows || 0) > 0;
    if (step === 'confirm') return (previewData?.validRows || 0) > 0;
    return false;
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

  return (
    <div className="import-wizard-backdrop" onClick={onClose}>
      <div className="import-wizard" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-header">
          <h2>Garage / Bus Allocation Import</h2>
          <p>Import strict location allocations natively parsing standard spreadsheet aliases.</p>
        </div>
        {renderStepper()}
        <div className="wizard-body">
          {errorMsg && <div className="wizard-error">{errorMsg}</div>}
          {loading ? (
            <div className="wizard-loading">
              <div className="wizard-spinner" />
              <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>{step === 'confirm' ? 'Committing...' : 'Analyzing mapping constraints...'}</div>
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
            <><div /><button className="btn btn-primary" onClick={() => { onSuccess(); }}>Done</button></>
          ) : (
            <>
              <div>{step !== 'upload' && <button className="btn btn-secondary" onClick={handleBack} disabled={loading}>Back</button>}</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                <button className="btn btn-primary" onClick={handleNext} disabled={!canGoNext() || loading}>
                  {step === 'confirm' ? `Map ${previewData?.validRows || 0} Allocations` : step === 'upload' ? 'Analyze File' : 'Continue'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
