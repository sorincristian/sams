import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';
import { StatCard } from '../components/ui/StatCard';
import { FormField } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DataTable } from '../components/ui/DataTable';

// --- Domain logic ---
interface SeatChangeItem {
  id: string;
  partNumber: string;
  description: string;
  facility: string;
  status: string;
  quantity: number;
  changeType: 'created' | 'updated';
  changedBy: string | null;
  changedAt: string;
  notes: string;
}

export function SeatChangeReportPage() {
  const [data, setData] = useState<SeatChangeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [periodType, setPeriodType] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [facility, setFacility] = useState('');
  const [search, setSearch] = useState('');

  // Garages for filter
  const [garages, setGarages] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get('/garages').then(res => setGarages(res.data)).catch(console.error);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        date: selectedDate,
        period: periodType
      });
      if (facility) params.set('facility', facility);
      if (search) params.set('search', search);

      const res = await api.get(`/v1/reports/seat-changes?${params.toString()}`);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periodType, selectedDate, facility, search]);

  const stats = useMemo(() => {
    return {
      total: data.length,
      created: data.filter(d => d.changeType === 'created').length,
      updated: data.filter(d => d.changeType === 'updated').length
    };
  }, [data]);

  const handleExportCsv = () => {
    if (data.length === 0) return;
    
    const headers = ['Part Number', 'Description', 'Facility', 'Status', 'Quantity', 'Change Type', 'Changed By', 'Changed At', 'Notes'];
    const rows = data.map(item => [
      item.partNumber,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      `"${(item.facility || '').replace(/"/g, '""')}"`,
      item.status,
      item.quantity,
      item.changeType,
      item.changedBy || '',
      new Date(item.changedAt).toISOString(),
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    
    let filenameStr = selectedDate;
    if (periodType === 'Month') {
      const d = new Date(selectedDate);
      filenameStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (periodType === 'Week') {
      const d = new Date(selectedDate);
      const start = new Date(d.getFullYear(), 0, 1);
      const days = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((d.getDay() + 1 + days) / 7);
      filenameStr = `${d.getFullYear()}-week-${weekNumber}`;
    }
    
    link.download = `seat-change-report-${filenameStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Seat Change Report" 
        description="View created and updated seat inventory records over specific periods."
        actions={
          data.length > 0 ? (
            <button onClick={handleExportCsv}>Export CSV</button>
          ) : null
        }
      />

      <SectionCard>
        <div className="grid stats">
          <FormField label="Period Type">
            <select value={periodType} onChange={e => setPeriodType(e.target.value as any)}>
              <option value="Day">Day</option>
              <option value="Week">Week</option>
              <option value="Month">Month</option>
            </select>
          </FormField>
          
          <FormField label="Target Date">
            <input 
              type={periodType === 'Month' ? 'month' : 'date'}
              value={periodType === 'Month' ? selectedDate.slice(0, 7) : selectedDate}
              onChange={e => {
                let val = e.target.value;
                if (periodType === 'Month' && val) val += '-01';
                setSelectedDate(val || new Date().toISOString().split('T')[0]);
              }}
            />
          </FormField>

          <FormField label="Facility">
            <select value={facility} onChange={e => setFacility(e.target.value)}>
              <option value="">All Garages</option>
              {garages.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </FormField>

          <FormField label="Search Part / Desc">
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </FormField>
        </div>
      </SectionCard>

      {error && <ErrorState error={error} />}

      <div className="grid stats">
        <StatCard title="Total Changes" value={stats.total} />
        <StatCard title="Created" value={stats.created} />
        <StatCard title="Updated" value={stats.updated} />
      </div>

      <SectionCard title="Changed Records">
        {loading ? (
          <LoadingState />
        ) : data.length === 0 ? (
          <EmptyState message="No records found for the selected filters." />
        ) : (
          <DataTable
            headers={
              <>
                <th>Part / SKU</th>
                <th>Description</th>
                <th>Facility</th>
                <th>Status</th>
                <th>Qty</th>
                <th>Change</th>
                <th>User</th>
                <th>Date</th>
              </>
            }
          >
            {data.map(item => (
              <tr key={item.id}>
                <td><strong>{item.partNumber}</strong></td>
                <td className="muted">{item.description}</td>
                <td>{item.facility}</td>
                <td><StatusBadge status={item.status} /></td>
                <td><strong>{item.quantity}</strong></td>
                <td>
                  <strong>
                    {item.changeType.toUpperCase()}
                  </strong>
                </td>
                <td className="muted">{item.changedBy || '—'}</td>
                <td className="muted">{new Date(item.changedAt).toLocaleString()}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>
    </PageContainer>
  );
}
