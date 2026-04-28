'use client';
import { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useToast } from '@/components/ToastProvider';
import { Card, Badge, Button, Modal } from '@/components/ui';
import { Building2, User, Wrench, Home, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatCurrency, getStatusColor } from '@/lib/utils';
import { Flat } from '@/types';

type OwnerFlatStatus = 'vacant' | 'maintenance';

const ownerStatusLabel: Record<Flat['status'], string> = {
  vacant: 'Available',
  occupied: 'Occupied',
  maintenance: 'Under Maintenance',
};

export default function OwnerFlats() {
  const { flats, tenants, updateFlat } = useAppStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [pendingChange, setPendingChange] = useState<{ flat: Flat; status: OwnerFlatStatus } | null>(null);
  const myFlats = flats.filter(f => f.ownerId === user?.id);

  const confirmConditionChange = () => {
    if (!pendingChange) return;

    const tenant = tenants.find(t => t.userId === pendingChange.flat.tenantId);
    updateFlat(pendingChange.flat.id, { status: pendingChange.status });
    setPendingChange(null);

    if (pendingChange.status === 'vacant') {
      toast(tenant ? `${tenant.name} removed. Flat is now available.` : 'Flat is now available.');
      return;
    }

    toast(tenant ? `${tenant.name} removed. Flat moved to maintenance.` : 'Flat moved to maintenance.', 'warning');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Flats</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{myFlats.length} properties under your ownership</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myFlats.map(flat => {
          const tenant = tenants.find(t => t.userId === flat.tenantId);
          const isAvailable = flat.status === 'vacant';
          const isMaintenance = flat.status === 'maintenance';

          return (
            <Card key={flat.id} className="p-5 overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <Badge className={getStatusColor(flat.status)}>{ownerStatusLabel[flat.status]}</Badge>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">{flat.number}</h3>
              <p className="text-sm text-slate-500 mt-1">Floor {flat.floor} · {flat.size}</p>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Monthly Rent</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(flat.monthlyRent)}</span>
                </div>
                {tenant ? (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Current renter</p>
                    <div className="mt-1 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{tenant.name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">No renter assigned</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Change flat condition</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isAvailable && !tenant}
                    onClick={() => setPendingChange({ flat, status: 'vacant' })}
                    className={`flex min-h-16 flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isAvailable
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Home className="mb-1 h-4 w-4" />
                    <span className="text-sm font-semibold">Available</span>
                    <span className="text-xs opacity-75">Renter left</span>
                  </button>
                  <button
                    type="button"
                    disabled={isMaintenance && !tenant}
                    onClick={() => setPendingChange({ flat, status: 'maintenance' })}
                    className={`flex min-h-16 flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isMaintenance
                      ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Wrench className="mb-1 h-4 w-4" />
                    <span className="text-sm font-semibold">Maintenance</span>
                    <span className="text-xs opacity-75">Needs work</span>
                  </button>
                </div>
                {tenant && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    Changing condition removes the current renter from this flat.
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={!!pendingChange}
        onClose={() => setPendingChange(null)}
        title="Update Flat Condition"
        size="sm"
      >
        {pendingChange && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Flat</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">{pendingChange.flat.number}</p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">New condition</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                {pendingChange.status === 'vacant' ? 'Available' : 'Under Maintenance'}
              </p>
              {pendingChange.flat.tenantName && (
                <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                  {pendingChange.flat.tenantName} will be removed from this flat.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setPendingChange(null)} className="flex-1">Cancel</Button>
              <Button onClick={confirmConditionChange} className="flex-1">
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
