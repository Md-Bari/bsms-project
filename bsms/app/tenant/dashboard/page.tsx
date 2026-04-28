'use client';
import { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useAuthStore } from '@/lib/store/authStore';
import { Card, CardHeader, KPICard, Badge, Input, Button } from '@/components/ui';
import { CreditCard, Wrench, UserCheck, Megaphone, AlertCircle, User, Phone, Mail } from 'lucide-react';
import { formatCurrency, getStatusColor, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { apiRequest } from '@/lib/api/client';

export default function TenantDashboard() {
  const { payments, tickets, visitors, announcements, flats, tenants } = useAppStore();
  const { user, token } = useAuthStore();
  const [question, setQuestion] = useState('');
  const [assistantReply, setAssistantReply] = useState('');
  const [assistantActions, setAssistantActions] = useState<Array<{ label: string; path: string }>>([]);
  const [asking, setAsking] = useState(false);
  const myTenantProfile = tenants.find((tenant) => tenant.userId === user?.id);

  const myPayments = myTenantProfile ? payments.filter((payment) => payment.tenantId === myTenantProfile.id) : payments;
  const myTickets = myTenantProfile ? tickets.filter((ticket) => ticket.tenantId === myTenantProfile.id) : tickets;
  const myVisitors = visitors.filter((visitor) => visitor.tenantId === user?.id);
  const myFlat = flats.find(f => f.tenantId === user?.id);

  const unpaidRent = myPayments.find(p => p.type === 'rent' && p.status !== 'paid');
  const unpaidService = myPayments.find(p => p.type === 'service_charge' && p.status !== 'paid');
  const unreadAnns = announcements.filter(a => (a.targetRole === 'all' || a.targetRole === 'tenant') && !a.readBy.includes(user?.id || '')).length;

  const askAssistant = async () => {
    if (!question.trim() || !token) return;

    setAsking(true);
    try {
      const response = await apiRequest<{ answer: string; actions: Array<{ label: string; path: string }> }>('/ai/tenant/assistant', {
        method: 'POST',
        token,
        body: {
          question: question.trim(),
          stats: {
            pendingPayments: myPayments.filter(p => p.status !== 'paid').length,
            openTickets: myTickets.filter(t => t.status !== 'resolved').length,
            pendingVisitors: myVisitors.filter(v => v.status === 'pending').length,
            unreadAnnouncements: unreadAnns,
          },
        },
      });
      setAssistantReply(response.answer);
      setAssistantActions(response.actions || []);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Hello, {user?.name?.split(' ')[0]} 👋</h2>
        {myFlat && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Flat {myFlat.number} · Floor {myFlat.floor}</p>}
      </div>

      {myFlat && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Flat Owner Details</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">For Flat {myFlat.number}</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Owner</Badge>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
              <p className="text-xs text-slate-500">Name</p>
              <p className="mt-1 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                {myFlat.ownerName || 'Not available'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
              <p className="text-xs text-slate-500">Phone</p>
              <p className="mt-1 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                {myFlat.ownerPhone || 'Not available'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
              <p className="text-xs text-slate-500">Email</p>
              <p className="mt-1 font-medium text-slate-900 dark:text-white flex items-center gap-2 break-all">
                <Mail className="w-4 h-4 text-slate-400" />
                {myFlat.ownerEmail || 'Not available'}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Pending Payments" value={myPayments.filter(p => p.status !== 'paid').length} icon={<CreditCard className="w-5 h-5" />} color={unpaidRent ? 'red' : 'emerald'} />
        <KPICard title="Open Tickets" value={myTickets.filter(t => t.status !== 'resolved').length} icon={<Wrench className="w-5 h-5" />} color="amber" />
        <KPICard title="Expected Visitors" value={myVisitors.filter(v => v.status === 'pending').length} icon={<UserCheck className="w-5 h-5" />} color="blue" />
        <KPICard title="Unread Announcements" value={unreadAnns} icon={<Megaphone className="w-5 h-5" />} color={unreadAnns > 0 ? 'indigo' : 'emerald'} />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">AI Assistant</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ask what to do next about payments, maintenance, or visitors</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Example: I have overdue payment, what should I do first?"
          />
          <Button onClick={askAssistant} loading={asking} className="sm:w-36">Ask AI</Button>
        </div>
        {assistantReply && (
          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">{assistantReply}</p>
            {assistantActions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {assistantActions.map((action) => (
                  <Link
                    key={action.path}
                    href={action.path}
                    className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Quick Pay Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rent Payment */}
        <Card className="p-5 border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Rent Payment</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">💸 This payment goes to Owner</p>
            </div>
            <Badge className={getStatusColor(unpaidRent ? unpaidRent.status : 'paid')}>{unpaidRent ? unpaidRent.status : 'up to date'}</Badge>
          </div>
          {myFlat && <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{formatCurrency(myFlat.monthlyRent)}</p>}
          <p className="text-xs text-slate-500 mb-4">To: {myFlat?.ownerName || 'Owner'}</p>
          <Link href="/tenant/payments" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            <CreditCard className="w-4 h-4" /> Pay Rent
          </Link>
        </Card>

        {/* Service Charge */}
        <Card className="p-5 border-2 border-dashed border-violet-200 dark:border-violet-800 hover:border-violet-400 dark:hover:border-violet-600 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Service Charges</h3>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5 font-medium">🏢 This payment goes to Admin</p>
            </div>
            <Badge className={getStatusColor(unpaidService ? unpaidService.status : 'paid')}>{unpaidService ? unpaidService.status : 'up to date'}</Badge>
          </div>
          {unpaidService && <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{formatCurrency(unpaidService.amount)}</p>}
          <p className="text-xs text-slate-500 mb-4">To: Building Administration</p>
          <Link href="/tenant/payments" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            <CreditCard className="w-4 h-4" /> Pay Service Charges
          </Link>
        </Card>
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">My Maintenance Tickets</h3>
            <Link href="/tenant/maintenance" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">View all</Link>
          </div>
        </CardHeader>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {myTickets.length === 0 ? (
            <div className="px-6 py-6 text-center text-sm text-slate-500">No maintenance tickets. All good! 🎉</div>
          ) : myTickets.slice(0, 3).map(t => (
            <div key={t.id} className="px-6 py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{t.ticketId}</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{t.description.slice(0, 50)}...</p>
              </div>
              <Badge className={getStatusColor(t.status)}>{t.status.replace('_', ' ')}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
