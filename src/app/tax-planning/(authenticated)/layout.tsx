'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { UserRole } from '@/lib/tax-planning/types';
import {
  AuthContext,
  ToastContext,
  type AuthUser,
  type Toast,
} from '@/lib/tax-planning/auth-context';
import { ThemeToggle } from '@/components/ThemeToggle';

// ---------------------------------------------------------------------------
// Navigation Items
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredRole?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/tax-planning/dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: 'Households',
    href: '/tax-planning/households',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    label: 'Tax Intelligence',
    href: '/tax-planning/intelligence',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    requiredRole: ['ADVISOR', 'ADMIN'],
  },
  {
    label: 'Rollover Engine',
    href: '/tax-planning/rollover',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    requiredRole: ['ADVISOR', 'ADMIN'],
  },
  {
    label: 'Audit Log',
    href: '/tax-planning/admin/audit',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    requiredRole: ['ADMIN', 'OPS'],
  },
];

// ---------------------------------------------------------------------------
// Breadcrumb helpers
// ---------------------------------------------------------------------------

function pathToBreadcrumbs(pathname: string): Array<{ label: string; href: string }> {
  const segments = pathname.replace('/tax-planning/', '').split('/').filter(Boolean);
  const crumbs: Array<{ label: string; href: string }> = [];
  let accumulated = '/tax-planning';

  for (const segment of segments) {
    accumulated += `/${segment}`;
    const label = segment
      .replace(/\[.*?\]/g, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
    if (label) {
      crumbs.push({ label, href: accumulated });
    }
  }

  return crumbs;
}

// ---------------------------------------------------------------------------
// Authenticated Layout
// ---------------------------------------------------------------------------

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('tp_access_token');
    const storedUser = localStorage.getItem('tp_user');

    if (!storedToken || !storedUser) {
      router.push('/tax-planning/login');
      return;
    }

    try {
      const parsedUser: AuthUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setToken(storedToken);
    } catch {
      router.push('/tax-planning/login');
      return;
    }

    setIsHydrated(true);
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('tp_access_token');
    localStorage.removeItem('tp_refresh_token');
    localStorage.removeItem('tp_user');
    router.push('/tax-planning/login');
  }, [router]);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const breadcrumbs = pathToBreadcrumbs(pathname);

  // Show loading until hydrated
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (!item.requiredRole) return true;
    return user ? item.requiredRole.includes(user.role) : false;
  });

  return (
    <AuthContext.Provider value={{ user, token, logout }}>
      <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
        <div className="flex min-h-screen">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 backdrop-blur-xs lg:hidden"
              style={{ background: 'rgba(0, 0, 0, 0.30)' }}
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col transition-transform lg:translate-x-0 lg:static lg:z-auto ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{
              background: 'var(--s-sidebar-bg)',
              backdropFilter: 'blur(24px)',
              borderRight: '1px solid var(--s-border-subtle)',
            }}
          >
            {/* Logo area */}
            <div
              className="flex h-16 items-center gap-3 px-5"
              style={{ borderBottom: '1px solid var(--s-border-subtle)' }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary">
                <svg
                  className="h-5 w-5 text-text-onBrand"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-text">Farther</p>
                <p className="text-[10px] uppercase tracking-wider text-text-faint">
                  Tax Planning
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main navigation">
              {filteredNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/tax-planning/dashboard' &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-accent-primarySoft'
                        : 'text-text-faint hover:text-text'
                    }`}
                    style={isActive ? { background: 'var(--s-nav-active-bg)' } : {}}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Theme Toggle */}
            <div className="px-4 py-2" style={{ borderTop: '1px solid var(--s-border-subtle)' }}>
              <ThemeToggle />
            </div>

            {/* User section */}
            {user && (
              <div className="px-4 py-4" style={{ borderTop: '1px solid var(--s-border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-accent-primarySoft"
                    style={{ background: 'rgba(78, 112, 130, 0.20)' }}
                  >
                    {user.first_name[0]}
                    {user.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="truncate text-xs text-text-faint">
                      {user.role}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-text-faint transition-colors hover:text-text"
                  style={{
                    border: '1px solid var(--s-border-subtle)',
                  }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </aside>

          {/* Main content area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top bar */}
            <header
              className="flex h-16 items-center gap-4 backdrop-blur-xl px-4 lg:px-8"
              style={{
                background: 'var(--s-topbar-bg)',
                borderBottom: '1px solid var(--s-border-subtle)',
              }}
            >
              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-text-muted lg:hidden"
                aria-label="Open sidebar"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              {/* Breadcrumbs */}
              <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.href}>
                    {index > 0 && (
                      <svg className="h-4 w-4 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    )}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="font-medium text-text">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="text-text-muted transition-colors hover:text-text-subtle"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </nav>

              {/* Spacer */}
              <div className="flex-1" />

              {/* User badge in top bar */}
              {user && (
                <div className="hidden items-center gap-2 sm:flex">
                  <span className="text-xs text-text-muted">{user.email}</span>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-accent-primarySoft" style={{ background: 'rgba(78, 112, 130, 0.15)' }}>
                    {user.role}
                  </span>
                </div>
              )}
            </header>

            {/* Page content */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-8">
              {children}
            </main>
          </div>

          {/* Toast notifications */}
          {toasts.length > 0 && (
            <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2">
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  role="alert"
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right ${
                    toast.type === 'success'
                      ? 'border-success-300 bg-success-100 text-success-700'
                      : toast.type === 'error'
                        ? 'border-critical-300 bg-critical-100 text-critical-700'
                        : toast.type === 'warning'
                          ? 'border-warning-300 bg-warning-100 text-warning-700'
                          : 'border-info-300 bg-info-100 text-info-700'
                  }`}
                >
                  <span className="text-sm font-medium">{toast.message}</span>
                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="ml-2 rounded p-0.5 transition-colors hover:opacity-70"
                    aria-label="Dismiss notification"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}
