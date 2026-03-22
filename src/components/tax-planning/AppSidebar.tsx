'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { LayoutDashboard, Users, Shield } from 'lucide-react';
import { Badge } from '@/components/prism/atoms/Badge';

export interface AppSidebarProps {
  /** Current URL path for highlighting the active link */
  currentPath: string;
  /** Role of the current user */
  userRole: string;
  /** Display name of the current user */
  userName: string;
}

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredRole?: string;
}

const NAV_LINKS: NavLink[] = [
  {
    label: 'Dashboard',
    href: '/tax-planning',
    icon: <LayoutDashboard size={20} />,
  },
  {
    label: 'Households',
    href: '/tax-planning/households',
    icon: <Users size={20} />,
  },
  {
    label: 'Admin',
    href: '/tax-planning/admin',
    icon: <Shield size={20} />,
    requiredRole: 'ADMIN',
  },
];

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getRoleBadgeVariant(
  role: string
): 'brand' | 'success' | 'info' | 'neutral' {
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return 'brand';
    case 'ADVISOR':
      return 'success';
    case 'PARAPLANNER':
      return 'info';
    default:
      return 'neutral';
  }
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentPath,
  userRole,
  userName,
}) => {
  const visibleLinks = NAV_LINKS.filter(
    (link) => !link.requiredRole || link.requiredRole === userRole.toUpperCase()
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar bg-white/[0.07] backdrop-blur-xl border-r border-white/[0.06] flex flex-col z-40">
      {/* Logo area */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">FT</span>
        </div>
        <div className="overflow-hidden">
          <h1 className="text-sm font-bold tracking-tight whitespace-nowrap text-white">
            Farther Tax Planning
          </h1>
          <p className="text-[10px] text-white/30">Tax Planning Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Main navigation">
        <ul className="space-y-0.5">
          {visibleLinks.map((link) => {
            const isActive =
              currentPath === link.href ||
              (link.href !== '/tax-planning' &&
                currentPath.startsWith(link.href));

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 h-[44px] px-4 mx-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-teal-500/10 text-teal-300 font-semibold border-l-[3px] border-teal-500 pl-[13px]'
                      : 'text-white/60 font-medium hover:bg-white/[0.04] hover:text-white'
                  )}
                >
                  <span
                    className={cn(
                      'flex-shrink-0',
                      isActive ? 'text-teal-300' : 'text-white/50'
                    )}
                  >
                    {link.icon}
                  </span>
                  <span className="flex-1">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info at bottom */}
      <div className="border-t border-white/[0.06] px-3 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-500/15 flex items-center justify-center flex-shrink-0">
            <span className="text-teal-300 text-xs font-semibold">
              {getUserInitials(userName)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userName}
            </p>
            <Badge variant={getRoleBadgeVariant(userRole)} className="mt-0.5">
              {userRole}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
};

AppSidebar.displayName = 'AppSidebar';
