import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useOutletContext } from 'react-router-dom';

export function HarveyDashboardPage() {
  const userContext: any = useOutletContext();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHarveyData();
  }, []);

  const fetchHarveyData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/harvey');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load Harvey Panel.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-container">Loading Harvey Operations...</div>;
  if (error) return <div className="page-container"><div style={{color: 'red', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: 6}}>{error}</div></div>;

  const lowStock = data.harveyStock.filter((s: any) => s.quantityOnHand <= s.seatInsertType.minStockLevel);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Harvey Operations Panel</h1>
        <p className="page-description">Factory repair, upholstery, and stock distribution hub.</p>
      </div>

      {lowStock.length > 0 && (
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '0.375rem' }}>
          <h3 style={{ color: '#b91c1c', margin: '0 0 0.5rem 0' }}>⚠️ Low Factory Stock ({lowStock.length})</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#991b1b' }}>
            {lowStock.map((alert: any) => (
              <li key={alert.id}>
                 <strong>{alert.seatInsertType.partNumber}</strong>: {alert.quantityOnHand} on hand (Min: {alert.seatInsertType.minStockLevel})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Incoming from Garages (To Repair/Scrap)</h3></div>
          <div className="table-responsive">
            <table>
              <thead><tr><th>Date</th><th>Part</th><th>From</th><th>Qty</th><th>User</th></tr></thead>
              <tbody>
                {data.incomingFromGarages.map((tx: any) => {
                  const fromName = tx.garage.name === 'Harvey Shop' ? tx.relatedGarage?.name : tx.garage.name;
                  return (
                    <tr key={tx.id}>
                      <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                      <td>{tx.seatInsertType.partNumber}</td>
                      <td>{fromName || 'Unknown'}</td>
                      <td style={{fontWeight:'bold'}}>{tx.quantity}</td>
                      <td>{tx.performedByUser.name}</td>
                    </tr>
                  )
                })}
                {data.incomingFromGarages.length===0 && <tr><td colSpan={5}>No incoming transfers</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Outgoing to Garages (Fulfilled Orders)</h3></div>
          <div className="table-responsive">
            <table>
              <thead><tr><th>Date</th><th>Part</th><th>To</th><th>Qty</th><th>User</th></tr></thead>
              <tbody>
                {data.outgoingToGarages.map((tx: any) => {
                  const toName = tx.garage.name === 'Harvey Shop' ? tx.relatedGarage?.name : tx.garage.name;
                  return (
                    <tr key={tx.id}>
                      <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                      <td>{tx.seatInsertType.partNumber}</td>
                      <td>{toName || 'Unknown'}</td>
                      <td style={{fontWeight:'bold'}}>{tx.quantity}</td>
                      <td>{tx.performedByUser.name}</td>
                    </tr>
                  );
                })}
                {data.outgoingToGarages.length===0 && <tr><td colSpan={5}>No outgoing transfers</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Current Harvey Stock (Repair/Upholstery Pipeline)</h3></div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr><th>Part No.</th><th>Description</th><th>Qty On-Hand</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.harveyStock.map((item: any) => (
                <tr key={item.id}>
                  <td style={{fontWeight:500}}>{item.seatInsertType.partNumber}</td>
                  <td>{item.seatInsertType.description}</td>
                  <td style={{fontWeight:'bold', color:'#2563eb'}}>{item.quantityOnHand}</td>
                  <td>{item.quantityOnHand <= item.seatInsertType.minStockLevel ? <span style={{color: '#dc2626'}}>REORDER</span> : <span style={{color: '#16a34a'}}>HEALTHY</span>}</td>
                </tr>
              ))}
              {data.harveyStock.length===0 && <tr><td colSpan={4}>No stock in Harvey</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
