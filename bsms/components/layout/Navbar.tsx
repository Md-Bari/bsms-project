'use client';
import { useEffect, useRef, useState } from 'react';
import { Bell, Sun, Moon, Menu, Mail, Phone, Home, CalendarDays, Settings, LogOut } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuthStore } from '@/lib/store/authStore';
import { useAppStore } from '@/lib/store/appStore';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

interface NavbarProps {
  onMenuToggle: () => void;
  title: string;
}

export default function Navbar({ onMenuToggle, title }: NavbarProps) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuthStore();
  const { notifications, markNotificationRead } = useAppStore();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const userNotifs = notifications.filter(n => n.userId === user?.id);
  const unread = userNotifs.filter(n => !n.read).length;
  const settingsHref = user ? `/${user.role}/settings` : '/login';

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button onClick={toggle} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-500" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }} className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unread}</span>}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
                <span className="text-xs text-slate-500">{unread} unread</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {userNotifs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications</div>
                ) : userNotifs.map(n => (
                  <button key={n.id} onClick={() => { markNotificationRead(n.id); setShowNotif(false); }}
                    className={cn('w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors', !n.read && 'bg-indigo-50 dark:bg-indigo-900/20')}>
                    <div className="flex gap-2">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />}
                      <div className={!n.read ? '' : 'pl-4'}>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
            className="flex items-center gap-2 rounded-xl pl-2 pr-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-expanded={showProfile}
            aria-haspopup="dialog"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
              {user?.name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-slate-900 dark:text-white">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
          </button>

          {showProfile && user && (
            <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-base font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                    <p className="text-slate-800 dark:text-slate-100 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                    <p className="text-slate-800 dark:text-slate-100">{user.phone || 'Not added'}</p>
                  </div>
                </div>
                {user.flatNumber && (
                  <div className="flex items-start gap-3 text-sm">
                    <Home className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Flat</p>
                      <p className="text-slate-800 dark:text-slate-100">{user.flatNumber}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 text-sm">
                  <CalendarDays className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Joined</p>
                    <p className="text-slate-800 dark:text-slate-100">{formatDateTime(user.createdAt)}</p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <Link
                  href={settingsHref}
                  onClick={() => setShowProfile(false)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  <Settings className="w-4 h-4" />
                  Update Profile
                </Link>
                <button
                  type="button"
                  onClick={() => { setShowProfile(false); logout(); }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
