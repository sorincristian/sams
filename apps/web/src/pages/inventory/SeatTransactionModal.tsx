import React, { useState, useEffect } from 'react';
import { api } from '../../api';

interface SeatTransactionModalProps {
  onClose: () => void;
  onSuccess: () => void;
  roleContext: { isAdmin: boolean; isHarvey: boolean; lockedToGarageId: string | null };
}

interface SeatInsertType {
  id: string;
  partNumber: string;
  description: string;
}

interface Garage {
  id: string;
  name: string;
}

export function SeatTransactionModal({ onClose, onSuccess, roleContext }: SeatTransactionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [seatTypes, setSeatTypes] = useState<SeatInsertType[]>([]);
  const [garages, setGarages] = useState<Garage[]>([]);

  // Form Fields
  const [type, setType] = useState('RECEIVE');
  const [seatInsertTypeId, setSeatInsertTypeId] = useState('');
  const [sourceGarageId, setSourceGarageId] = useState(roleContext.lockedToGarageId || '');
  const [destinationGarageId, setDestinationGarageId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [referenceId, setReferenceId] = useState('');

  const [failureReason, setFailureReason] = useState('');
  const [isVandalism, setIsVandalism] = useState(false);
  const [busId, setBusId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      const [seatsRes, garagesRes] = await Promise.all([
        api.get('/catalog'),
        api.get('/garages')
      ]);
      setSeatTypes(seatsRes.data);
      setGarages(garagesRes.data);
    } catch (err) {
      setError("Failed to load catalog or garage data.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seatInsertTypeId || quantity <= 0) {
      setError("Valid Seat Part and Quantity > 0 are required.");
      return;
    }
    if (type === 'TRANSFER_OUT' && !destinationGarageId) {
      setError("Destination Garage required for Transfer.");
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await api.post('/inventory/transaction', {
        seatInsertTypeId,
        garageId: sourceGarageId, // Only passed effectively if the user is Admin
        quantity,
        type,
        notes,
        referenceType: referenceType || undefined,
        referenceId: referenceId || undefined,
        destinationGarageId: type === 'TRANSFER_OUT' ? destinationGarageId : undefined,
        failureReason: failureReason || undefined,
        isVandalism: isVandalism,
        busId: busId || undefined,
        workOrderId: workOrderId || undefined
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || "Transaction failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const isTransfer = type === 'TRANSFER_OUT';
  const requiresReference = ['ISSUE', 'RETURN'].includes(type);

  const harveyFactoryId = garages.find(g => g.name === 'Harvey Shop')?.id;
  const requiresFailureData = ['RETURN', 'SCRAP'].includes(type) || (type === 'TRANSFER_OUT' && destinationGarageId === harveyFactoryId);

  // Apply Visibility Constraints for the Destination Dropdown
  const availableDestinations = garages.filter(g => {
    if (g.id === sourceGarageId || g.id === roleContext.lockedToGarageId) return false;
    // Standard Garages can ONLY transfer to Harvey Factory directly natively.
    if (!roleContext.isAdmin && !roleContext.isHarvey && g.name !== 'Harvey Shop') return false;
    return true;
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">New Inventory Transaction</h2>
          <button onClick={onClose} className="btn-close">&times;</button>
        </div>
        
        {error && (
           <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', color: '#dc2626', marginBottom: '1rem', borderRadius: '0.375rem' }}>
              {error}
           </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Action Type</label>
            <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="RECEIVE">Receive Stock (Arrival)</option>
              <option value="ISSUE">Issue to Bus/WorkOrder</option>
              <option value="TRANSFER_OUT">Transfer strictly to Location</option>
              <option value="ADJUST_IN">Manual Stock Adjustment (Up)</option>
              <option value="ADJUST_OUT">Manual Stock Adjustment (Down)</option>
              <option value="RETURN">Return Stock to Garage Bin</option>
              <option value="SCRAP">Scrap Damaged Item</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Seat Part / Designation</label>
            <select className="form-input" value={seatInsertTypeId} onChange={(e) => setSeatInsertTypeId(e.target.value)} required>
              <option value="">Select an Item...</option>
              {seatTypes.map(s => (
                <option key={s.id} value={s.id}>{s.partNumber} - {s.description}</option>
              ))}
            </select>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
               <label className="form-label">Quantity</label>
               <input type="number" min="1" className="form-input" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} required />
            </div>

            {roleContext.isAdmin && (
              <div className="form-group">
                <label className="form-label">Source Garage</label>
                <select className="form-input" value={sourceGarageId} onChange={(e) => setSourceGarageId(e.target.value)} required>
                  <option value="">Select Location...</option>
                  {garages.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {isTransfer && (
            <div className="form-group">
              <label className="form-label" style={{ color: '#2563eb' }}>Destination Garage</label>
              <select className="form-input" value={destinationGarageId} onChange={(e) => setDestinationGarageId(e.target.value)} required>
                <option value="">Select Destination...</option>
                {availableDestinations.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              {!roleContext.isAdmin && !roleContext.isHarvey && (
                <small style={{ color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>Standard garages can only orchestrate transfers directly back to Harvey Shop natively.</small>
              )}
            </div>
          )}

          {requiresReference && (
             <div className="grid" style={{ gridTemplateColumns: 'min-content 1fr', gap: '1rem' }}>
               <div className="form-group" style={{ width: '150px' }}>
                 <label className="form-label">Reference Type</label>
                 <select className="form-input" value={referenceType} onChange={(e) => setReferenceType(e.target.value)}>
                   <option value="">None</option>
                   <option value="BUS">Bus Fleet Number</option>
                   <option value="WORK_ORDER">Work Order ID</option>
                 </select>
               </div>
               {referenceType && (
                 <div className="form-group">
                   <label className="form-label">Reference ID</label>
                   <input type="text" className="form-input" value={referenceId} onChange={(e) => setReferenceId(e.target.value)} placeholder={`e.g. 9410...`} required />
                 </div>
               )}
             </div>
          )}

          {requiresFailureData && (
             <div className="card" style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', marginBottom: '1rem', marginTop: '1rem' }}>
                <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#92400e', fontSize: '0.9rem' }}>Component Failure Context</h4>
                
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div className="form-group">
                      <label className="form-label">Failure Reason</label>
                      <select className="form-input" value={failureReason} onChange={(e) => setFailureReason(e.target.value)}>
                         <option value="">Select Reason...</option>
                         <option value="WEAR">Normal Wear & Tear</option>
                         <option value="VANDALISM">Vandalism</option>
                         <option value="STRUCTURAL_DAMAGE">Structural Damage</option>
                         <option value="DEFECT">Manufacturing Defect</option>
                         <option value="LOOSE_FRAME">Loose Frame / Mount</option>
                         <option value="TORN_UPHOLSTERY">Torn Upholstery</option>
                         <option value="FOAM_FAILURE">Foam Failure</option>
                         <option value="OTHER">Other Reason</option>
                      </select>
                   </div>
                   
                   <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: '#b91c1c' }}>
                       <input type="checkbox" checked={isVandalism} onChange={(e) => setIsVandalism(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem' }} />
                       Flag as Vandalism Event
                     </label>
                   </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                   <div className="form-group">
                     <label className="form-label">Linked Bus # (Optional)</label>
                     <input type="text" className="form-input" value={busId} onChange={(e) => setBusId(e.target.value)} placeholder="e.g. 9410" />
                   </div>
                   <div className="form-group">
                     <label className="form-label">Work Order # (Optional)</label>
                     <input type="text" className="form-input" value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)} placeholder="e.g. WO-5519" />
                   </div>
                </div>
             </div>
          )}

          <div className="form-group">
             <label className="form-label">Internal Notes / Reason</label>
             <textarea className="form-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Audit annotations..." />
          </div>

          <div className="modal-actions" style={{ marginTop: '2rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !seatInsertTypeId}>
               {submitting ? 'Committing...' : `Commit ${quantity}x ${type.replace('_', ' ')}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
