'use client';

import React from 'react';
import { Search, Bell, Plus } from 'lucide-react';

interface TopBarProps {
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function TopBar({ title, breadcrumbs }: TopBarProps) {
  return (
    <header
      className="h-16 flex items-center justify-between px-6 sticky top-0 z-30"
      style={{
        background: 'var(--s-topbar-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--s-border-subtle)',
      }}
    >
      {/* Left: Breadcrumb / Title */}
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.label}>
                  {idx > 0 && (
                    <span className="text-text-faint">/</span>
                  )}
                  {isLast ? (
                    <span className="text-sm font-semibold text-text">
                      {crumb.label}
                    </span>
                  ) : (
                    <a
                      href={crumb.href || '#'}
                      className="text-sm text-text-muted hover:text-accent-primarySoft transition-colors"
                    >
                      {crumb.label}
                    </a>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        ) : (
          title && (
            <h2 className="text-sm font-semibold text-text">{title}</h2>
          )
        )}
      </div>

      {/* Right: Search, Notification, New Plan, Avatar */}
      <div className="flex items-center gap-3">
        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            type="text"
            placeholder="Search clients, plans..."
            className="input-field w-[280px] h-9 pl-9 pr-4"
          />
        </div>

        {/* Notification bell */}
        <button
          className="relative p-2 rounded-md transition-colors"
          style={{ color: 'var(--s-text-muted)' }}
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-critical-500 rounded-full" />
        </button>

        {/* + New Plan button */}
        <button className="btn btn-primary btn-sm flex items-center gap-1.5">
          <Plus size={16} />
          <span>New Plan</span>
        </button>

        {/* Advisor avatar */}
        <div className="flex items-center gap-2 pl-3" style={{ borderLeft: '1px solid var(--s-border-subtle)' }}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(78, 112, 130, 0.20)' }}
          >
            <span className="text-accent-primarySoft text-xs font-semibold">JD</span>
          </div>
        </div>
      </div>
    </header>
  );
}
