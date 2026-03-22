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
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
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
                    <span className="text-white/20">/</span>
                  )}
                  {isLast ? (
                    <span className="text-sm font-semibold text-white">
                      {crumb.label}
                    </span>
                  ) : (
                    <a
                      href={crumb.href || '#'}
                      className="text-sm text-white/50 hover:text-teal-300 transition-colors"
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
            <h2 className="text-sm font-semibold text-white">{title}</h2>
          )
        )}
      </div>

      {/* Right: Search, Notification, New Plan, Avatar */}
      <div className="flex items-center gap-3">
        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search clients, plans..."
            className="w-[280px] h-9 pl-9 pr-4 text-sm rounded-md text-white placeholder:text-white/30 focus:outline-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          />
        </div>

        {/* Notification bell */}
        <button className="relative p-2 rounded-md hover:bg-white/[0.04] transition-colors">
          <Bell size={20} className="text-white/50" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-critical-500 rounded-full" />
        </button>

        {/* + New Plan button */}
        <button
          className="flex items-center gap-1.5 h-9 px-4 text-white rounded-md text-sm font-semibold transition-colors"
          style={{ background: 'linear-gradient(135deg, #1d7682, #186068)' }}
        >
          <Plus size={16} />
          <span>New Plan</span>
        </button>

        {/* Advisor avatar */}
        <div className="flex items-center gap-2 pl-3" style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(29, 118, 130, 0.20)' }}
          >
            <span className="text-teal-300 text-xs font-semibold">JD</span>
          </div>
        </div>
      </div>
    </header>
  );
}
