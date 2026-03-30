'use client';

import React from 'react';
import { Pencil, Users, FileText, MapPin } from 'lucide-react';
import { Badge } from '@/components/prism/atoms/Badge';

export interface HouseholdHeaderProps {
  /** Household data */
  household: {
    displayName: string;
    primaryState?: string;
    householdId: string;
  };
  /** Number of people in the household */
  personCount: number;
  /** Number of tax returns */
  returnCount: number;
}

export const HouseholdHeader: React.FC<HouseholdHeaderProps> = ({
  household,
  personCount,
  returnCount,
}) => {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left side: name and details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-text truncate">
              {household.displayName}
            </h1>
            <button
              type="button"
              className="flex-shrink-0 rounded p-1.5 text-text-faint hover:bg-surface-subtle hover:text-accent-primarySoft transition-colors"
              aria-label="Edit household"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {household.primaryState && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-text-faint" />
                <Badge variant="neutral">{household.primaryState}</Badge>
              </div>
            )}

            <span className="text-xs text-text-faint font-mono">
              ID: {household.householdId.slice(0, 8)}...
            </span>
          </div>
        </div>

        {/* Right side: quick stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-accent-primary/10">
              <Users className="h-4 w-4 text-accent-primarySoft" />
            </div>
            <div>
              <p className="text-lg font-bold text-text tabular-nums leading-tight">
                {personCount}
              </p>
              <p className="text-xs text-text-muted">
                {personCount === 1 ? 'Person' : 'People'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-info-100">
              <FileText className="h-4 w-4 text-info-700" />
            </div>
            <div>
              <p className="text-lg font-bold text-text tabular-nums leading-tight">
                {returnCount}
              </p>
              <p className="text-xs text-text-muted">
                {returnCount === 1 ? 'Return' : 'Returns'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

HouseholdHeader.displayName = 'HouseholdHeader';
