'use client';

import React from 'react';
import Link from 'next/link';

export interface TopbarProps {
  /** Page title */
  title: string;
  /** Optional breadcrumb trail */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Optional actions slot rendered on the right side */
  actions?: React.ReactNode;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  breadcrumbs,
  actions,
}) => {
  return (
    <header className="h-16 bg-surface-soft border-b border-border-subtle backdrop-blur-xl shadow-xs flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: Breadcrumbs and/or title */}
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;

              return (
                <React.Fragment key={`${crumb.label}-${idx}`}>
                  {idx > 0 && (
                    <span className="text-text-faint" aria-hidden="true">
                      /
                    </span>
                  )}
                  {isLast ? (
                    <span className="text-sm font-semibold text-text">
                      {crumb.label}
                    </span>
                  ) : crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-sm text-text-muted hover:text-accent-primarySoft transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-sm text-text-muted">{crumb.label}</span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        ) : (
          <h2 className="text-sm font-semibold text-text truncate">
            {title}
          </h2>
        )}
      </div>

      {/* Right: Actions slot */}
      {actions && (
        <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>
      )}
    </header>
  );
};

Topbar.displayName = 'Topbar';
