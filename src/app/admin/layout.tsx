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
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from '@/components/ThemeToggle';

const ADMIN_NAV = [
  { label: 'Firm Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Advisors', href: '/admin/advisors', icon: Users },
  { label: 'Integrations', href: '/admin/integrations', icon: Plug },
  { label: 'Tax Tables', href: '/admin/tax-tables', icon: FileSpreadsheet },
  { label: 'Templates', href: '/admin/templates', icon: Copy },
  { label: 'Compliance', href: '/admin/compliance', icon: Shield },
  { label: 'Update Engine', href: '/admin/update-engine', icon: RefreshCw },
  { label: 'Billing', href: '/admin/billing', icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-transparent">
      {/* Top nav */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'var(--s-sidebar-bg)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--s-border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link href="/prism/dashboard" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors">
              <ArrowLeft size={14} /> Back to Prism
            </Link>
            <div className="w-px h-6" style={{ background: 'var(--s-border-strong)' }} />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-linear-to-br from-brand-500 to-brand-300 flex items-center justify-center">
                <span className="text-text-onBrand font-bold text-xs">FP</span>
              </div>
              <span className="font-semibold text-sm text-text">Admin Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-xs text-text-muted">Farther Wealth Management</span>
          </div>
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
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    isActive
                      ? 'border-accent-primarySoft text-text'
                      : 'border-transparent text-text-muted hover:text-text-subtle'
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
