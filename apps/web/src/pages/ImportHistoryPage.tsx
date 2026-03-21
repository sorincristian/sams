import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import './ImportHistoryPage.css';

type ImportStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'UNKNOWN';

type ImportHistoryItem = {
  id: string;
  requestId?: string;
  filename: string;
  user: string;
  createdAt: string;
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  status: ImportStatus;
  mappingMeta?: Record<string, { source?: string; confidence?: number; matchedAlias?: string }>;
  missingMappings?: string[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: '2-digit', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  }).format(new Date(value));
}

function formatRelative(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getSuccessRate(item: ImportHistoryItem) {
  if (!item.totalRows) return 0;
  return (item.totalRows - item.failed) / item.totalRows;
}

// ── Stat card ──
function StatCard({ title, value, subtitle, icon }: { title: string; value: string | number; subtitle: string; icon: string }) {
  return (
    <div className="ih-stat-card">
      <div className="ih-stat-body">
        <p className="ih-stat-title">{title}</p>
        <p className="ih-stat-value">{value}</p>
        <p className="ih-stat-subtitle">{subtitle}</p>
      </div>
      <div className="ih-stat-icon">{icon}</div>
    </div>
  );
}

// ── Detail row ──
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="ih-detail-row">
      <span className="ih-detail-label">{label}</span>
      <div className="ih-detail-value">{value}</div>
    </div>
  );
}

export function ImportHistoryPage() {
  const [items, setItems] = useState<ImportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ImportStatus>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadHistory = async () => {
    const isInitial = items.length === 0;
    try {
      if (isInitial) setLoading(true); else setRefreshing(true);
      setError(null);
      const res = await api.get('/buses/import/history');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load import history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void loadHistory(); }, []);

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const target = [item.filename, item.user, item.requestId ?? ''].join(' ').toLowerCase();
      const matchesQuery = target.includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [items, query, statusFilter]);

  const selected = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.find(item => item.id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected && filtered.length) setSelectedId(filtered[0].id);
  }, [filtered, selected]);

  const totals = useMemo(() => {
    return filtered.reduce((acc, item) => {
      acc.imports += 1;
      acc.rows += item.totalRows;
      acc.created += item.created;
      acc.updated += item.updated;
      acc.failed += item.failed;
      return acc;
    }, { imports: 0, rows: 0, created: 0, updated: 0, failed: 0 });
  }, [filtered]);

  const healthRate = totals.rows ? (totals.rows - totals.failed) / totals.rows : 0;

  const copyRequestId = (reqId: string) => {
    navigator.clipboard?.writeText(reqId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="ih-page">
      {/* Header */}
      <div className="ih-header">
        <div>
          <div className="ih-badge">📊 Fleet ingestion operations</div>
          <h1 className="ih-title">Import History</h1>
          <p className="ih-description">
            Review fleet uploads, trace request IDs, inspect mapping decisions, and identify failed imports.
          </p>
        </div>
        <div className="ih-header-actions">
          <button className="ih-btn ih-btn-outline" onClick={() => void loadHistory()} disabled={refreshing}>
            {refreshing ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="ih-stats-grid">
        <StatCard title="Imports" value={totals.imports} subtitle="Visible in current filters" icon="📁" />
        <StatCard title="Rows processed" value={totals.rows} subtitle={`${totals.created} created · ${totals.updated} updated`} icon="#" />
        <StatCard title="Failed rows" value={totals.failed} subtitle="Rows rejected or blocked" icon="⚠" />
        <StatCard title="Success rate" value={pct(healthRate)} subtitle="Across filtered results" icon="✓" />
      </div>

      {/* Main content */}
      <div className="ih-main-grid">
        {/* Left: Table */}
        <div className="ih-card">
          <div className="ih-card-header">
            <div className="ih-card-title-group">
              <h2 className="ih-card-title">Recent import runs</h2>
              <p className="ih-card-subtitle">Search by filename, user, or request ID</p>
            </div>
            <div className="ih-filters">
              <div className="ih-search-wrap">
                <span className="ih-search-icon">🔍</span>
                <input
                  type="text"
                  className="ih-search-input"
                  placeholder="Search imports..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <select
                className="ih-filter-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
              >
                <option value="ALL">All statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="PARTIAL">Partial</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          <div className="ih-table-wrap">
            {loading ? (
              <div className="ih-loading">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="ih-skeleton" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="ih-empty">
                <span style={{ fontSize: '2rem' }}>📭</span>
                <p>{items.length === 0 ? 'No import runs recorded yet.' : 'No runs match your current filters.'}</p>
              </div>
            ) : (
              <table className="ih-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Status</th>
                    <th>User</th>
                    <th>Rows</th>
                    <th>Time</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const active = selected?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        className={active ? 'active' : ''}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <td>
                          <div className="ih-file-cell">
                            <div className="ih-file-icon">📄</div>
                            <div>
                              <p className="ih-file-name">{item.filename}</p>
                              <p className="ih-file-sub">{item.requestId?.slice(0, 8) ?? item.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`ih-status-badge ${item.status.toLowerCase()}`}>
                            {item.status === 'SUCCESS' ? '✓' : item.status === 'PARTIAL' ? '⚠' : item.status === 'FAILED' ? '✗' : '?'}{' '}
                            {item.status}
                          </span>
                        </td>
                        <td className="ih-text-muted">{item.user}</td>
                        <td>
                          <div className="ih-rows-cell">
                            <span className="ih-rows-total">{item.totalRows}</span>
                            <span className="ih-rows-detail">{item.created}c · {item.updated}u · {item.failed}f</span>
                          </div>
                        </td>
                        <td>
                          <div className="ih-time-cell">
                            <span className="ih-time-rel">{formatRelative(item.createdAt)}</span>
                            <span className="ih-time-abs">{formatDate(item.createdAt)}</span>
                          </div>
                        </td>
                        <td><span className="ih-chevron">›</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {error && (
            <div className="ih-error-banner">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className="ih-card ih-detail-panel">
          <h2 className="ih-card-title" style={{ padding: '1.25rem 1.5rem 0.75rem' }}>Run details</h2>
          {!selected ? (
            <div className="ih-detail-empty">
              Select an import run to inspect its details.
            </div>
          ) : (
            <div className="ih-detail-scroll">
              {/* Header card */}
              <div className="ih-detail-header-card">
                <div>
                  <p className="ih-detail-filename">{selected.filename}</p>
                  <p className="ih-detail-date">{formatDate(selected.createdAt)}</p>
                </div>
                <span className={`ih-status-badge ${selected.status.toLowerCase()}`}>
                  {selected.status === 'SUCCESS' ? '✓' : selected.status === 'PARTIAL' ? '⚠' : selected.status === 'FAILED' ? '✗' : '?'}{' '}
                  {selected.status}
                </span>
              </div>

              {/* Info */}
              <div className="ih-detail-section">
                <DetailRow label="Imported by" value={<span>👤 {selected.user}</span>} />
                <div className="ih-separator" />
                <DetailRow label="Request ID" value={
                  <button
                    className="ih-copy-btn"
                    onClick={() => selected.requestId && copyRequestId(selected.requestId)}
                    title="Copy to clipboard"
                  >
                    {copied ? '✓ Copied' : `📋 ${selected.requestId ?? 'N/A'}`}
                  </button>
                } />
                <div className="ih-separator" />
                <DetailRow label="Total rows" value={selected.totalRows} />
                <div className="ih-separator" />
                <DetailRow label="Created" value={<span style={{ color: '#16a34a' }}>{selected.created}</span>} />
                <div className="ih-separator" />
                <DetailRow label="Updated" value={<span style={{ color: '#d97706' }}>{selected.updated}</span>} />
                <div className="ih-separator" />
                <DetailRow label="Failed" value={<span style={{ color: '#dc2626' }}>{selected.failed}</span>} />
                <div className="ih-separator" />
                <DetailRow label="Success rate" value={pct(getSuccessRate(selected))} />
              </div>

              {/* Mapping decisions */}
              {selected.mappingMeta && Object.keys(selected.mappingMeta).length > 0 && (
                <div className="ih-detail-section">
                  <h3 className="ih-section-title">🗂 Mapping decisions</h3>
                  <div className="ih-mapping-list">
                    {Object.entries(selected.mappingMeta).map(([field, meta]) => (
                      <div key={field} className="ih-mapping-item">
                        <div>
                          <p className="ih-mapping-field">{field}</p>
                          <p className="ih-mapping-source">
                            Source: {meta.source ?? 'unknown'}
                            {meta.matchedAlias ? ` · Alias: "${meta.matchedAlias}"` : ''}
                          </p>
                        </div>
                        <span className="ih-confidence-badge">
                          {meta.confidence != null ? pct(meta.confidence) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing mappings */}
              {selected.missingMappings && selected.missingMappings.length > 0 && (
                <div className="ih-detail-section">
                  <h3 className="ih-section-title">⚠ Missing mappings</h3>
                  <div className="ih-missing-list">
                    {selected.missingMappings.map(field => (
                      <span key={field} className="ih-missing-badge">{field}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
