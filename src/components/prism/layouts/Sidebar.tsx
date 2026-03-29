'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from '@/components/ThemeToggle';
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
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col transition-all duration-200 z-40',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
      style={{
        background: 'var(--s-sidebar-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid var(--s-border-subtle)',
      }}
    >
      {/* Sidebar Header */}
      <div
        className="h-16 flex items-center gap-3 px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--s-border-subtle)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #4E7082, #A8CED3)' }}
        >
          <span className="text-text-onBrand font-bold text-sm">FP</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight whitespace-nowrap text-text font-serif">
              Farther Prism
            </h1>
            <p className="text-[10px] text-text-faint">Financial Planning</p>
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
                <span className="text-[10px] font-semibold text-text-faint uppercase tracking-wider">
                  {section.label}
                </span>
              </div>
            )}
            {section.label && collapsed && (
              <div className="my-2 mx-3" style={{ borderTop: '1px solid var(--s-border-subtle)' }} />
            )}

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
                    className={cn(
                      'flex items-center gap-3 h-[44px] px-4 mx-2 rounded-lg text-sm transition-colors relative',
                      isActive
                        ? 'text-text font-semibold'
                        : 'text-text-muted font-medium hover:text-text'
                    )}
                    style={isActive ? {
                      background: 'var(--s-nav-active-bg)',
                      borderLeft: '3px solid var(--s-nav-active-border)',
                      paddingLeft: '13px',
                    } : {}}
                  >
                    <span
                      className={cn(
                        'flex-shrink-0 transition-colors',
                        isActive ? 'text-accent-primarySoft' : 'text-text-faint'
                      )}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge != null && (
                          <span className="bg-critical-500 text-text-onBrand text-[11px] font-bold rounded-full min-w-4.5 h-4.5 flex items-center justify-center px-1">
                            {item.badge}
                          </span>
                        )}
                        {item.children && (
                          <ChevronRight
                            size={14}
                            className={cn(
                              'transition-transform text-text-faint',
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
                          className={cn(
                            'block px-3 py-1.5 text-xs rounded-md transition-colors',
                            pathname === child.href
                              ? 'text-accent-primarySoft font-semibold'
                              : 'text-text-muted hover:text-text'
                          )}
                          style={pathname === child.href ? { background: 'var(--s-nav-active-bg)' } : {}}
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

      {/* Theme Toggle + User */}
      <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--s-border-subtle)' }}>
        {!collapsed && (
          <div className="flex items-center justify-between mb-3">
            <ThemeToggle />
          </div>
        )}
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(78, 112, 130, 0.20)' }}
            >
              <span className="text-accent-primarySoft text-xs font-semibold">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">John Doe</p>
              <p className="text-[10px] text-text-faint truncate">Senior Advisor</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(78, 112, 130, 0.20)' }}
            >
              <span className="text-accent-primarySoft text-xs font-semibold">JD</span>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 text-text-faint hover:text-text-muted transition-colors"
        style={{ borderTop: '1px solid var(--s-border-subtle)' }}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
