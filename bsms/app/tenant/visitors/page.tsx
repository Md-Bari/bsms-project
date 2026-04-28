'use client';
import { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useToast } from '@/components/ToastProvider';
import { Card, Button, Badge, Modal, Input, Textarea, Select } from '@/components/ui';
import { Plus, UserCheck, Edit2, Trash2, Clock, CalendarDays } from 'lucide-react';
import { getStatusColor, formatDate } from '@/lib/utils';
import { Visitor } from '@/types';

export default function TenantVisitors() {
  const { visitors, flats, addVisitor, updateVisitor, deleteVisitor } = useAppStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editVisitor, setEditVisitor] = useState<Visitor | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', nid: '', visitDate: '', expectedTime: '', purpose: '' });

  const myFlat = flats.find(f => f.tenantId === user?.id);
  const myVisitors = visitors.filter((visitor) => visitor.tenantId === user?.id);

  const openAdd = () => { setEditVisitor(null); setForm({ name: '', phone: '', nid: '', visitDate: '', expectedTime: '', purpose: '' }); setShowModal(true); };
  const openEdit = (v: Visitor) => { setEditVisitor(v); setForm({ name: v.name, phone: v.phone, nid: v.nid || '', visitDate: v.visitDate || '', expectedTime: v.expectedTime || '', purpose: v.purpose || '' }); setShowModal(true); };

  const handleSave = () => {
    if (!form.name || !form.phone || !form.visitDate) { toast('Fill required fields', 'error'); return; }
    if (!myFlat) { toast('No flat assigned', 'error'); return; }
    if (editVisitor) {
      updateVisitor(editVisitor.id, { ...form });
      toast('Visitor updated');
    } else {
      addVisitor({ ...form, flatId: myFlat.id, flatNumber: myFlat.number, tenantId: user?.id, tenantName: user?.name, type: 'expected', status: 'pending' });
      toast('Visitor pre-registered! Guard will be notified.');
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deleteVisitor(id);
    toast('Visitor removed', 'warning');
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const statusColors = { pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', arrived: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', exited: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Visitors</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pre-register expected visitors for faster entry</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Expected Visitor</Button>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-3">
        <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-400">Pre-registered visitors are shown to the security guard so they can be admitted faster. You can edit or delete before they arrive.</p>
      </div>

      <div className="space-y-3">
        {myVisitors.length === 0 ? (
          <Card className="p-8 text-center">
            <UserCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-medium text-slate-700 dark:text-slate-300">No visitors registered</h3>
            <p className="text-sm text-slate-500 mt-1">Pre-register your expected visitors</p>
          </Card>
        ) : myVisitors.map(v => (
          <Card key={v.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{v.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{v.name}</h3>
                    <Badge className={statusColors[v.status as keyof typeof statusColors] || ''}>{v.status}</Badge>
                    <Badge className={v.type === 'expected' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}>
                      {v.type === 'expected' ? 'Pre-registered' : 'Walk-in'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{v.phone}{v.nid && ` · NID: ${v.nid}`}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                    {v.visitDate && <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{formatDate(v.visitDate)}</span>}
                    {v.expectedTime && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{v.expectedTime}</span>}
                    {v.purpose && <span>Purpose: {v.purpose}</span>}
                  </div>
                  {v.entryTime && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Arrived at {v.entryTime}</p>}
                  {v.exitTime && <p className="text-xs text-slate-400 mt-0.5">Exited at {v.exitTime}</p>}
                </div>
              </div>
              {v.status === 'pending' && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editVisitor ? 'Edit Visitor' : 'Pre-Register Visitor'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Guest Name *" value={form.name} onChange={f('name')} placeholder="John Doe" />
            <Input label="Phone *" value={form.phone} onChange={f('phone')} placeholder="01700000000" />
          </div>
          <Input label="NID Number" value={form.nid} onChange={f('nid')} placeholder="Optional" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Visit Date *" type="date" value={form.visitDate} onChange={f('visitDate')} />
            <Input label="Expected Time" type="time" value={form.expectedTime} onChange={f('expectedTime')} />
          </div>
          <Input label="Purpose (Optional)" value={form.purpose} onChange={f('purpose')} placeholder="Family visit, delivery, etc." />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} className="flex-1">{editVisitor ? 'Update' : 'Pre-Register'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
