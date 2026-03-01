'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

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
    <div className="bg-white border-b border-gray-200 sticky top-14 z-20">
      {/* Plan header */}
      <div className="px-6 pt-3 pb-2 flex items-center gap-2 text-sm">
        <Link href="/prism/clients" className="text-gray-500 hover:text-brand-500">
          Clients
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-gray-900">{clientName}</span>
        <span className="text-gray-300">—</span>
        <span className="text-gray-600">{planName}</span>
      </div>

      {/* Tab navigation */}
      <div className="px-6 overflow-x-auto scrollbar-none">
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
                className={clsx(
                  'px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
