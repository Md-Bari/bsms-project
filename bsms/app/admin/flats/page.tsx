'use client';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useAuthStore } from '@/lib/store/authStore';
import { apiRequest } from '@/lib/api/client';
import { useToast } from '@/components/ToastProvider';
import { Card, Button, Input, Select, Modal, Badge, Table, Th, Td, EmptyState } from '@/components/ui';
import { Plus, Edit2, Trash2, Building2, Search, UserPlus } from 'lucide-react';
import { formatCurrency, getStatusColor } from '@/lib/utils';
import { Flat, User } from '@/types';

const emptyFlat: Omit<Flat, 'id' | 'createdAt'> = { number: '', floor: 1, size: '', ownerId: '', ownerName: '', status: 'vacant', monthlyRent: 0 };

export default function AdminFlats() {
  const { flats, addFlat, updateFlat, deleteFlat, tenants, updateTenant } = useAppStore();
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editFlat, setEditFlat] = useState<Flat | null>(null);
  const [form, setForm] = useState(emptyFlat);
  const [owners, setOwners] = useState<User[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignFlatId, setAssignFlatId] = useState('');
  const [assignTenantId, setAssignTenantId] = useState('');

  const filtered = flats.filter(f =>
    (statusFilter === 'all' || f.status === statusFilter) &&
    (f.number.toLowerCase().includes(search.toLowerCase()) || f.ownerName?.toLowerCase().includes(search.toLowerCase()) || '')
  );

  const openAdd = () => { setEditFlat(null); setForm(emptyFlat); setShowModal(true); };
  const openEdit = (flat: Flat) => { setEditFlat(flat); setForm({ number: flat.number, floor: flat.floor, size: flat.size, ownerId: flat.ownerId || '', ownerName: flat.ownerName || '', status: flat.status, monthlyRent: flat.monthlyRent }); setShowModal(true); };

  useEffect(() => {
    if (!token) return;

    apiRequest<User[]>('/users', { token })
      .then((users) => setOwners(users.filter((u) => u.role === 'owner')))
      .catch(() => setOwners([]));
  }, [token]);

  const handleSave = () => {
    if (!form.number || !form.size) { toast('Please fill all required fields', 'error'); return; }
    if (editFlat) {
      updateFlat(editFlat.id, form);
      toast('Flat updated successfully');
    } else {
      addFlat(form);
      toast('Flat added successfully');
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this flat?')) { deleteFlat(id); toast('Flat deleted', 'warning'); }
  };

  const handleAssign = () => {
    const tenant = tenants.find(t => t.id === assignTenantId);
    if (!tenant) { toast('Select a tenant', 'error'); return; }
    updateTenant(tenant.id, { flatId: assignFlatId });
    toast('Tenant assigned successfully');
    setShowAssignModal(false);
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: k === 'floor' || k === 'monthlyRent' ? Number(e.target.value) : e.target.value }));

  const ownerOptions = [
    { value: '', label: 'Unassigned' },
    ...owners.map((owner) => ({ value: owner.id, label: `${owner.name} (${owner.email})` })),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Flat Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{flats.length} total flats</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Flat</Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Occupied', value: flats.filter(f => f.status === 'occupied').length, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Vacant', value: flats.filter(f => f.status === 'vacant').length, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Maintenance', value: flats.filter(f => f.status === 'maintenance').length, color: 'text-amber-600 dark:text-amber-400' },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by flat number or owner..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Status</option>
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <Th>Flat No.</Th>
              <Th>Floor</Th>
              <Th>Size</Th>
              <Th>Owner</Th>
              <Th>Tenant</Th>
              <Th>Rent</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.length === 0 ? (
              <tr><td colSpan={8}><EmptyState icon={<Building2 className="w-8 h-8" />} title="No flats found" description="Add your first flat or adjust filters" /></td></tr>
            ) : filtered.map(flat => (
              <tr key={flat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <Td><span className="font-semibold text-indigo-600 dark:text-indigo-400">{flat.number}</span></Td>
                <Td>Floor {flat.floor}</Td>
                <Td>{flat.size}</Td>
                <Td>{flat.ownerName || <span className="text-slate-400">—</span>}</Td>
                <Td>{flat.tenantName || <span className="text-slate-400">—</span>}</Td>
                <Td className="font-medium">{formatCurrency(flat.monthlyRent)}</Td>
                <Td><Badge className={getStatusColor(flat.status)}>{flat.status}</Badge></Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    {flat.status === 'vacant' && (
                      <Button variant="secondary" size="sm" icon={<UserPlus className="w-3.5 h-3.5" />} onClick={() => { setAssignFlatId(flat.id); setAssignTenantId(''); setShowAssignModal(true); }}>Assign</Button>
                    )}
                    <button onClick={() => openEdit(flat)} className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(flat.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editFlat ? 'Edit Flat' : 'Add New Flat'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Flat Number *" value={form.number} onChange={f('number')} placeholder="A-101" />
            <Input label="Floor *" type="number" value={form.floor} onChange={f('floor')} min={1} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Size *" value={form.size} onChange={f('size')} placeholder="1200 sqft" />
            <Input label="Monthly Rent (৳)" type="number" value={form.monthlyRent} onChange={f('monthlyRent')} />
          </div>
          <Select
            label="Assign Owner"
            value={form.ownerId || ''}
            onChange={(e) => {
              const selectedOwner = owners.find((owner) => owner.id === e.target.value);
              setForm((prev) => ({
                ...prev,
                ownerId: e.target.value,
                ownerName: selectedOwner?.name || '',
              }));
            }}
            options={ownerOptions}
          />
          <Select label="Status" value={form.status} onChange={f('status')} options={[
            { value: 'vacant', label: 'Vacant' },
            { value: 'occupied', label: 'Occupied' },
            { value: 'maintenance', label: 'Maintenance' },
          ]} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} className="flex-1">{editFlat ? 'Update' : 'Add Flat'}</Button>
          </div>
        </div>
      </Modal>

      {/* Assign Tenant Modal */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Tenant to Flat">
        <div className="space-y-4">
          <Select label="Select Tenant" value={assignTenantId} onChange={e => setAssignTenantId(e.target.value)}
            options={[{ value: '', label: 'Choose tenant...' }, ...tenants.filter(t => !t.flatId).map(t => ({ value: t.id, label: `${t.name} (${t.phone})` }))]} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAssignModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAssign} className="flex-1">Assign Tenant</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
