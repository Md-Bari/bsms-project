import { create } from 'zustand';
import { Flat, Tenant, Payment, MaintenanceTicket, Visitor, Announcement, Notification } from '@/types';
import { apiRequest } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';

interface AppStore {
  flats: Flat[];
  tenants: Tenant[];
  payments: Payment[];
  tickets: MaintenanceTicket[];
  visitors: Visitor[];
  announcements: Announcement[];
  notifications: Notification[];
  isLoading: boolean;
  initialized: boolean;
  loadAppData: () => Promise<void>;

  // Flat actions
  addFlat: (flat: Omit<Flat, 'id' | 'createdAt'>) => void;
  updateFlat: (id: string, data: Partial<Flat>) => void;
  deleteFlat: (id: string) => void;

  // Tenant actions
  addTenant: (tenant: Omit<Tenant, 'id'>) => void;
  updateTenant: (id: string, data: Partial<Tenant>) => void;
  deleteTenant: (id: string) => void;

  // Payment actions
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  createRentPayment: (month: string) => Promise<Payment>;
  updatePaymentStatus: (id: string, status: Payment['status'], method?: Payment['method']) => void;
  createStripeCheckoutSession: (id: string) => Promise<string>;
  confirmStripeCheckoutSession: (sessionId: string) => Promise<Payment>;

  // Maintenance actions
  addTicket: (ticket: Omit<MaintenanceTicket, 'id' | 'ticketId' | 'createdAt' | 'updatedAt'>) => void;
  updateTicket: (id: string, data: Partial<MaintenanceTicket>) => void;
  addTicketNote: (id: string, note: string) => void;

  // Visitor actions
  addVisitor: (visitor: Omit<Visitor, 'id'>) => void;
  updateVisitor: (id: string, data: Partial<Visitor>) => void;
  deleteVisitor: (id: string) => void;
  markVisitorArrived: (id: string) => void;
  markVisitorExited: (id: string) => void;

  // Announcement actions
  addAnnouncement: (ann: Omit<Announcement, 'id' | 'createdAt' | 'readBy'>) => void;
  markAnnouncementRead: (annId: string, userId: string) => void;

  // Notification actions
  markNotificationRead: (id: string) => void;
  addNotification: (n: Omit<Notification, 'id' | 'createdAt'>) => void;
}

type BootstrapPayload = {
  flats: Flat[];
  tenants: Tenant[];
  payments: Payment[];
  tickets: MaintenanceTicket[];
  visitors: Visitor[];
  announcements: Announcement[];
  notifications: Notification[];
};

const withToken = () => useAuthStore.getState().token;
const toNumericId = (value?: string | number | null) => value !== undefined && value !== null && value !== '' ? Number(value) : undefined;

const applyTenantFlatAssignment = (flats: Flat[], tenant: Tenant, previousFlatId?: string | null) => (
  flats.map((flat) => {
    if (previousFlatId && flat.id === previousFlatId && previousFlatId !== tenant.flatId) {
      return { ...flat, tenantId: undefined, tenantName: undefined, status: 'vacant' as const };
    }

    if (tenant.flatId && flat.id === tenant.flatId) {
      return { ...flat, tenantId: tenant.userId, tenantName: tenant.name, status: 'occupied' as const };
    }

    return flat;
  })
);

export const useAppStore = create<AppStore>((set) => ({
  flats: [],
  tenants: [],
  payments: [],
  tickets: [],
  visitors: [],
  announcements: [],
  notifications: [],
  isLoading: false,
  initialized: false,

  loadAppData: async () => {
    const token = withToken();
    if (!token) return;

    set({ isLoading: true });
    try {
      const payload = await apiRequest<BootstrapPayload>('/bootstrap', { token });
      set({ ...payload, isLoading: false, initialized: true });
    } catch {
      set({ isLoading: false });
    }
  },

  addFlat: (flat) => {
    const optimistic = { ...flat, id: `tmp-flat-${Date.now()}`, createdAt: new Date().toISOString() };
    set(s => ({ flats: [...s.flats, optimistic] }));
    void apiRequest<Flat>('/flats', {
      method: 'POST',
      body: { ...flat, ownerId: toNumericId(flat.ownerId) },
      token: withToken(),
    })
      .then(saved => set(s => ({ flats: s.flats.map(item => item.id === optimistic.id ? saved : item) })))
      .catch(() => set(s => ({ flats: s.flats.filter(item => item.id !== optimistic.id) })));
  },
  updateFlat: (id, data) => {
    const previous = useAppStore.getState().flats;
    const previousTenants = useAppStore.getState().tenants;
    set(s => {
      const removesTenant = data.status === 'vacant' || data.status === 'maintenance';

      return {
        flats: s.flats.map(f => {
          if (f.id !== id) return f;

          const next = { ...f, ...data };
          return removesTenant ? { ...next, tenantId: undefined, tenantName: undefined } : next;
        }),
        tenants: removesTenant
          ? s.tenants.map(t => t.flatId === id ? { ...t, flatId: undefined, flatNumber: undefined } : t)
          : s.tenants,
      };
    });
    void apiRequest<Flat>(`/flats/${id}`, {
      method: 'PATCH',
      body: { ...data, ownerId: toNumericId(data.ownerId) },
      token: withToken(),
    })
      .then(saved => set(s => ({
        flats: s.flats.map(item => item.id === id ? saved : item),
        tenants: saved.status === 'vacant' || saved.status === 'maintenance'
          ? s.tenants.map(t => t.flatId === id ? { ...t, flatId: undefined, flatNumber: undefined } : t)
          : s.tenants,
      })))
      .catch(() => set({ flats: previous, tenants: previousTenants }));
  },
  deleteFlat: (id) => {
    const previous = useAppStore.getState().flats;
    set(s => ({ flats: s.flats.filter(f => f.id !== id) }));
    void apiRequest(`/flats/${id}`, { method: 'DELETE', token: withToken() }).catch(() => set({ flats: previous }));
  },

  addTenant: (tenant) => {
    void apiRequest<Tenant>('/tenants', {
      method: 'POST',
      body: { ...tenant, flatId: toNumericId(tenant.flatId) },
      token: withToken(),
    })
      .then(saved => set(s => ({
        tenants: [...s.tenants, saved],
        flats: applyTenantFlatAssignment(s.flats, saved),
      })))
      .catch(() => undefined);
  },
  updateTenant: (id, data) => {
    const previous = useAppStore.getState().tenants;
    const previousFlats = useAppStore.getState().flats;
    const previousFlatId = previous.find(t => t.id === id)?.flatId;
    set(s => {
      const tenant = s.tenants.find(t => t.id === id);
      const optimisticTenant = tenant ? { ...tenant, ...data } : undefined;

      return {
        tenants: s.tenants.map(t => t.id === id ? { ...t, ...data } : t),
        flats: optimisticTenant ? applyTenantFlatAssignment(s.flats, optimisticTenant, previousFlatId) : s.flats,
      };
    });
    void apiRequest<Tenant>(`/tenants/${id}`, {
      method: 'PATCH',
      body: { ...data, flatId: toNumericId(data.flatId) },
      token: withToken(),
    })
      .then(saved => set(s => ({
        tenants: s.tenants.map(item => item.id === id ? saved : item),
        flats: applyTenantFlatAssignment(s.flats, saved, previousFlatId),
      })))
      .catch(() => set({ tenants: previous, flats: previousFlats }));
  },
  deleteTenant: (id) => {
    const previous = useAppStore.getState().tenants;
    const previousFlats = useAppStore.getState().flats;
    const deletedTenant = previous.find(t => t.id === id);
    set(s => ({ tenants: s.tenants.filter(t => t.id !== id) }));
    void apiRequest(`/tenants/${id}`, { method: 'DELETE', token: withToken() }).catch(() => set({ tenants: previous, flats: previousFlats }));
    if (deletedTenant?.flatId) {
      set(s => ({
        flats: s.flats.map(flat => flat.id === deletedTenant.flatId ? { ...flat, tenantId: undefined, tenantName: undefined, status: 'vacant' } : flat),
      }));
    }
  },

  addPayment: (payment) => {
    void apiRequest<Payment>('/payments', {
      method: 'POST',
      body: {
        ...payment,
        tenantProfileId: toNumericId(payment.tenantId),
        flatId: toNumericId(payment.flatId),
        ownerId: toNumericId(payment.ownerId),
      },
      token: withToken(),
    })
      .then(saved => set(s => ({ payments: [...s.payments, saved] })))
      .catch(() => undefined);
  },
  createRentPayment: async (month) => {
    const payment = await apiRequest<Payment>('/payments/rent-payment', {
      method: 'POST',
      body: { month },
      token: withToken(),
    });

    set(s => ({
      payments: s.payments.some(item => item.id === payment.id)
        ? s.payments.map(item => item.id === payment.id ? payment : item)
        : [payment, ...s.payments],
    }));

    return payment;
  },
  updatePaymentStatus: (id, status, method) => {
    const previous = useAppStore.getState().payments;
    set(s => ({
      payments: s.payments.map(p => p.id === id ? { ...p, status, method: method || p.method, paidDate: status === 'paid' ? new Date().toISOString() : p.paidDate } : p),
    }));
    void apiRequest<Payment>(`/payments/${id}/status`, { method: 'PATCH', body: { status, method }, token: withToken() })
      .then(saved => set(s => ({ payments: s.payments.map(item => item.id === id ? saved : item) })))
      .catch(() => set({ payments: previous }));
  },
  createStripeCheckoutSession: async (id) => {
    const payload = await apiRequest<{ checkoutUrl: string; payment: Payment }>(`/payments/${id}/stripe-checkout`, {
      method: 'POST',
      token: withToken(),
    });
    set(s => ({ payments: s.payments.map(item => item.id === id ? payload.payment : item) }));

    return payload.checkoutUrl;
  },
  confirmStripeCheckoutSession: async (sessionId) => {
    const payment = await apiRequest<Payment>('/payments/stripe/confirm', {
      method: 'POST',
      body: { sessionId },
      token: withToken(),
    });
    set(s => ({ payments: s.payments.map(item => item.id === payment.id ? payment : item) }));

    return payment;
  },

  addTicket: (ticket) => {
    void apiRequest<MaintenanceTicket>('/tickets', {
      method: 'POST',
      body: {
        ...ticket,
        tenantId: toNumericId(ticket.tenantId),
        flatId: toNumericId(ticket.flatId),
      },
      token: withToken(),
    })
      .then(saved => set(s => ({ tickets: [saved, ...s.tickets] })))
      .catch(() => undefined);
  },
  updateTicket: (id, data) => {
    const previous = useAppStore.getState().tickets;
    set(s => ({ tickets: s.tickets.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t) }));
    void apiRequest<MaintenanceTicket>(`/tickets/${id}`, { method: 'PATCH', body: data, token: withToken() })
      .then(saved => set(s => ({ tickets: s.tickets.map(item => item.id === id ? saved : item) })))
      .catch(() => set({ tickets: previous }));
  },
  addTicketNote: (id, note) => {
    const previous = useAppStore.getState().tickets;
    set(s => ({ tickets: s.tickets.map(t => t.id === id ? { ...t, notes: [...t.notes, note], updatedAt: new Date().toISOString() } : t) }));
    void apiRequest<MaintenanceTicket>(`/tickets/${id}/notes`, { method: 'POST', body: { note }, token: withToken() })
      .then(saved => set(s => ({ tickets: s.tickets.map(item => item.id === id ? saved : item) })))
      .catch(() => set({ tickets: previous }));
  },

  addVisitor: (visitor) => {
    void apiRequest<Visitor>('/visitors', {
      method: 'POST',
      body: {
        ...visitor,
        flatId: toNumericId(visitor.flatId),
        loggedBy: toNumericId(visitor.loggedBy),
      },
      token: withToken(),
    })
      .then(saved => set(s => ({ visitors: [saved, ...s.visitors] })))
      .catch(() => undefined);
  },
  updateVisitor: (id, data) => {
    const previous = useAppStore.getState().visitors;
    set(s => ({ visitors: s.visitors.map(v => v.id === id ? { ...v, ...data } : v) }));
    void apiRequest<Visitor>(`/visitors/${id}`, { method: 'PATCH', body: data, token: withToken() })
      .then(saved => set(s => ({ visitors: s.visitors.map(item => item.id === id ? saved : item) })))
      .catch(() => set({ visitors: previous }));
  },
  deleteVisitor: (id) => {
    const previous = useAppStore.getState().visitors;
    set(s => ({ visitors: s.visitors.filter(v => v.id !== id) }));
    void apiRequest(`/visitors/${id}`, { method: 'DELETE', token: withToken() }).catch(() => set({ visitors: previous }));
  },
  markVisitorArrived: (id) => {
    const previous = useAppStore.getState().visitors;
    set(s => ({ visitors: s.visitors.map(v => v.id === id ? { ...v, status: 'arrived', entryTime: new Date().toLocaleTimeString() } : v) }));
    void apiRequest<Visitor>(`/visitors/${id}/arrive`, { method: 'PATCH', token: withToken() })
      .then(saved => set(s => ({ visitors: s.visitors.map(item => item.id === id ? saved : item) })))
      .catch(() => set({ visitors: previous }));
  },
  markVisitorExited: (id) => {
    const previous = useAppStore.getState().visitors;
    set(s => ({ visitors: s.visitors.map(v => v.id === id ? { ...v, status: 'exited', exitTime: new Date().toLocaleTimeString(), duration: '30 min' } : v) }));
    void apiRequest<Visitor>(`/visitors/${id}/exit`, { method: 'PATCH', token: withToken() })
      .then(saved => set(s => ({ visitors: s.visitors.map(item => item.id === id ? saved : item) })))
      .catch(() => set({ visitors: previous }));
  },

  addAnnouncement: (ann) => {
    void apiRequest<Announcement>('/announcements', { method: 'POST', body: ann, token: withToken() })
      .then(saved => set(s => ({ announcements: [saved, ...s.announcements] })))
      .catch(() => undefined);
  },
  markAnnouncementRead: (annId, userId) => {
    set(s => ({ announcements: s.announcements.map(a => a.id === annId && !a.readBy.includes(userId) ? { ...a, readBy: [...a.readBy, userId] } : a) }));
    void apiRequest<Announcement>(`/announcements/${annId}/read`, { method: 'POST', token: withToken() }).catch(() => undefined);
  },

  markNotificationRead: (id) => {
    set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
    void apiRequest<Notification>(`/notifications/${id}/read`, { method: 'PATCH', token: withToken() }).catch(() => undefined);
  },
  addNotification: (n) => {
    void apiRequest<Notification>('/notifications', {
      method: 'POST',
      body: { ...n, userId: toNumericId(n.userId) },
      token: withToken(),
    })
      .then(saved => set(s => ({ notifications: [saved, ...s.notifications] })))
      .catch(() => undefined);
  },
}));
