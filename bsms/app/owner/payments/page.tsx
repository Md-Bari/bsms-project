'use client';
import { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useAuthStore } from '@/lib/store/authStore';
import { Card, Badge, Table, Th, Td, KPICard, Modal, Button } from '@/components/ui';
import { DollarSign, TrendingUp, Download, Eye } from 'lucide-react';
import { formatCurrency, getStatusColor, formatDate } from '@/lib/utils';
import { downloadPaymentReceipt } from '@/lib/pdf';
import { Payment } from '@/types';

export default function OwnerPayments() {
  const { payments } = useAppStore();
  const { user } = useAuthStore();
  const [invoicePreview, setInvoicePreview] = useState<Payment | null>(null);
  const myPayments = payments.filter(p => p.ownerId === user?.id);
  const received = myPayments.filter(p => p.status === 'paid').reduce((a, p) => a + p.amount, 0);
  const pending = myPayments.filter(p => p.status !== 'paid').reduce((a, p) => a + p.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Rent Payment History</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">All rent payments received from your tenants</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <KPICard title="Total Received" value={formatCurrency(received)} icon={<DollarSign className="w-5 h-5" />} color="emerald" />
        <KPICard title="Pending / Overdue" value={formatCurrency(pending)} icon={<TrendingUp className="w-5 h-5" />} color={pending > 0 ? 'red' : 'emerald'} />
      </div>
      <Card>
        <Table>
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <Th>Invoice</Th><Th>Tenant</Th><Th>Flat</Th><Th>Amount</Th><Th>Month</Th><Th>Paid Date</Th><Th>Status</Th><Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {myPayments.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <Td><span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{p.invoiceNumber}</span></Td>
                <Td className="font-medium">{p.tenantName}</Td>
                <Td>{p.flatNumber}</Td>
                <Td><span className="font-semibold">{formatCurrency(p.amount)}</span></Td>
                <Td>{p.month}</Td>
                <Td>{p.paidDate ? formatDate(p.paidDate) : '—'}</Td>
                <Td><Badge className={getStatusColor(p.status)}>{p.status}</Badge></Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setInvoicePreview(p)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
                      title="View invoice"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {p.status === 'paid' && (
                      <button
                        onClick={() => downloadPaymentReceipt(p)}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors"
                        title="Download receipt"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal open={!!invoicePreview} onClose={() => setInvoicePreview(null)} title="Invoice Preview" size="md">
        {invoicePreview && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{invoicePreview.invoiceNumber}</p>
                <Badge className={getStatusColor(invoicePreview.status)}>{invoicePreview.status}</Badge>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Tenant</p>
                  <p className="font-medium text-slate-900 dark:text-white">{invoicePreview.tenantName}</p>
                </div>
                <div>
                  <p className="text-slate-500">Flat</p>
                  <p className="font-medium text-slate-900 dark:text-white">{invoicePreview.flatNumber}</p>
                </div>
                <div>
                  <p className="text-slate-500">Amount</p>
                  <p className="font-medium text-slate-900 dark:text-white">{formatCurrency(invoicePreview.amount)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Billing Month</p>
                  <p className="font-medium text-slate-900 dark:text-white">{invoicePreview.month}</p>
                </div>
                <div>
                  <p className="text-slate-500">Due Date</p>
                  <p className="font-medium text-slate-900 dark:text-white">{formatDate(invoicePreview.dueDate)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Paid Date</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {invoicePreview.paidDate ? formatDate(invoicePreview.paidDate) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Payment Type</p>
                  <p className="font-medium text-slate-900 dark:text-white capitalize">{invoicePreview.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-slate-500">Method</p>
                  <p className="font-medium text-slate-900 dark:text-white capitalize">{invoicePreview.method || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setInvoicePreview(null)} className="flex-1">Close</Button>
              {invoicePreview.status === 'paid' && (
                <Button onClick={() => downloadPaymentReceipt(invoicePreview)} className="flex-1" icon={<Download className="w-4 h-4" />}>
                  Download Receipt
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
