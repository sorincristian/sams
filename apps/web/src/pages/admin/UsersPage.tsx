import React from 'react';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { DataTable } from '../../components/ui/DataTable';
import { FormField } from '../../components/ui/FormField';
import { api } from '../../api';
import { canManage } from '../../lib/rbac';

export function UsersPage({ user: sessionUser }: { user?: any }) {
  const [users, setUsers] = React.useState<any[]>([]);
  const [roles, setRoles] = React.useState<any[]>([]);
  const [garages, setGarages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingUser, setEditingUser] = React.useState<any | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    api.get('/v1/admin/users')
      .then((res) => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  React.useEffect(() => {
    Promise.all([
      api.get('/v1/admin/users'),
      api.get('/v1/admin/roles'),
      api.get('/garages')
    ]).then(([uRes, rRes, gRes]) => {
      setUsers(uRes.data);
      setRoles(rRes.data);
      setGarages(gRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleEditUser = (u: any) => {
    setEditingUser({
      ...u,
      roleId: u.roleId || '',
      garageIds: u.scopes ? u.scopes.map((s: any) => s.garageId) : []
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      await api.patch(`/v1/admin/users/${editingUser.id}`, {
        roleId: editingUser.roleId || null,
        garageIds: editingUser.garageIds
      });
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert('Failed to update user');
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Users Management" description="Assign roles and scoped facility access to personnel natively." />
      <SectionCard title="System Users">
         <DataTable 
           headers={
             <>
               <th>Name</th>
               <th>Email</th>
               <th>Role</th>
               <th>Assigned Garages</th>
               <th>Actions</th>
             </>
           }
         >
           {loading ? (
             <tr>
               <td colSpan={5} className="muted" style={{ textAlign: "center", padding: "2rem" }}>Loading system users...</td>
             </tr>
           ) : users.map(u => (
             <tr key={u.id}>
               <td>{u.name}</td>
               <td>{u.email}</td>
               <td>{u.roleRelation?.name || <span className="muted">Legacy {u.role}</span>}</td>
               <td>
                 {u.scopes?.length > 0 
                   ? u.scopes.map((s: any) => s.garage.code).join(', ') 
                   : <span className="muted">Global / Unrestricted</span>}
               </td>
               <td>
                 {canManage(sessionUser, 'admin') && (
                   <button className="outline" onClick={() => handleEditUser(u)}>Edit</button>
                 )}
               </td>
             </tr>
           ))}
         </DataTable>
      </SectionCard>

      {/* User Edit Modal */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <h3>Edit Assignments: {editingUser.name}</h3>
            
            <FormField label="System Role">
              <select 
                value={editingUser.roleId || ''} 
                onChange={e => setEditingUser({ ...editingUser, roleId: e.target.value })}
              >
                <option value="">Legacy or None</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </FormField>

            <h4>Facility Data Scopes</h4>
            <div className="card">
              {garages.map(g => (
                <label key={g.id} className="flex-row">
                  <input 
                    type="checkbox" 
                    checked={editingUser.garageIds.includes(g.id)}
                    onChange={e => {
                      const newIds = e.target.checked 
                        ? [...editingUser.garageIds, g.id]
                        : editingUser.garageIds.filter((id: string) => id !== g.id);
                      setEditingUser({ ...editingUser, garageIds: newIds });
                    }}
                  />
                  {g.name}
                </label>
              ))}
            </div>

            <div className="form-actions">
              <button type="button" className="outline" onClick={() => setEditingUser(null)}>Cancel</button>
              <button onClick={handleSaveUser}>Deploy Bound Update</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
