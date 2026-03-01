'use client';

import React from 'react';
import clsx from 'clsx';

export interface DividerProps {
  /** Optional label displayed in the center of the divider */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className }) => {
  if (label) {
    return (
      <div className={clsx('flex items-center gap-3', className)} role="separator">
        <div className="h-px flex-1 bg-limestone-200" />
        <span className="text-xs font-medium text-charcoal-300 uppercase tracking-wider">
          {label}
        </span>
        <div className="h-px flex-1 bg-limestone-200" />
      </div>
    );
  }

  return (
    <hr
      className={clsx('h-px border-0 bg-limestone-200', className)}
    />
  );
};

Divider.displayName = 'Divider';
