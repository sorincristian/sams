import React from 'react';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { api } from '../../api';
import { canManage } from '../../lib/rbac';

const SYSTEM_MODULES = [
  'dashboard', 'fleet', 'inventory', 'ledger', 'catalog', 'work_orders', 'reports', 'admin'
];

export function RolesPage({ user }: { user?: any }) {
  const [roles, setRoles] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingRole, setEditingRole] = React.useState<any | null>(null);

  const fetchRoles = () => {
    setLoading(true);
    api.get('/v1/admin/roles')
      .then((res) => setRoles(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  React.useEffect(() => {
    fetchRoles();
  }, []);

  const handleEditRole = (role: any) => {
    // Map existing permissions into a lookup dictionary
    const currentPermissions = role.permissions.reduce((acc: any, p: any) => {
      acc[p.module] = p.access;
      return acc;
    }, {});
    
    // Ensure all modules are represented in state
    const editState = SYSTEM_MODULES.reduce((acc: any, mod) => {
      acc[mod] = currentPermissions[mod] || 'none';
      return acc;
    }, {});

    setEditingRole({ ...role, matrix: editState });
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;
    
    // Convert matrix back to payload array
    const permissionsPayload = Object.entries(editingRole.matrix).map(([module, access]) => ({
      module, access
    }));

    try {
      if (editingRole.id) {
        await api.patch(`/v1/admin/roles/${editingRole.id}`, {
          name: editingRole.name,
          permissions: permissionsPayload
        });
      } else {
        await api.post('/v1/admin/roles', {
          name: editingRole.name,
          permissions: permissionsPayload
        });
      }
      setEditingRole(null);
      fetchRoles();
    } catch (e) {
      console.error(e);
      alert('Failed to save role');
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Roles Configuration" 
        description="Define structural system boundaries dynamically overriding RBAC constraints natively."
        actions={canManage(user, 'admin') && <Button onClick={() => handleEditRole({ name: 'New Role', permissions: [] })}>Create Role</Button>}
      />

      <SectionCard title="Deployment Security Matrix">
        {!loading && roles.length === 0 ? (
          <div className="muted">No roles structurally defined. Seed an Admin.</div>
        ) : (
          <div className="grid">
            {roles.map(role => (
              <div key={role.id} className="card">
                <div className="flex-between">
                  <h3>{role.name}</h3>
                  {canManage(user, 'admin') && <button className="outline" onClick={() => handleEditRole(role)}>Edit</button>}
                </div>
                <div>
                  {role.permissions.map((p: any) => (
                    <div key={p.id} className="flex-between muted">
                      <span>{p.module}</span>
                      <strong>{p.access}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Role Edit Modal */}
      {editingRole && (
        <div className="modal-backdrop" onClick={() => setEditingRole(null)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <h3>{editingRole.id ? `Edit Bound Matrix: ${editingRole.name}` : `Create New Role Limit`}</h3>
            
            <FormField label="Role Name">
              <input 
                type="text" 
                value={editingRole.name} 
                onChange={e => setEditingRole({ ...editingRole, name: e.target.value })} 
                placeholder="e.g. Inspector, Manager"
              />
            </FormField>

            <h4>Access Bounds Matrix</h4>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sub-Module Array</th>
                    <th>None (Hidden)</th>
                    <th>View Only (Read)</th>
                    <th>Manage (Mutate)</th>
                  </tr>
                </thead>
                <tbody>
                  {SYSTEM_MODULES.map(mod => (
                    <tr key={mod}>
                      <td><strong>{mod.replace('_', ' ')}</strong></td>
                      
                      <td>
                        <input 
                          type="radio" 
                          name={`access-${mod}`} 
                          checked={editingRole.matrix[mod] === 'none'} 
                          onChange={() => setEditingRole({ ...editingRole, matrix: { ...editingRole.matrix, [mod]: 'none' }})}
                        />
                      </td>

                      <td>
                        <input 
                          type="radio" 
                          name={`access-${mod}`} 
                          checked={editingRole.matrix[mod] === 'view'} 
                          onChange={() => setEditingRole({ ...editingRole, matrix: { ...editingRole.matrix, [mod]: 'view' }})}
                        />
                      </td>

                      <td>
                        <input 
                          type="radio" 
                          name={`access-${mod}`} 
                          checked={editingRole.matrix[mod] === 'manage'} 
                          onChange={() => setEditingRole({ ...editingRole, matrix: { ...editingRole.matrix, [mod]: 'manage' }})}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <button type="button" className="outline" onClick={() => setEditingRole(null)}>Cancel</button>
              <button onClick={handleSaveRole}>Commit Bound Overwrite</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
