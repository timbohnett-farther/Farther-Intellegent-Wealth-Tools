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
  badge?: number;
  section?: string;
  children?: { label: string; href: string }[];
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: '',
    items: [
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
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Templates', href: '/prism/templates', icon: <Copy size={20} /> },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/prism/settings', icon: <Settings size={20} /> },
      { label: 'Admin', href: '/admin', icon: <Settings size={20} /> },
      { label: 'Help', href: '/prism/help', icon: <HelpCircle size={20} /> },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-white border-r border-limestone-200 flex flex-col transition-all duration-200 z-40',
        collapsed ? 'w-[64px]' : 'w-[240px]'
      )}
    >
      {/* Sidebar Header — 64px, border-bottom limestone-200, logo FP in brand-700 */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-limestone-200 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">FP</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight whitespace-nowrap text-charcoal-900">
              Farther Prism
            </h1>
            <p className="text-[10px] text-charcoal-300">Financial Planning</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_SECTIONS.map((section, sectionIdx) => (
          <div key={section.label || sectionIdx}>
            {/* Section label */}
            {section.label && !collapsed && (
              <div className="px-4 pt-4 pb-1.5">
                <span className="text-[10px] font-semibold text-charcoal-300 uppercase tracking-wider">
                  {section.label}
                </span>
              </div>
            )}
            {section.label && collapsed && <div className="my-2 mx-3 border-t border-limestone-200" />}

            {section.items.map((item) => {
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
                      'flex items-center gap-3 h-[44px] px-4 mx-2 rounded-lg text-sm transition-colors relative',
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold border-l-[3px] border-brand-700 pl-[13px]'
                        : 'text-charcoal-700 font-medium hover:bg-limestone-50 hover:text-charcoal-900'
                    )}
                  >
                    <span
                      className={clsx(
                        'flex-shrink-0 transition-colors',
                        isActive
                          ? 'text-brand-700'
                          : 'text-charcoal-500 group-hover:text-brand-700'
                      )}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge != null && (
                          <span className="bg-critical-500 text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {item.badge}
                          </span>
                        )}
                        {item.children && (
                          <ChevronRight
                            size={14}
                            className={clsx(
                              'transition-transform text-charcoal-300',
                              isExpanded && 'rotate-90'
                            )}
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
                              ? 'text-brand-700 bg-brand-50 font-semibold'
                              : 'text-charcoal-500 hover:text-charcoal-900 hover:bg-limestone-50'
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
          </div>
        ))}
      </nav>

      {/* Sidebar Footer — border-top limestone-200, avatar 32px circle brand-100 bg */}
      <div className="border-t border-limestone-200 px-3 py-3 flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-700 text-xs font-semibold">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-charcoal-900 truncate">John Doe</p>
              <p className="text-[10px] text-charcoal-500 truncate">Senior Advisor</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-brand-700 text-xs font-semibold">JD</span>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-limestone-200 text-charcoal-300 hover:text-charcoal-700 transition-colors"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
