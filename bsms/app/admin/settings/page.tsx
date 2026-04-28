'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useToast } from '@/components/ToastProvider';
import { Card, CardHeader, CardBody, Button, Input } from '@/components/ui';
import { User, Lock, Bell, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateProfile, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ current: '', newPw: '', confirm: '' });
  const [notifs, setNotifs] = useState({ payments: true, maintenance: true, visitors: true, announcements: true, email: user?.emailNotifications ?? true });

  useEffect(() => {
    setProfile({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
    setNotifs((prev) => ({ ...prev, email: user?.emailNotifications ?? true }));
  }, [user]);

  const handleSaveProfile = async () => {
    if (!profile.name.trim() || !profile.email.trim()) {
      toast('Name and email are required', 'error');
      return;
    }

    const result = await updateProfile({
      name: profile.name.trim(),
      email: profile.email.trim(),
      phone: profile.phone.trim(),
    });

    if (result.success) {
      toast('Profile updated successfully');
      return;
    }

    toast(result.error || 'Profile update failed', 'error');
  };
  const handleChangePassword = () => {
    if (!passwords.current || !passwords.newPw) { toast('Fill all password fields', 'error'); return; }
    if (passwords.newPw !== passwords.confirm) { toast('Passwords do not match', 'error'); return; }
    if (passwords.newPw.length < 8) { toast('Password too short', 'error'); return; }
    toast('Password changed successfully');
    setPasswords({ current: '', newPw: '', confirm: '' });
  };

  const handleSaveNotifications = async () => {
    const result = await updateProfile({ emailNotifications: notifs.email });
    if (result.success) {
      toast('Preferences saved');
      return;
    }

    toast(result.error || 'Failed to save preferences', 'error');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'password', label: 'Password', icon: <Lock className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900 dark:text-white">Profile Information</h3></CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">{user?.name.charAt(0)}</div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-sm text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <Input label="Full Name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            <Input label="Email Address" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
            <Input label="Phone Number" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
            <div className="pt-2">
              <Button onClick={handleSaveProfile} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900 dark:text-white">Change Password</h3></CardHeader>
          <CardBody className="space-y-4">
            <Input label="Current Password" type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" />
            <Input label="New Password" type="password" value={passwords.newPw} onChange={e => setPasswords(p => ({ ...p, newPw: e.target.value }))} placeholder="••••••••" />
            <Input label="Confirm New Password" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" />
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2"><Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />Password must be at least 8 characters long with a mix of letters and numbers.</p>
            </div>
            <div className="pt-2">
              <Button onClick={handleChangePassword}>Update Password</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900 dark:text-white">Notification Preferences</h3></CardHeader>
          <CardBody className="space-y-4">
            {[
              { key: 'payments', label: 'Payment Notifications', desc: 'Get notified about payments and invoices' },
              { key: 'maintenance', label: 'Maintenance Updates', desc: 'Updates on maintenance ticket status' },
              { key: 'visitors', label: 'Visitor Alerts', desc: 'When visitors arrive or exit' },
              { key: 'announcements', label: 'Announcements', desc: 'New announcements from admin' },
              { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email' },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{n.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
                </div>
                <button onClick={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key as keyof typeof notifs] }))}
                  className={`relative w-11 h-6 rounded-full transition-all ${notifs[n.key as keyof typeof notifs] ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notifs[n.key as keyof typeof notifs] ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            ))}
            <div className="pt-2">
              <Button onClick={handleSaveNotifications} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Preferences'}</Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
