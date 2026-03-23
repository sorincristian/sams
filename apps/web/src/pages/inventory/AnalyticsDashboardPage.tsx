import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useOutletContext } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function AnalyticsDashboardPage() {
  const userContext: any = useOutletContext();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/analytics');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load Analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-container">Loading Analytics Suite...</div>;
  if (error) return <div className="page-container"><div style={{color: 'red', padding: '1rem', background: '#fee2e2', borderRadius: 6}}>{error}</div></div>;

  const { 
    summary, usageByPart, usageByGarage, monthlyTrend, harveyFlow, lowStockByLocation,
    failureByReason, failureByGarage, vandalismByGarage, harveyRepairReasons
  } = data;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Seat Usage Analytics</h1>
        <p className="page-description">Platform-wide usage, transfers, and consumption aggregates.</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{padding: '1rem'}}><div className="muted">Total Issued</div><div style={{fontSize: '1.5rem', fontWeight: 600}}>{summary.totalIssued}</div></div>
        <div className="card" style={{padding: '1rem'}}><div className="muted">Total Returned</div><div style={{fontSize: '1.5rem', fontWeight: 600}}>{summary.totalReturned}</div></div>
        <div className="card" style={{padding: '1rem'}}><div className="muted">Total Scrapped</div><div style={{fontSize: '1.5rem', fontWeight: 600}}>{summary.totalScrapped}</div></div>
        <div className="card" style={{padding: '1rem', backgroundColor: '#fef2f2', borderLeft: '3px solid #dc2626'}}><div className="muted" style={{color: '#991b1b'}}>Known Failures</div><div style={{fontSize: '1.5rem', fontWeight: 600, color: '#dc2626'}}>{summary.totalFailures || 0}</div></div>
        <div className="card" style={{padding: '1rem', borderLeft: '3px solid #f59e0b'}}><div className="muted">To Factory</div><div style={{fontSize: '1.5rem', fontWeight: 600}}>{harveyFlow.incomingFromGarages}</div></div>
        <div className="card" style={{padding: '1rem', borderLeft: '3px solid #10b981'}}><div className="muted">From Factory</div><div style={{fontSize: '1.5rem', fontWeight: 600}}>{harveyFlow.outgoingToGarages}</div></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Monthly Trend</h3></div>
          <div className="card-body" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="issued" stroke="#3b82f6" name="Issued" />
                <Line type="monotone" dataKey="scrapped" stroke="#ef4444" name="Scrapped" />
                <Line type="monotone" dataKey="transferredToHarvey" stroke="#f59e0b" name="Sent to Harvey" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Top Consuming Garages</h3></div>
          <div className="card-body" style={{ height: '300px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={usageByGarage.slice(0, 5)} layout="vertical" margin={{ left: 30 }}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis type="number" />
                 <YAxis dataKey="garageName" type="category" width={80} tick={{fontSize: 12}} />
                 <Tooltip />
                 <Bar dataKey="issued" fill="#3b82f6" name="Total Issued" />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {failureByReason && failureByReason.length > 0 ? (
          <div className="card">
            <div className="card-header"><h3 className="card-title">Failure Diagnostics (Why seats fail)</h3></div>
            <div className="card-body" style={{ height: '300px' }}>
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={failureByReason} margin={{ bottom: 30 }}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="reason" tick={{fontSize: 10}} angle={-45} textAnchor="end" />
                   <YAxis />
                   <Tooltip />
                   <Bar dataKey="count" fill="#dc2626" name="Reported Events" />
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="card"><div className="card-header"><h3 className="card-title">Failure Diagnostics</h3></div><div className="card-body muted">No failure context recorded yet.</div></div>
        )}

        <div className="card">
          <div className="card-header"><h3 className="card-title">Vandalism Watchlist</h3></div>
          <div className="table-responsive">
            <table>
              <thead><tr><th>Garage Location</th><th style={{color: '#991b1b'}}>Incidents</th></tr></thead>
              <tbody>
                {vandalismByGarage && vandalismByGarage.length > 0 ? vandalismByGarage.map((v: any) => (
                  <tr key={v.garage}><td>{v.garage}</td><td style={{fontWeight:'bold', color: '#991b1b'}}>{v.count}</td></tr>
                )) : <tr><td colSpan={2} className="muted">No vandalism reported globally.</td></tr>}
              </tbody>
            </table>
          </div>
          
          {(userContext?.role === 'ADMIN' || userContext?.garage?.name === 'Harvey Shop') && harveyRepairReasons && harveyRepairReasons.length > 0 && (
             <div style={{marginTop: '1.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem'}}>
               <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#111827' }}>Harvey Repair Queue Constraints</h4>
               <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                 {harveyRepairReasons.slice(0, 5).map((hr: any) => (
                   <li key={hr.reason}><strong>{hr.reason}</strong>: {hr.count} seats processing</li>
                 ))}
               </ul>
             </div>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Usage by Part (Top 10)</h3></div>
          <div className="table-responsive">
            <table>
              <thead><tr><th>Part No.</th><th>Issued</th><th>Transferred</th><th>Scrapped</th></tr></thead>
              <tbody>
                {usageByPart.slice(0, 10).map((p: any) => (
                  <tr key={p.partNumber}><td>{p.partNumber}</td><td style={{fontWeight:'bold'}}>{p.issued}</td><td>{p.transferred}</td><td style={{color:'#ef4444'}}>{p.scrapped}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Low Stock Map ({summary.lowStockCount} Parts)</h3></div>
          <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {Object.keys(lowStockByLocation).map(location => (
               <div key={location} style={{ marginBottom: '1rem' }}>
                 <h4 style={{ margin: '0 0 0.5rem 0', color: '#111827' }}>{location}</h4>
                 <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                   {lowStockByLocation[location].map((item: any) => (
                     <li key={item.partNumber}><strong>{item.partNumber}</strong>: {item.quantityOnHand} / min {item.minStockLevel}</li>
                   ))}
                 </ul>
               </div>
            ))}
            {Object.keys(lowStockByLocation).length === 0 && <div className="muted">All stock healthy.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
