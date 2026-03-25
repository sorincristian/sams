import React, { useState, useRef, useCallback } from "react";
import { api } from "../api";
import { CatalogAutocomplete } from "./CatalogAutocomplete";
import "./BusImportWizard.css";

interface BusImportWizardProps {
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
  { key: 'model', label: 'Model', required: true },
  { key: 'manufacturer', label: 'Manufacturer', required: true },
  { key: 'garage', label: 'Garage / Depot', required: true },
  { key: 'status', label: 'Status', required: false },
];

const MODE_OPTIONS = [
  { value: 'UPSERT', title: 'Upsert', desc: 'Create new buses and update existing ones. Best for keeping your fleet data in sync.' },
  { value: 'CREATE_ONLY', title: 'Create Only', desc: 'Only add new buses. Existing fleet numbers will be skipped — nothing gets overwritten.' },
  { value: 'UPDATE_ONLY', title: 'Update Only', desc: 'Only update buses that already exist. New fleet numbers will be skipped.' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string): string {
  return name.split('.').pop()?.toUpperCase() || 'FILE';
}

export function BusImportWizard({ onClose, onSuccess }: BusImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importMode, setImportMode] = useState('UPSERT');
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
    formData.append("mode", importMode);

    // Send the column mapping when re-previewing from the mapping step
    if (sendMapping) {
      formData.append("columnMapping", JSON.stringify(mappedHeaders));
    }

    try {
      const res = await api.post("/buses/import/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setPreviewData(res.data);
      setDetectedHeaders(res.data.detectedHeaders || []);

      // Only update mappedHeaders on initial upload (auto-detect),
      // not when re-previewing after manual mapping changes
      if (!sendMapping) {
        setMappedHeaders(res.data.mappedHeaders || {});
      }

      // If file just uploaded, go to mapping step
      if (step === 'upload') setStep('mapping');
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.missingFields?.length) {
        // 422: Required column mappings are missing
        setDetectedHeaders(data.detectedHeaders || []);
        setMappedHeaders(data.mappedHeaders || {});
        setErrorMsg(`Could not auto-detect required columns: ${data.missingFields.map((f: string) => f.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase()).trim()).join(', ')}. Please map them manually.`);
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
      const res = await api.post("/buses/import/commit", { rows: previewData.rows, filename: file?.name });
      setCommitResult(res.data);
      setStep('result');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Error CSV Download ---
  const downloadErrorCSV = () => {
    if (!previewData?.rows) return;
    const errorRows = previewData.rows.filter((r: any) => !r.isValid);
    if (errorRows.length === 0) return;

    const csvLines = ['Row Number,Fleet Number,Model,Manufacturer,Garage,Status,Errors'];
    for (const row of errorRows) {
      const errStr = row.errors
        ? (typeof row.errors === 'object' && !Array.isArray(row.errors)
            ? Object.entries(row.errors).map(([k, v]) => `${k}: ${v}`).join('; ')
            : Array.isArray(row.errors) ? row.errors.join('; ') : String(row.errors))
        : '';
      csvLines.push(
        `${row.rowNumber},"${row.data.fleetNumber || ''}","${row.data.model || ''}","${row.data.manufacturer || ''}","${row.data.garageName || ''}","${row.data.status || ''}","${errStr}"`
      );
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Stepper ---
  const renderStepper = () => (
    <div className="wizard-stepper">
      {STEPS.map((s, i) => (
        <div
          key={s.key}
          className={`wizard-step-indicator ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'completed' : ''}`}
        >
          <div className="step-dot">
            {i < stepIndex ? '✓' : i + 1}
          </div>
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
        onKeyDown={(e) => e.key === 'Enter' && !file && fileInputRef.current?.click()}
        aria-label="Drop file here or click to browse"
      >
        <svg className="dropzone-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <div className="dropzone-text">
          {file ? 'File selected — drop a new file to replace' : 'Drag & drop your spreadsheet here'}
        </div>
        <div className="dropzone-hint">
          or <span className="dropzone-browse" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>browse files</span> · Supports .csv, .xls, .xlsx
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

      <a
        href="/api/buses/import/template"
        download="sams_fleet_import_template.csv"
        className="template-download"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download CSV Template
      </a>
    </div>
  );

  const MappingRow = ({ field, mapped, detectedHeaders, onChange }: { field: any, mapped: string | null, detectedHeaders: string[], onChange: (val: string | null) => void }) => {
    const isAuto = !!mapped;
    const [query, setQuery] = useState(mapped || "");

    React.useEffect(() => {
      if (mapped && query !== mapped) setQuery(mapped);
    }, [mapped]);

    const mappingParts = React.useMemo(() => detectedHeaders.map(h => ({
      id: h,
      partNumber: h,
      description: "",
      vendor: "",
      componentType: ""
    })), [detectedHeaders]);

    return (
      <tr key={field.key}>
        <td>
          <strong>{field.label}</strong>
          {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
        </td>
        <td>
          <CatalogAutocomplete
            catalogParts={mappingParts}
            queryLocal={query}
            setQueryLocal={setQuery}
            selectedPartId={mapped || null}
            setSelectedPartId={onChange}
            placeholder="— Not mapped —"
            getDisplayValue={(p) => p.partNumber}
            renderItem={(p, isHighlighted) => (
              <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{p.partNumber}</div>
            )}
          />
        </td>
        <td>
          {isAuto ? (
            <span className="mapping-auto-badge">✓ Auto</span>
          ) : (
            <span className="mapping-manual-badge">⚠ Manual</span>
          )}
        </td>
      </tr>
    );
  };

  // --- STEP 2: Mapping ---
  const renderMapping = () => (
    <div>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        We detected <strong>{detectedHeaders.length}</strong> columns in your file. Please verify the mappings below.
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
            <MappingRow
              key={field.key}
              field={field}
              mapped={mappedHeaders[field.key] || null}
              detectedHeaders={detectedHeaders}
              onChange={(val) => setMappedHeaders(prev => ({ ...prev, [field.key]: val }))}
            />
          ))}
        </tbody>
      </table>
    </div>
  );

  // --- STEP 3: Preview ---
  const renderPreview = () => {
    if (!previewData) return null;

    const rows = previewData.rows || [];
    const totalRows = previewData.totalRows || 0;
    const validRows = previewData.validRows || 0;
    const errorRows = previewData.errorRows || 0;
    const skippedRows = previewData.skippedRows || 0;
    const createRows = previewData.createRows || 0;
    const updateRows = previewData.updateRows || 0;
    const dupeRows = previewData.duplicateRows || 0;

    return (
      <div>
        <div className="wizard-stats">
          <div className="wizard-stat-card">
            <div className="wizard-stat-value" style={{ color: '#111827' }}>{totalRows}</div>
            <div className="wizard-stat-label">Total</div>
          </div>
          <div className="wizard-stat-card" style={{ borderTop: '3px solid #16a34a' }}>
            <div className="wizard-stat-value" style={{ color: '#16a34a' }}>{createRows}</div>
            <div className="wizard-stat-label">Create</div>
          </div>
          <div className="wizard-stat-card" style={{ borderTop: '3px solid #d97706' }}>
            <div className="wizard-stat-value" style={{ color: '#d97706' }}>{updateRows}</div>
            <div className="wizard-stat-label">Update</div>
          </div>
          <div className="wizard-stat-card" style={{ borderTop: '3px solid #6b7280' }}>
            <div className="wizard-stat-value" style={{ color: '#6b7280' }}>{skippedRows}</div>
            <div className="wizard-stat-label">Skip</div>
          </div>
          <div className="wizard-stat-card" style={{ borderTop: '3px solid #dc2626' }}>
            <div className="wizard-stat-value" style={{ color: '#dc2626' }}>{errorRows}</div>
            <div className="wizard-stat-label">Error</div>
          </div>
          {dupeRows > 0 && (
            <div className="wizard-stat-card" style={{ borderTop: '3px solid #7c3aed' }}>
              <div className="wizard-stat-value" style={{ color: '#7c3aed' }}>{dupeRows}</div>
              <div className="wizard-stat-label">Duplicate</div>
            </div>
          )}
        </div>

        <div className="preview-table-wrap">
          <table className="preview-table">
            <thead>
              <tr>
                <th>Row</th>
                <th>Action</th>
                <th>Fleet #</th>
                <th>Model</th>
                <th>Manufacturer</th>
                <th>Garage</th>
                <th>Status</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((row: any, i: number) => (
                <tr key={i} className={`row-${row.action?.toLowerCase() || 'error'}`}>
                  <td>{row.rowNumber}</td>
                  <td>
                    <span className={`action-badge ${row.action?.toLowerCase() || 'error'}`}>
                      {row.isValid ? row.action : 'ERROR'}
                    </span>
                  </td>
                  <td>{row.data?.fleetNumber || '—'}</td>
                  <td>{row.data?.model || '—'}</td>
                  <td>{row.data?.manufacturer || '—'}</td>
                  <td>{row.data?.garageName || '—'}</td>
                  <td>{row.data?.status || '—'}</td>
                  <td style={{ maxWidth: '180px', fontSize: '0.75rem' }}>
                    {row.errors && (typeof row.errors === 'object' && !Array.isArray(row.errors)
                      ? Object.keys(row.errors).length > 0
                      : row.errors.length > 0) ? (
                      <span style={{ color: '#dc2626' }}>
                        {typeof row.errors === 'object' && !Array.isArray(row.errors)
                          ? Object.entries(row.errors).filter(([k]) => k !== '_mode').map(([k, v]) => `${k}: ${v}`).join(', ')
                          : Array.isArray(row.errors) ? row.errors.join(', ') : String(row.errors)}
                      </span>
                    ) : (
                      <span style={{ color: '#16a34a' }}>Valid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 100 && (
          <div style={{ textAlign: 'center', padding: '0.75rem', color: '#6b7280', fontSize: '0.8125rem' }}>
            Showing first 100 of {rows.length} rows
          </div>
        )}

        {errorRows > 0 && (
          <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
            <button
              onClick={downloadErrorCSV}
              className="btn btn-secondary"
              style={{ fontSize: '0.8125rem' }}
            >
              ↓ Download Error Report
            </button>
          </div>
        )}
      </div>
    );
  };

  // --- STEP 4: Confirm ---
  const renderConfirm = () => {
    if (!previewData) return null;
    const validRows = previewData.validRows || 0;
    const createRows = previewData.createRows || 0;
    const updateRows = previewData.updateRows || 0;
    const errorRows = previewData.errorRows || 0;

    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Ready to Import</h3>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Please review the summary below before committing.
          </p>
        </div>

        <div className="review-summary">
          <div className="review-row">
            <span className="review-label">File</span>
            <span className="review-value">{file?.name || '—'}</span>
          </div>
          <div className="review-row">
            <span className="review-label">Import Mode</span>
            <span className="review-value">{MODE_OPTIONS.find(m => m.value === importMode)?.title || importMode}</span>
          </div>
          <div className="review-row">
            <span className="review-label">Buses to Create</span>
            <span className="review-value" style={{ color: '#16a34a' }}>{createRows}</span>
          </div>
          <div className="review-row">
            <span className="review-label">Buses to Update</span>
            <span className="review-value" style={{ color: '#d97706' }}>{updateRows}</span>
          </div>
          <div className="review-row">
            <span className="review-label">Total Valid</span>
            <span className="review-value">{validRows}</span>
          </div>
          {errorRows > 0 && (
            <div className="review-row">
              <span className="review-label">Errors (will be skipped)</span>
              <span className="review-value" style={{ color: '#dc2626' }}>{errorRows}</span>
            </div>
          )}
        </div>

        {errorRows > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#fef3c7', borderRadius: '8px', fontSize: '0.8125rem', color: '#92400e' }}>
            ⚠ {errorRows} row{errorRows > 1 ? 's' : ''} with errors will be skipped during import.
          </div>
        )}

        {/* Mode selection */}
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem' }}>Import Mode</p>
          <div className="mode-cards">
            {MODE_OPTIONS.map(mode => (
              <div
                key={mode.value}
                className={`mode-card ${importMode === mode.value ? 'selected' : ''}`}
                onClick={() => setImportMode(mode.value)}
                role="radio"
                aria-checked={importMode === mode.value}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setImportMode(mode.value)}
              >
                <div className="mode-radio" />
                <div className="mode-card-content">
                  <h4>{mode.title}</h4>
                  <p>{mode.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- STEP 5: Result ---
  const renderResult = () => {
    if (!commitResult) return null;
    const { created, updated, skipped, failed } = commitResult;
    const total = created + updated + skipped + (failed || 0);
    const isFullSuccess = (failed || 0) === 0;

    return (
      <div className="result-screen">
        <div className={`result-icon ${isFullSuccess ? 'success' : 'partial'}`}>
          {isFullSuccess ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          )}
        </div>
        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 700 }}>
          {isFullSuccess ? 'Import Successful!' : 'Import Complete with Issues'}
        </h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
          {isFullSuccess
            ? `${created + updated} buses processed successfully.`
            : `${created + updated} buses processed. ${failed || 0} failed.`}
        </p>

        <div className="result-stats">
          <div className="result-stat" style={{ background: '#f0fdf4' }}>
            <div className="result-stat-value" style={{ color: '#16a34a' }}>{created}</div>
            <div className="result-stat-label" style={{ color: '#166534' }}>Created</div>
          </div>
          <div className="result-stat" style={{ background: '#fffbeb' }}>
            <div className="result-stat-value" style={{ color: '#d97706' }}>{updated}</div>
            <div className="result-stat-label" style={{ color: '#92400e' }}>Updated</div>
          </div>
          <div className="result-stat" style={{ background: '#f9fafb' }}>
            <div className="result-stat-value" style={{ color: '#6b7280' }}>{skipped}</div>
            <div className="result-stat-label" style={{ color: '#6b7280' }}>Skipped</div>
          </div>
          <div className="result-stat" style={{ background: (failed || 0) > 0 ? '#fef2f2' : '#f9fafb' }}>
            <div className="result-stat-value" style={{ color: (failed || 0) > 0 ? '#dc2626' : '#6b7280' }}>{failed || 0}</div>
            <div className="result-stat-label" style={{ color: (failed || 0) > 0 ? '#991b1b' : '#6b7280' }}>Failed</div>
          </div>
        </div>

        {previewData?.errorRows > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <button onClick={downloadErrorCSV} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
              ↓ Download Error Report
            </button>
          </div>
        )}
      </div>
    );
  };

  // --- Navigation ---
  const canGoNext = (): boolean => {
    if (step === 'upload') return !!file;
    if (step === 'mapping') return true;
    if (step === 'preview') return (previewData?.validRows || 0) > 0;
    if (step === 'confirm') return (previewData?.validRows || 0) > 0;
    return false;
  };

  const handleNext = async () => {
    if (step === 'upload') {
      await runPreview(false);
    } else if (step === 'mapping') {
      // Re-run preview with user's manual mapping applied
      await runPreview(true);
      setStep('preview');
    } else if (step === 'preview') {
      setStep('confirm');
    } else if (step === 'confirm') {
      await handleCommit();
    }
  };

  const handleBack = () => {
    if (step === 'mapping') setStep('upload');
    else if (step === 'preview') setStep('mapping');
    else if (step === 'confirm') setStep('preview');
  };

  // --- Render ---
  return (
    <div className="import-wizard-backdrop" onClick={onClose}>
      <div className="import-wizard" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-header">
          <h2>Fleet Import Wizard</h2>
          <p>Import and manage your fleet data from a spreadsheet</p>
        </div>

        {renderStepper()}

        <div className="wizard-body">
          {errorMsg && <div className="wizard-error">{errorMsg}</div>}

          {loading ? (
            <div className="wizard-loading">
              <div className="wizard-spinner" />
              <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
                {step === 'confirm' ? 'Importing data...' : 'Analyzing your file...'}
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
              <button
                className="btn btn-primary"
                onClick={() => { onSuccess(); }}
              >
                Done
              </button>
            </>
          ) : (
            <>
              <div>
                {step !== 'upload' && (
                  <button className="btn btn-secondary" onClick={handleBack} disabled={loading}>
                    Back
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleNext}
                  disabled={!canGoNext() || loading}
                >
                  {step === 'confirm'
                    ? `Import ${previewData?.validRows || 0} Rows`
                    : step === 'upload'
                    ? 'Analyze File'
                    : 'Continue'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
