'use client';
import { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useToast } from '@/components/ToastProvider';
import { Card, CardHeader, CardBody, Button, Modal, Input, Textarea, Select, Badge, EmptyState } from '@/components/ui';
import { Megaphone, Plus, Calendar, Users } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function AdminAnnouncements() {
  const { announcements, addAnnouncement } = useAppStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', targetRole: 'all' as const });

  const handleSave = () => {
    if (!form.title || !form.content) { toast('Fill all fields', 'error'); return; }
    addAnnouncement({ ...form, authorId: user!.id, authorName: user!.name });
    toast('Announcement sent to the dashboard and email recipients');
    setShowModal(false);
    setForm({ title: '', content: '', targetRole: 'all' });
  };

  const targetLabels: Record<string, string> = { all: 'Everyone', tenant: 'Tenants Only', owner: 'Owners Only', guard: 'Guards Only' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Announcements</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{announcements.length} announcements sent</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>New Announcement</Button>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card className="p-6"><EmptyState icon={<Megaphone className="w-8 h-8" />} title="No announcements yet" description="Create your first announcement to notify residents" /></Card>
        ) : announcements.map(ann => (
          <Card key={ann.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex-shrink-0">
                  <Megaphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{ann.title}</h3>
                    <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      <Users className="w-3 h-3 inline mr-1" />{targetLabels[ann.targetRole]}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{ann.content}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDateTime(ann.createdAt)}</span>
                    <span>By {ann.authorName}</span>
                    <span>{ann.readBy.length} read</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Announcement">
        <div className="space-y-4">
          <Input label="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Important Notice..." />
          <Textarea label="Content *" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write your announcement here..." rows={4} />
          <Select label="Target Audience" value={form.targetRole} onChange={e => setForm(p => ({ ...p, targetRole: e.target.value as any }))}
            options={[{ value: 'all', label: 'Everyone' }, { value: 'tenant', label: 'Tenants Only' }, { value: 'owner', label: 'Owners Only' }, { value: 'guard', label: 'Guards Only' }]} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button icon={<Megaphone className="w-4 h-4" />} onClick={handleSave} className="flex-1">Send Announcement</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
