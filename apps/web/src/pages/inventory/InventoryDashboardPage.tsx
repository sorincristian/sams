import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useOutletContext } from 'react-router-dom';
import { SeatTransactionModal } from './SeatTransactionModal';

interface RoleContext {
  isAdmin: boolean;
  isHarvey: boolean;
  lockedToGarageId: string | null;
}

interface StockItem {
  id: string;
  quantityOnHand: number;
  quantityReserved: number;
  binLocation: string | null;
  seatInsertType: {
    partNumber: string;
    description: string;
    minStockLevel: number;
    reorderPoint: number;
  };
  garage: {
    name: string;
    code: string;
  };
}

interface AlertItem extends StockItem {}

interface TransactionHistory {
  id: string;
  quantity: number;
  type: string;
  notes: string | null;
  createdAt: string;
  seatInsertType: {
    partNumber: string;
    description: string;
  };
  garage: {
    name: string;
  };
  relatedGarage: {
    name: string;
  } | null;
  performedByUser: {
    name: string;
    role: string;
  };
}

export function InventoryDashboardPage() {
  const userContext: any = useOutletContext();
  const user = userContext?.user;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleContext, setRoleContext] = useState<RoleContext | null>(null);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [history, setHistory] = useState<TransactionHistory[]>([]);
  const [metrics, setMetrics] = useState({ totalStockLines: 0, totalItemsOnHand: 0, alertsCount: 0 });

  // Filtering State for Admins & Harvey
  const [garages, setGarages] = useState<{ id: string; name: string }[]>([]);
  const [selectedGarageId, setSelectedGarageId] = useState<string>('');

  // Action Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboard();
    if (user?.role === 'ADMIN' || user?.garage?.name === 'Harvey Shop') {
      fetchGarages();
    }
  }, [selectedGarageId]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const query = selectedGarageId ? `?garageId=${selectedGarageId}` : '';
      const response = await api.get(`/inventory/dashboard${query}`);
      setRoleContext(response.data.roleContext);
      setMetrics(response.data.metrics);
      setStock(response.data.stock);
      setAlerts(response.data.alerts);
      setHistory(response.data.history);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to load inventory dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGarages = async () => {
    try {
      const response = await api.get('/garages');
      setGarages(response.data);
    } catch (err) {
      console.error("Failed to load garages for filter", err);
    }
  };

  if (loading && stock.length === 0) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Seat Inventory</h1>
        </div>
        <div>Loading dashboard layout...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
           <h1 className="page-title">Seat Inventory</h1>
        </div>
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '0.375rem' }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  const canFilter = roleContext?.isAdmin || roleContext?.isHarvey;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Seat Inventory Dashboard</h1>
          <p className="page-description">Real-time stock flow and reorder tracking.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {canFilter && (
            <select
              style={{ width: '250px' }}
              value={selectedGarageId}
              onChange={(e) => setSelectedGarageId(e.target.value)}
            >
              <option value="">All Permitted Garages</option>
              {garages.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Process Transaction</button>
        </div>
      </div>

      {isModalOpen && roleContext && (
         <SeatTransactionModal 
            roleContext={roleContext} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
               setIsModalOpen(false);
               fetchDashboard();
            }} 
         />
      )}

      {alerts.length > 0 && (
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '0.375rem' }}>
          <h3 style={{ color: '#b91c1c', margin: '0 0 0.5rem 0' }}>⚠️ Low Stock Warnings ({metrics.alertsCount})</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#991b1b' }}>
            {alerts.slice(0, 5).map(alert => (
              <li key={alert.id}>
                 <strong>{alert.seatInsertType.partNumber}</strong> at {alert.garage.name}: 
                 <span style={{ fontWeight: 'bold', marginLeft: '0.5rem' }}>{alert.quantityOnHand} on hand</span> 
                 (Min: {alert.seatInsertType.minStockLevel})
              </li>
            ))}
            {alerts.length > 5 && <li>...and {alerts.length - 5} more.</li>}
          </ul>
        </div>
      )}

      <div className="grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Total Bin Locations</h3></div>
          <div className="card-body">
            <div style={{ fontSize: '2rem', fontWeight: 600 }}>{metrics.totalStockLines}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Hardware Units On-Hand</h3></div>
          <div className="card-body">
            <div style={{ fontSize: '2rem', fontWeight: 600, color: '#2563eb' }}>{metrics.totalItemsOnHand}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Reorder Alerts</h3></div>
          <div className="card-body">
            <div style={{ fontSize: '2rem', fontWeight: 600, color: alerts.length > 0 ? '#ef4444' : '#16a34a' }}>
               {metrics.alertsCount}
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Stock Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Active Stock Inventories</h3>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Part No.</th>
                  <th>Description</th>
                  {canFilter && <th>Location</th>}
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((item) => {
                   const isLow = item.quantityOnHand <= item.seatInsertType.minStockLevel;
                   return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.seatInsertType.partNumber}</td>
                      <td>{item.seatInsertType.description}</td>
                      {canFilter && <td>{item.garage.name}</td>}
                      <td style={{ fontWeight: 'bold' }}>{item.quantityOnHand}</td>
                      <td>
                        <span className={`status-badge ${isLow ? 'status-retired' : 'status-active'}`}>
                          {isLow ? 'REORDER' : 'HEALTHY'}
                        </span>
                      </td>
                    </tr>
                   );
                })}
                {stock.length === 0 && (
                  <tr>
                    <td colSpan={canFilter ? 5 : 4} style={{ textAlign: 'center', color: '#6b7280' }}>
                      No inventory records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Transaction History */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Ledger</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
             {history.length === 0 ? (
                <div style={{ padding: '1rem', color: '#6b7280', textAlign: 'center' }}>No recent ledger activity.</div>
             ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {history.map(tx => (
                    <li key={tx.id} style={{ borderBottom: '1px solid #e5e7eb', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{tx.type.replace('_', ' ')}</span>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{new Date(tx.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>
                        {tx.quantity}x {tx.seatInsertType.partNumber}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {tx.garage.name} {tx.relatedGarage ? `↔ ${tx.relatedGarage.name}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
             )}
          </div>
        </div>
      </div>

    </div>
  );
}
