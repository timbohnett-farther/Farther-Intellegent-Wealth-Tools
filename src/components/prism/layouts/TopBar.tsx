'use client';

import React from 'react';
import { Search, Bell, Plus } from 'lucide-react';

interface TopBarProps {
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function TopBar({ title, breadcrumbs }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-limestone-200 shadow-xs flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: Breadcrumb / Title */}
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.label}>
                  {idx > 0 && (
                    <span className="text-charcoal-300">/</span>
                  )}
                  {isLast ? (
                    <span className="text-sm font-semibold text-charcoal-900">
                      {crumb.label}
                    </span>
                  ) : (
                    <a
                      href={crumb.href || '#'}
                      className="text-sm text-charcoal-500 hover:text-brand-700 transition-colors"
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
            <h2 className="text-sm font-semibold text-charcoal-900">{title}</h2>
          )
        )}
      </div>

      {/* Right: Search, Notification, New Plan, Avatar */}
      <div className="flex items-center gap-3">
        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-300" />
          <input
            type="text"
            placeholder="Search clients, plans..."
            className="w-[280px] h-9 pl-9 pr-4 text-sm bg-limestone-50 border border-limestone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-charcoal-900 placeholder:text-charcoal-300"
          />
        </div>

        {/* Notification bell */}
        <button className="relative p-2 rounded-md hover:bg-limestone-50 transition-colors">
          <Bell size={20} className="text-charcoal-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-critical-500 rounded-full" />
        </button>

        {/* + New Plan button */}
        <button className="flex items-center gap-1.5 h-9 px-4 bg-brand-700 text-white rounded-md text-sm font-semibold hover:bg-brand-800 transition-colors">
          <Plus size={16} />
          <span>New Plan</span>
        </button>

        {/* Advisor avatar */}
        <div className="flex items-center gap-2 pl-3 border-l border-limestone-200">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-brand-700 text-xs font-semibold">JD</span>
          </div>
        </div>
      </div>
    </header>
  );
}
