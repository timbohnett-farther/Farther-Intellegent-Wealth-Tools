'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Building2,
  Lightbulb,
  Copy,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/prism/dashboard', icon: <LayoutDashboard size={20} /> },
  {
    label: 'Clients',
    href: '/prism/clients',
    icon: <Users size={20} />,
    children: [
      { label: 'All Clients', href: '/prism/clients' },
      { label: '+ New Client', href: '/prism/clients?new=true' },
    ],
  },
  {
    label: 'Plans',
    href: '/prism/plans',
    icon: <FileText size={20} />,
    children: [
      { label: 'Active Plans', href: '/prism/plans?status=active' },
      { label: 'Drafts', href: '/prism/plans?status=draft' },
      { label: 'Archived', href: '/prism/plans?status=archived' },
    ],
  },
  { label: 'Reports', href: '/prism/reports', icon: <BarChart3 size={20} /> },
  { label: 'Tax Center', href: '/prism/tax-center', icon: <Building2 size={20} /> },
  { label: 'Insights', href: '/prism/insights', icon: <Lightbulb size={20} /> },
  { label: 'Templates', href: '/prism/templates', icon: <Copy size={20} /> },
  { label: 'Settings', href: '/prism/settings', icon: <Settings size={20} /> },
  { label: 'Admin', href: '/admin', icon: <Settings size={20} /> },
  { label: 'Help', href: '/prism/help', icon: <HelpCircle size={20} /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-brand-900 text-white flex flex-col transition-all duration-200 z-40',
        collapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">FP</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight whitespace-nowrap">Farther Prism</h1>
            <p className="text-[10px] text-white/50">Financial Planning</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isExpanded = expandedItem === item.label;

          return (
            <div key={item.label}>
              <Link
                href={item.href}
                onClick={(e) => {
                  if (item.children && !collapsed) {
                    e.preventDefault();
                    setExpandedItem(isExpanded ? null : item.label);
                  }
                }}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.children && (
                      <ChevronRight
                        size={14}
                        className={clsx('transition-transform', isExpanded && 'rotate-90')}
                      />
                    )}
                  </>
                )}
              </Link>

              {/* Submenu */}
              {item.children && isExpanded && !collapsed && (
                <div className="ml-11 mt-0.5 mb-1 space-y-0.5">
                  {item.children.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      className={clsx(
                        'block px-3 py-1.5 text-xs rounded-md transition-colors',
                        pathname === child.href
                          ? 'text-white bg-white/10'
                          : 'text-white/50 hover:text-white/80'
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-white/10 text-white/40 hover:text-white/70 transition-colors"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
