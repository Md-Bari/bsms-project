'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { useAppStore } from '@/lib/store/appStore';
import { useToast } from '@/components/ToastProvider';
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Table, Td, Th } from '@/components/ui';
import { Flat, Role, User } from '@/types';
import { Edit2, Phone, Plus, Search, Shield, Trash2, UserCog, Users } from 'lucide-react';
import { format } from 'date-fns';

type UserForm = {
  name: string;
  email: string;
  phone: string;
  role: Role;
  password: string;
  flatId: string;
  nid: string;
  emergencyContact: string;
  moveInDate: string;
  status: 'active' | 'inactive';
};

const emptyForm: UserForm = {
  name: '',
  email: '',
  phone: '',
  role: 'tenant',
  password: '',
  flatId: '',
  nid: '',
  emergencyContact: '',
  moveInDate: '',
  status: 'active',
};

const roleColors: Record<Role, string> = {
  admin: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  owner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  tenant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  guard: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function AdminUsersPage() {
  const { token, user: currentUser } = useAuthStore();
  const { loadAppData } = useAppStore();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const loadData = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const [usersResponse, flatsResponse] = await Promise.all([
        apiRequest<User[]>('/users', { token }),
        apiRequest<Flat[]>('/flats', { token }),
      ]);
      setUsers(usersResponse);
      setFlats(flatsResponse);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast, token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => (
    users.filter((item) => {
      const matchesRole = roleFilter === 'all' || item.role === roleFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        (item.phone || '').includes(search) ||
        (item.flatNumber || '').toLowerCase().includes(q);

      return matchesRole && matchesSearch;
    })
  ), [users, roleFilter, search]);

  const availableFlats = useMemo(() => (
    flats.filter((flat) => flat.status === 'vacant' || flat.id === form.flatId)
  ), [flats, form.flatId]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: User) => {
    setEditingUser(item);
    setForm({
      name: item.name,
      email: item.email,
      phone: item.phone || '',
      role: item.role,
      password: '',
      flatId: item.flatId || '',
      nid: item.nid || '',
      emergencyContact: item.emergencyContact || '',
      moveInDate: item.moveInDate || '',
      status: item.status || 'active',
    });
    setShowModal(true);
  };

  const setField = (key: keyof UserForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'role' && value !== 'tenant'
        ? { flatId: '', nid: '', emergencyContact: '', moveInDate: '', status: 'active' }
        : {}),
    }));
  };

  const handleSave = async () => {
    if (!token) return;
    if (!form.name.trim() || !form.email.trim()) {
      toast('Name and email are required', 'error');
      return;
    }
    if (!editingUser && form.password.trim().length < 8) {
      toast('Password must be at least 8 characters', 'error');
      return;
    }
    if (editingUser && form.password && form.password.trim().length < 8) {
      toast('Password must be at least 8 characters', 'error');
      return;
    }

    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      ...(form.password.trim() ? { password: form.password.trim() } : {}),
      ...(form.role === 'tenant'
        ? {
            flatId: form.flatId ? Number(form.flatId) : null,
            nid: form.nid.trim(),
            emergencyContact: form.emergencyContact.trim(),
            moveInDate: form.moveInDate || null,
            status: form.status,
          }
        : {}),
    };

    setIsSaving(true);
    try {
      if (editingUser) {
        const updated = await apiRequest<User>(`/users/${editingUser.id}`, {
          method: 'PATCH',
          body,
          token,
        });
        setUsers((prev) => prev.map((item) => item.id === editingUser.id ? updated : item));
        toast('User updated successfully');
      } else {
        const created = await apiRequest<User>('/users', {
          method: 'POST',
          body,
          token,
        });
        setUsers((prev) => [created, ...prev]);
        toast('User created successfully');
      }

      setShowModal(false);
      await loadData();
      await loadAppData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save user', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: User) => {
    if (!token) return;
    if (!confirm(`Delete ${item.name}'s account?`)) return;

    try {
      await apiRequest(`/users/${item.id}`, { method: 'DELETE', token });
      setUsers((prev) => prev.filter((user) => user.id !== item.id));
      toast('User deleted successfully', 'warning');
      await loadData();
      await loadAppData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete user', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Management</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Admins create all accounts. Users can sign in and update their own profile later.
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>Create User</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'All Users', value: users.length, icon: <Users className="h-5 w-5" /> },
          { label: 'Admins', value: users.filter((item) => item.role === 'admin').length, icon: <Shield className="h-5 w-5" /> },
          { label: 'Tenants', value: users.filter((item) => item.role === 'tenant').length, icon: <UserCog className="h-5 w-5" /> },
          { label: 'Guards', value: users.filter((item) => item.role === 'guard').length, icon: <UserCog className="h-5 w-5" /> },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-slate-600 dark:bg-slate-900 dark:text-slate-300">{card.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, phone or flat..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as 'all' | Role)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
            <option value="tenant">Tenant</option>
            <option value="guard">Guard</option>
          </select>
        </div>
      </Card>

      <Card>
        <Table>
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Phone</Th>
              <Th>Flat</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {!isLoading && filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState icon={<Users className="h-8 w-8" />} title="No users found" description="Create an account for an admin, owner, tenant, or guard." />
                </td>
              </tr>
            ) : filteredUsers.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.email}</p>
                    </div>
                  </div>
                </Td>
                <Td><Badge className={roleColors[item.role]}>{item.role}</Badge></Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{item.phone || '—'}</span>
                  </div>
                </Td>
                <Td>{item.flatNumber || '—'}</Td>
                <Td>{item.role === 'tenant' ? (item.status || 'active') : '—'}</Td>
                <Td>{item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy') : '—'}</Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-indigo-500 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={item.id === currentUser?.id}
                      className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingUser ? 'Edit User' : 'Create User'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Full Name *" value={form.name} onChange={setField('name')} placeholder="John Doe" />
            <Input label="Email Address *" type="email" value={form.email} onChange={setField('email')} placeholder="john@example.com" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Phone Number" value={form.phone} onChange={setField('phone')} placeholder="01700000000" />
            <Select
              label="Role"
              value={form.role}
              onChange={setField('role')}
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'owner', label: 'Owner' },
                { value: 'tenant', label: 'Tenant' },
                { value: 'guard', label: 'Guard' },
              ]}
            />
          </div>
          <Input
            label={editingUser ? 'Reset Password' : 'Initial Password *'}
            type="password"
            value={form.password}
            onChange={setField('password')}
            placeholder={editingUser ? 'Leave blank to keep unchanged' : 'Minimum 8 characters'}
          />

          {form.role === 'tenant' && (
            <>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                Tenant accounts can also store flat assignment and profile details for maintenance, payments, and visitors.
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label="Assign Flat"
                  value={form.flatId}
                  onChange={setField('flatId')}
                  options={[
                    { value: '', label: 'No flat assigned' },
                    ...availableFlats.map((flat) => ({ value: flat.id, label: `${flat.number} (Floor ${flat.floor})` })),
                  ]}
                />
                <Select
                  label="Tenant Status"
                  value={form.status}
                  onChange={setField('status')}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="National ID" value={form.nid} onChange={setField('nid')} placeholder="1234567890" />
                <Input label="Emergency Contact" value={form.emergencyContact} onChange={setField('emergencyContact')} placeholder="01800000000" />
              </div>
              <Input label="Move-in Date" type="date" value={form.moveInDate} onChange={setField('moveInDate')} />
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={isSaving} className="flex-1">
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
