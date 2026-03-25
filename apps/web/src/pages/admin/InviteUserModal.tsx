import React, { useState } from 'react';
import { api } from '../../api';
import { FormField } from '../../components/ui/FormField';

export function InviteUserModal({ roles, garages, onClose, onCreated }: { roles: any[], garages: any[], onClose: () => void, onCreated: () => void }) {
  const [form, setForm] = useState({ email: '', roleId: '', garageIds: [] as string[] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/v1/admin/invites', form);
      setInviteLink(res.data.inviteUrl);
      // Wait for user to close standardly
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    alert('Invite link copied to clipboard!');
  };

  if (inviteLink) {
    return (
      <div className="modal-backdrop" onClick={() => { onCreated(); onClose(); }}>
        <div className="modal card" onClick={e => e.stopPropagation()}>
          <h3 style={{ color: '#10b981' }}>Invite Generated Successfully</h3>
          <p className="muted">The secure cryptographic token has been bound to <strong>{form.email}</strong>.</p>
          <FormField label="Unique Invite URL">
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={inviteLink} style={{ flex: 1, background: '#111827', color: '#93c5fd' }} />
              <button type="button" onClick={copyToClipboard}>Copy</button>
            </div>
          </FormField>
          <div className="form-actions" style={{ marginTop: 24 }}>
            <button type="button" onClick={() => { onCreated(); onClose(); }}>Close & Return</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" onClick={e => e.stopPropagation()}>
        <h3>Secure Invite Operator</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>Generates a one-time cryptographic URL to safely onboard a new user without sharing passwords.</p>
        {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Target Email Address">
            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="System Role">
            <select required value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })}>
              <option value="">Select a Role...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </FormField>
          
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 6 }}>Facility Access Scopes</div>
            <div className="card" style={{ maxHeight: 150, overflowY: 'auto' }}>
              {garages.map(g => (
                <label key={g.id} className="flex-row">
                  <input 
                    type="checkbox" 
                    checked={form.garageIds.includes(g.id)}
                    onChange={e => {
                      const newIds = e.target.checked 
                        ? [...form.garageIds, g.id]
                        : form.garageIds.filter((id: string) => id !== g.id);
                      setForm({ ...form, garageIds: newIds });
                    }}
                  />
                  {g.name}
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 12 }}>
            <button type="button" className="outline" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: '#2563eb' }}>{loading ? 'Generating...' : 'Generate Invite Link'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
