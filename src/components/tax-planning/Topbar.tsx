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
    <header className="h-16 bg-white border-b border-limestone-200 shadow-xs flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: Breadcrumbs and/or title */}
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;

              return (
                <React.Fragment key={`${crumb.label}-${idx}`}>
                  {idx > 0 && (
                    <span className="text-charcoal-300" aria-hidden="true">
                      /
                    </span>
                  )}
                  {isLast ? (
                    <span className="text-sm font-semibold text-charcoal-900">
                      {crumb.label}
                    </span>
                  ) : crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-sm text-charcoal-500 hover:text-brand-700 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-sm text-charcoal-500">{crumb.label}</span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        ) : (
          <h2 className="text-sm font-semibold text-charcoal-900 truncate">
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
