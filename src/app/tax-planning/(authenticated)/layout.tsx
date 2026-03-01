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
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-700 border-t-transparent" />
          <p className="text-sm text-charcoal-500">Loading...</p>
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
        <div className="flex min-h-screen bg-canvas">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-charcoal-900/50 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-charcoal-900 text-white transition-transform lg:translate-x-0 lg:static lg:z-auto ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Logo area */}
            <div className="flex h-16 items-center gap-3 border-b border-charcoal-800 px-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700">
                <svg
                  className="h-5 w-5 text-white"
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
                <p className="text-sm font-semibold text-white">Farther</p>
                <p className="text-[10px] uppercase tracking-wider text-charcoal-400">
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
                        ? 'bg-brand-700/20 text-brand-300'
                        : 'text-charcoal-300 hover:bg-charcoal-800 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User section */}
            {user && (
              <div className="border-t border-charcoal-800 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal-700 text-sm font-semibold text-white">
                    {user.first_name[0]}
                    {user.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="truncate text-xs text-charcoal-400">
                      {user.role}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-charcoal-700 px-3 py-1.5 text-xs font-medium text-charcoal-300 transition-colors hover:bg-charcoal-800 hover:text-white"
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
            <header className="flex h-16 items-center gap-4 border-b border-limestone-200 bg-white px-4 lg:px-8">
              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-charcoal-500 hover:bg-limestone-50 lg:hidden"
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
                      <svg className="h-4 w-4 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    )}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="font-medium text-charcoal-900">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="text-charcoal-500 transition-colors hover:text-charcoal-700"
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
                  <span className="text-xs text-charcoal-500">{user.email}</span>
                  <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
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
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  role="alert"
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right ${
                    toast.type === 'success'
                      ? 'border-success-200 bg-success-100 text-success-700'
                      : toast.type === 'error'
                        ? 'border-critical-200 bg-critical-100 text-critical-700'
                        : toast.type === 'warning'
                          ? 'border-warning-200 bg-warning-100 text-warning-700'
                          : 'border-info-200 bg-info-100 text-info-700'
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
