'use client';

import React from 'react';
import { Divider as TremorDivider } from '@/components/ui/Divider';
import { cn } from '@/lib/utils/cn';

export interface DividerProps {
  /** Optional label displayed in the center of the divider */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className }) => {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)} role="separator">
        <TremorDivider className="flex-1" />
        <span className="text-xs font-medium text-white/30 uppercase tracking-wider">
          {label}
        </span>
        <TremorDivider className="flex-1" />
      </div>
    );
  }

  return <TremorDivider className={className} />;
};

Divider.displayName = 'Divider';
