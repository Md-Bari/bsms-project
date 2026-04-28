'use client';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useToast } from '@/components/ToastProvider';
import { Card, Badge, Button, Modal, Table, Th, Td, Input } from '@/components/ui';
import { CreditCard, Download, CheckCircle, Building2, User, CalendarDays, Eye } from 'lucide-react';
import { formatCurrency, getStatusColor, formatDate } from '@/lib/utils';
import { downloadPaymentReceipt } from '@/lib/pdf';
import { Payment } from '@/types';

export default function TenantPayments() {
  const { payments, flats, tenants, createRentPayment, createStripeCheckoutSession, confirmStripeCheckoutSession } = useAppStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [creatingRent, setCreatingRent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmingSessionId, setConfirmingSessionId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [invoicePreview, setInvoicePreview] = useState<Payment | null>(null);

  const myTenantProfile = tenants.find((tenant) => tenant.userId === user?.id);
  const myPayments = myTenantProfile ? payments.filter((payment) => payment.tenantId === myTenantProfile.id) : payments;
  const myFlat = myTenantProfile ? flats.find(f => f.id === myTenantProfile.flatId) : flats.find(f => f.tenantId === user?.id);
  const payingPayment = payments.find(p => p.id === payingId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('stripe_session_id');
    const cancelled = params.get('payment_cancelled');

    if (cancelled) {
      toast('Stripe payment was cancelled.', 'warning');
      window.history.replaceState({}, '', '/tenant/payments');
      return;
    }

    if (!sessionId || confirmingSessionId === sessionId) return;

    setConfirmingSessionId(sessionId);
    confirmStripeCheckoutSession(sessionId)
      .then((payment) => {
        setSuccess(true);
        toast('Stripe sandbox payment successful!');
        downloadPaymentReceipt(payment);
      })
      .catch((error) => toast(error instanceof Error ? error.message : 'Could not verify Stripe payment', 'error'))
      .finally(() => {
        setConfirmingSessionId(null);
        window.history.replaceState({}, '', '/tenant/payments');
        window.setTimeout(() => setSuccess(false), 1800);
      });
  }, [confirmStripeCheckoutSession, confirmingSessionId, toast]);

  const handlePay = async () => {
    if (!payingId) return;
    setProcessing(true);
    try {
      const checkoutUrl = await createStripeCheckoutSession(payingId);
      window.location.href = checkoutUrl;
    } catch (error) {
      setProcessing(false);
      toast(error instanceof Error ? error.message : 'Could not start Stripe checkout', 'error');
    }
  };

  const handleCreateRentPayment = async () => {
    if (!selectedMonth) {
      toast('Select a rent month', 'error');
      return;
    }

    setCreatingRent(true);
    try {
      const payment = await createRentPayment(selectedMonth);
      if (payment.status === 'paid') {
        toast('Rent for this month is already paid.');
        downloadPaymentReceipt(payment);
        return;
      }

      setPayingId(payment.id);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create rent payment', 'error');
    } finally {
      setCreatingRent(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Payments</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your rent and service charge payments</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Pay Rent by Month</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Select any billing month and pay the rent for your assigned flat.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_auto]">
            <Input
              label="Rent Month"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
            <Button
              icon={<CreditCard className="h-4 w-4" />}
              onClick={handleCreateRentPayment}
              loading={creatingRent}
              disabled={!myTenantProfile?.flatId}
              className="sm:self-end"
            >
              Continue to Pay
            </Button>
          </div>
        </div>
      </Card>

      {confirmingSessionId && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300">Verifying your Stripe sandbox payment...</p>
        </div>
      )}

      {/* Payment flow explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
          <User className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Rent Payment</p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">Goes directly to your flat owner ({myFlat?.ownerName || 'Owner'}). Admin has no access to these funds.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl">
          <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">Service Charges</p>
            <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5">Maintenance fees, utility bills & society charges go to Admin (Building Management).</p>
          </div>
        </div>
      </div>

      {/* Pending payments */}
      {myPayments.filter(p => p.status !== 'paid').length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">⚠️ Pending Payments</h3>
          <div className="space-y-3">
            {myPayments.filter(p => p.status !== 'paid').map(p => (
              <Card key={p.id} className="p-4 border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.recipient === 'owner' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
                        {p.type === 'rent' ? 'Rent' : 'Service Charge'}
                      </span>
                      <Badge className={getStatusColor(p.status)}>{p.status}</Badge>
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Due: {formatDate(p.dueDate)} · To: {p.recipient === 'owner' ? (p.ownerName || 'Owner') : 'Admin'}
                    </p>
                  </div>
                  <Button icon={<CreditCard className="w-4 h-4" />} onClick={() => setPayingId(p.id)}>
                    Pay Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">Payment History</h3>
        </div>
        <Table>
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr><Th>Invoice</Th><Th>Type</Th><Th>To</Th><Th>Amount</Th><Th>Month</Th><Th>Method</Th><Th>Status</Th><Th></Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {myPayments.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <Td><span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{p.invoiceNumber}</span></Td>
                <Td>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.type === 'rent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
                    {p.type === 'rent' ? 'Rent' : 'Service'}
                  </span>
                </Td>
                <Td className="text-xs text-slate-500">{p.recipient === 'owner' ? (p.ownerName || 'Owner') : 'Admin'}</Td>
                <Td><span className="font-semibold">{formatCurrency(p.amount)}</span></Td>
                <Td>{p.month}</Td>
                <Td className="capitalize">{p.method || '—'}</Td>
                <Td><Badge className={getStatusColor(p.status)}>{p.status}</Badge></Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setInvoicePreview(p)}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500"
                      title="View invoice"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {p.status === 'paid' && (
                      <button
                        onClick={() => downloadPaymentReceipt(p)}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500"
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

      {/* Payment Modal */}
      <Modal open={!!payingId} onClose={() => !processing && setPayingId(null)} title="Make Payment" size="sm">
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Payment Successful!</h3>
            <p className="text-sm text-slate-500 mt-1">{formatCurrency(payingPayment?.amount || 0)} sent</p>
          </div>
        ) : (
          <div className="space-y-5">
            {payingPayment && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-slate-900 dark:text-white text-lg">{formatCurrency(payingPayment.amount)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>To: {payingPayment.recipient === 'owner' ? (payingPayment.ownerName || 'Owner') : 'Admin (BSMS)'}</span>
                  <span className={`font-medium ${payingPayment.recipient === 'owner' ? 'text-blue-600' : 'text-violet-600'}`}>
                    {payingPayment.recipient === 'owner' ? '→ Owner' : '→ Admin'}
                  </span>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Stripe Sandbox Checkout</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">You will enter test card details on Stripe's secure demo page. Use card 4242 4242 4242 4242 with any future expiry and CVC.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setPayingId(null)} className="flex-1" disabled={processing}>Cancel</Button>
              <Button onClick={handlePay} className="flex-1" loading={processing}>
                {processing ? 'Opening Stripe...' : `Pay ${formatCurrency(payingPayment?.amount || 0)}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
                  <p className="text-slate-500">Type</p>
                  <p className="font-medium text-slate-900 dark:text-white capitalize">{invoicePreview.type.replace('_', ' ')}</p>
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
                  <p className="text-slate-500">Method</p>
                  <p className="font-medium text-slate-900 dark:text-white capitalize">{invoicePreview.method || 'N/A'}</p>
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
                  <p className="text-slate-500">Recipient</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {invoicePreview.recipient === 'owner' ? (invoicePreview.ownerName || 'Owner') : 'Admin (BSMS)'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Flat</p>
                  <p className="font-medium text-slate-900 dark:text-white">{invoicePreview.flatNumber}</p>
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
