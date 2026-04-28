export type Role = 'admin' | 'owner' | 'tenant' | 'guard';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatar?: string;
  flatId?: string;
  flatNumber?: string;
  nid?: string;
  emergencyContact?: string;
  moveInDate?: string;
  status?: 'active' | 'inactive' | null;
  isVerified?: boolean;
  emailNotifications?: boolean;
  createdAt: string;
}

export interface Flat {
  id: string;
  number: string;
  floor: number;
  size: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  tenantId?: string;
  tenantName?: string;
  status: 'vacant' | 'occupied' | 'maintenance';
  monthlyRent: number;
  createdAt: string;
}

export interface Tenant {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  nid: string;
  flatId?: string;
  flatNumber?: string;
  emergencyContact?: string;
  moveInDate?: string;
  status: 'active' | 'inactive';
}

export interface Payment {
  id: string;
  tenantId: string;
  tenantName: string;
  flatId: string;
  flatNumber: string;
  ownerId?: string;
  ownerName?: string;
  amount: number;
  type: 'rent' | 'service_charge' | 'utility' | 'maintenance_fee';
  status: 'paid' | 'unpaid' | 'overdue';
  method?: 'bkash' | 'nagad' | 'card' | 'cash';
  month: string;
  dueDate: string;
  paidDate?: string;
  invoiceNumber: string;
  recipient: 'owner' | 'admin';
}

export interface MaintenanceTicket {
  id: string;
  ticketId: string;
  tenantId: string;
  tenantName: string;
  flatId: string;
  flatNumber: string;
  category: 'electrical' | 'plumbing' | 'carpentry' | 'cleaning' | 'other';
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Visitor {
  id: string;
  name: string;
  phone: string;
  nid?: string;
  flatId: string;
  flatNumber: string;
  tenantId?: string;
  tenantName?: string;
  purpose?: string;
  type: 'walkin' | 'expected';
  status: 'pending' | 'arrived' | 'exited';
  visitDate?: string;
  expectedTime?: string;
  entryTime?: string;
  exitTime?: string;
  duration?: string;
  loggedBy?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  targetRole: 'all' | 'tenant' | 'owner' | 'guard';
  createdAt: string;
  readBy: string[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'payment' | 'maintenance' | 'visitor' | 'announcement' | 'general';
  read: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
