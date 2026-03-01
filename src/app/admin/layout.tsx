'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Plug,
  FileSpreadsheet,
  Copy,
  Shield,
  CreditCard,
  ArrowLeft,
} from 'lucide-react';
import clsx from 'clsx';

const ADMIN_NAV = [
  { label: 'Firm Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Advisors', href: '/admin/advisors', icon: Users },
  { label: 'Integrations', href: '/admin/integrations', icon: Plug },
  { label: 'Tax Tables', href: '/admin/tax-tables', icon: FileSpreadsheet },
  { label: 'Templates', href: '/admin/templates', icon: Copy },
  { label: 'Compliance', href: '/admin/compliance', icon: Shield },
  { label: 'Billing', href: '/admin/billing', icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link href="/prism/dashboard" className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
              <ArrowLeft size={14} /> Back to Prism
            </Link>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">FP</span>
              </div>
              <span className="font-semibold text-sm">Admin Portal</span>
            </div>
          </div>
          <span className="text-xs text-white/50">Farther Wealth Management</span>
        </div>
        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    isActive ? 'border-brand-400 text-white' : 'border-transparent text-white/50 hover:text-white/80'
                  )}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
