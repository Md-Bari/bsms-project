'use client';
import { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useToast } from '@/components/ToastProvider';
import { Card, Badge, Table, Th, Td, EmptyState, Button, KPICard } from '@/components/ui';
import { CreditCard, Search, Download, Eye, TrendingUp, DollarSign, AlertCircle, Sparkles } from 'lucide-react';
import { formatCurrency, getStatusColor, formatDate } from '@/lib/utils';
import { Payment } from '@/types';
import { downloadPaymentReceipt } from '@/lib/pdf';
import { apiRequest } from '@/lib/api/client';

export default function AdminPayments() {
  const { payments } = useAppStore();
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'rent' | 'service_charge'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminder, setReminder] = useState<{ subject: string; message: string; recommendedSendAt: string } | null>(null);

  const filtered = payments.filter(p =>
    (typeFilter === 'all' || p.type === typeFilter) &&
    (statusFilter === 'all' || p.status === statusFilter) &&
    (p.tenantName.toLowerCase().includes(search.toLowerCase()) || p.flatNumber.includes(search) || p.invoiceNumber.toLowerCase().includes(search.toLowerCase()))
  );

  const serviceRevenue = payments.filter(p => p.recipient === 'admin' && p.status === 'paid').reduce((a, p) => a + p.amount, 0);
  const totalRent = payments.filter(p => p.recipient === 'owner' && p.status === 'paid').reduce((a, p) => a + p.amount, 0);
  const overdue = payments.filter(p => p.status === 'overdue').length;

  const typeLabels: Record<string, string> = {
    rent: 'Rent',
    service_charge: 'Service Charge',
    utility: 'Utility',
    maintenance_fee: 'Maint. Fee',
  };

  const generateReminder = async () => {
    if (!viewPayment || !token) return;
    setReminderLoading(true);
    try {
      const response = await apiRequest<{ subject: string; message: string; recommendedSendAt: string }>('/ai/payments/reminder', {
        method: 'POST',
        token,
        body: { paymentId: Number(viewPayment.id), tone: viewPayment.status === 'overdue' ? 'urgent' : 'professional' },
      });
      setReminder(response);
      toast('AI reminder generated');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not generate reminder', 'error');
    } finally {
      setReminderLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment Management</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View all payment records (Admin receives service charges only)</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Service Revenue (Admin)" value={formatCurrency(serviceRevenue)} icon={<DollarSign className="w-5 h-5" />} color="emerald" />
        <KPICard title="Rent Collected (Owners)" value={formatCurrency(totalRent)} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
        <KPICard title="Overdue Payments" value={overdue} icon={<AlertCircle className="w-5 h-5" />} color={overdue > 0 ? 'red' : 'emerald'} />
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Payment Flow Policy</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Rent payments go directly to flat owners. Admin only receives service charges, utility bills, and maintenance fees. Admin cannot modify rent transactions.</p>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2">
        {[['all', 'All Payments'], ['rent', 'Rent Only'], ['service_charge', 'Service Charges']].map(([val, label]) => (
          <button key={val} onClick={() => setTypeFilter(val as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${typeFilter === val ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by tenant, flat or invoice..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </Card>

      <Card>
        <Table>
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <Th>Invoice</Th>
              <Th>Tenant</Th>
              <Th>Flat</Th>
              <Th>Type</Th>
              <Th>Recipient</Th>
              <Th>Amount</Th>
              <Th>Month</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.length === 0 ? (
              <tr><td colSpan={9}><EmptyState icon={<CreditCard className="w-8 h-8" />} title="No payments found" /></td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <Td><span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{p.invoiceNumber}</span></Td>
                <Td className="font-medium text-slate-900 dark:text-white">{p.tenantName}</Td>
                <Td>{p.flatNumber}</Td>
                <Td>
                  <Badge className={p.type === 'rent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'}>
                    {typeLabels[p.type] || p.type}
                  </Badge>
                </Td>
                <Td>
                  <span className={`text-xs font-medium ${p.recipient === 'owner' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    → {p.recipient === 'owner' ? (p.ownerName || 'Owner') : 'Admin'}
                  </span>
                </Td>
                <Td><span className="font-semibold">{formatCurrency(p.amount)}</span></Td>
                <Td>{p.month}</Td>
                <Td><Badge className={getStatusColor(p.status)}>{p.status}</Badge></Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setViewPayment(p); setReminder(null); }} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"><Eye className="w-4 h-4" /></button>
                    {p.status === 'paid' && <button onClick={() => downloadPaymentReceipt(p)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors"><Download className="w-4 h-4" /></button>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* View Invoice Modal */}
      {viewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setViewPayment(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Invoice</p>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{viewPayment.invoiceNumber}</h2>
                </div>
                <Badge className={getStatusColor(viewPayment.status)}>{viewPayment.status}</Badge>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Tenant', value: viewPayment.tenantName },
                { label: 'Flat', value: viewPayment.flatNumber },
                { label: 'Type', value: typeLabels[viewPayment.type] },
                { label: 'Recipient', value: viewPayment.recipient === 'owner' ? (viewPayment.ownerName || 'Owner') : 'Admin (BSMS)' },
                { label: 'Amount', value: formatCurrency(viewPayment.amount) },
                { label: 'Month', value: viewPayment.month },
                { label: 'Due Date', value: formatDate(viewPayment.dueDate) },
                { label: 'Paid Date', value: viewPayment.paidDate ? formatDate(viewPayment.paidDate) : '—' },
                { label: 'Payment Method', value: viewPayment.method || '—' },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className="text-sm text-slate-500">{r.label}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{r.value}</span>
                </div>
              ))}
            </div>
            {viewPayment.status !== 'paid' && (
              <div className="px-6 pb-4">
                <Button variant="outline" icon={<Sparkles className="w-4 h-4" />} onClick={generateReminder} loading={reminderLoading} className="w-full">
                  Generate Smart Reminder
                </Button>
              </div>
            )}
            {reminder && viewPayment.status !== 'paid' && (
              <div className="mx-6 mb-4 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-xs text-slate-500">Subject</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{reminder.subject}</p>
                <p className="text-xs text-slate-500 mt-2">Message</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{reminder.message}</p>
                <p className="text-xs text-slate-500 mt-2">Recommended Send Time: {formatDate(reminder.recommendedSendAt)}</p>
              </div>
            )}
            <div className="p-6 pt-0 flex gap-3">
              <Button variant="secondary" onClick={() => { setViewPayment(null); setReminder(null); }} className="flex-1">Close</Button>
              {viewPayment.status === 'paid' && <Button icon={<Download className="w-4 h-4" />} className="flex-1" onClick={() => downloadPaymentReceipt(viewPayment)}>Download Receipt</Button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
