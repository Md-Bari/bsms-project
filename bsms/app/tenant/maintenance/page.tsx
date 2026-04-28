'use client';
import { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useToast } from '@/components/ToastProvider';
import { Card, Button, Badge, Modal, Select, Textarea } from '@/components/ui';
import { Plus, Wrench, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { getStatusColor, getPriorityColor, formatDateTime } from '@/lib/utils';
import { MaintenanceTicket } from '@/types';

export default function TenantMaintenance() {
  const { tickets, flats, tenants, addTicket } = useAppStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: 'plumbing' as MaintenanceTicket['category'], description: '', priority: 'medium' as MaintenanceTicket['priority'] });

  const myFlat = flats.find(f => f.tenantId === user?.id);
  const myTenantProfile = tenants.find(t => t.userId === user?.id);
  const myTickets = myTenantProfile ? tickets.filter((ticket) => ticket.tenantId === myTenantProfile.id) : tickets;

  const handleSubmit = () => {
    if (!form.description.trim()) { toast('Please describe the issue', 'error'); return; }
    if (!myFlat) { toast('No flat assigned', 'error'); return; }
    if (!myTenantProfile) { toast('Tenant profile not found', 'error'); return; }
    addTicket({ ...form, tenantId: myTenantProfile.id, tenantName: user?.name || '', flatId: myFlat.id, flatNumber: myFlat.number, status: 'open', notes: [] });
    toast('Maintenance request submitted!');
    setShowModal(false);
    setForm({ category: 'plumbing', description: '', priority: 'medium' });
  };

  const statusIcon = { open: <AlertCircle className="w-4 h-4 text-red-500" />, in_progress: <Clock className="w-4 h-4 text-amber-500" />, resolved: <CheckCircle className="w-4 h-4 text-emerald-500" /> };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Maintenance Requests</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{myTickets.length} total requests</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Submit Request</Button>
      </div>

      <div className="space-y-3">
        {myTickets.length === 0 ? (
          <Card className="p-8 text-center">
            <Wrench className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-medium text-slate-700 dark:text-slate-300">No maintenance requests</h3>
            <p className="text-sm text-slate-500 mt-1">Submit a request if something needs fixing</p>
          </Card>
        ) : myTickets.map(ticket => (
          <Card key={ticket.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5 flex-shrink-0">{statusIcon[ticket.status]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{ticket.ticketId}</span>
                    <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 capitalize">{ticket.category}</Badge>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{ticket.description}</p>
                  <p className="text-xs text-slate-400 mt-2">{formatDateTime(ticket.createdAt)}</p>
                  {ticket.notes.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-slate-500">Updates:</p>
                      {ticket.notes.map((n, i) => (
                        <p key={i} className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 py-1.5">{n}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Badge className={getStatusColor(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Submit Maintenance Request">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as any }))}
              options={[
                { value: 'electrical', label: '⚡ Electrical' },
                { value: 'plumbing', label: '🔧 Plumbing' },
                { value: 'carpentry', label: '🪵 Carpentry' },
                { value: 'cleaning', label: '🧹 Cleaning' },
                { value: 'other', label: '📋 Other' },
              ]} />
            <Select label="Priority" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as any }))}
              options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
          </div>
          <Textarea label="Description *" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4}
            placeholder="Please describe the issue in detail..." />
          {myFlat && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm text-slate-600 dark:text-slate-400">
              <Wrench className="w-4 h-4 flex-shrink-0" />
              Request will be submitted for Flat {myFlat.number}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1">Submit Request</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
