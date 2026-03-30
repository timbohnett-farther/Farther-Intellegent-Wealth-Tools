'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

interface PlanNavProps {
  planId: string;
  clientName: string;
  planName: string;
}

const PLAN_TABS = [
  { label: 'Overview', segment: '' },
  { label: 'Profile', segment: '/profile' },
  { label: 'Income', segment: '/income' },
  { label: 'Expenses', segment: '/expenses' },
  { label: 'Net Worth', segment: '/net-worth' },
  { label: 'Goals', segment: '/goals' },
  { label: 'Retirement', segment: '/retirement' },
  { label: 'Tax', segment: '/tax' },
  { label: 'Social Security', segment: '/social-security' },
  { label: 'Medicare', segment: '/medicare' },
  { label: 'Insurance', segment: '/insurance' },
  { label: 'Education', segment: '/education' },
  { label: 'Estate', segment: '/estate' },
  { label: 'Business', segment: '/business' },
  { label: 'Equity Comp', segment: '/equity-comp' },
  { label: 'Alternatives', segment: '/alternatives' },
  { label: 'Charitable', segment: '/charitable' },
  { label: 'Reports', segment: '/reports' },
  { label: 'Scenarios', segment: '/scenarios' },
  { label: 'Settings', segment: '/settings' },
];

export function PlanNav({ planId, clientName, planName }: PlanNavProps) {
  const pathname = usePathname();
  const basePath = `/prism/plans/${planId}`;

  return (
    <div
      className="sticky top-16 z-20"
      style={{
        background: 'var(--s-surface-soft)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '2px solid var(--s-border-subtle)',
      }}
    >
      {/* Plan header */}
      <div className="px-7 pt-3 pb-2 flex items-center gap-2 text-sm">
        <Link href="/prism/clients" className="text-text-muted hover:text-accent-primarySoft transition-colors">
          Clients
        </Link>
        <span className="text-text-faint">/</span>
        <span className="font-semibold text-text">{clientName}</span>
        <span className="text-text-faint">&mdash;</span>
        <span className="text-text-muted">{planName}</span>
      </div>

      {/* Tab navigation */}
      <div className="px-7 overflow-x-auto scrollbar-none">
        <nav className="flex gap-0 min-w-max">
          {PLAN_TABS.map((tab) => {
            const href = basePath + tab.segment;
            const isActive = tab.segment === ''
              ? pathname === basePath || pathname === basePath + '/'
              : pathname.startsWith(href);

            return (
              <Link
                key={tab.segment}
                href={href}
                className={cn(
                  'px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-accent-primary text-accent-primarySoft font-bold'
                    : 'border-transparent text-text-muted hover:text-text hover:border-border-strong'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
