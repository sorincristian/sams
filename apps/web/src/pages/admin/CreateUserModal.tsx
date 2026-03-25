import React, { useState } from 'react';
import { api } from '../../api';
import { FormField } from '../../components/ui/FormField';

export function CreateUserModal({ roles, garages, onClose, onCreated }: { roles: any[], garages: any[], onClose: () => void, onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '', garageIds: [] as string[] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/v1/admin/users', form);
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" onClick={e => e.stopPropagation()}>
        <h3>Create User</h3>
        {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Full Name">
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Email Address">
            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Temporary Password">
            <input required type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
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
            <button type="submit" disabled={loading}>{loading ? 'Deploying...' : 'Create Account'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
