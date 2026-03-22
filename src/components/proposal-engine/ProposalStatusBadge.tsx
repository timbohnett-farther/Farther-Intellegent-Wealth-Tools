'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import type { ProposalStatus } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProposalStatusBadgeProps {
  /** The current proposal status. */
  status: ProposalStatus;
}

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

interface StatusConfig {
  label: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
}

const STATUS_MAP: Record<ProposalStatus, StatusConfig> = {
  DRAFT: {
    label: 'Draft',
    bgClass: 'bg-white/[0.04]',
    textClass: 'text-white/60',
    dotClass: 'bg-charcoal-400',
  },
  READY: {
    label: 'Ready',
    bgClass: 'bg-info-100',
    textClass: 'text-info-700',
    dotClass: 'bg-info-500',
  },
  REVIEW: {
    label: 'In Review',
    bgClass: 'bg-info-100',
    textClass: 'text-info-700',
    dotClass: 'bg-info-500',
  },
  APPROVED: {
    label: 'Approved',
    bgClass: 'bg-info-100',
    textClass: 'text-info-700',
    dotClass: 'bg-info-500',
  },
  SENT: {
    label: 'Sent',
    bgClass: 'bg-teal-500/15',
    textClass: 'text-teal-300',
    dotClass: 'bg-teal-500',
  },
  VIEWED: {
    label: 'Viewed',
    bgClass: 'bg-warning-100',
    textClass: 'text-warning-700',
    dotClass: 'bg-warning-500',
  },
  ACCEPTED: {
    label: 'Accepted',
    bgClass: 'bg-success-100',
    textClass: 'text-success-700',
    dotClass: 'bg-success-500',
  },
  DECLINED: {
    label: 'Declined',
    bgClass: 'bg-critical-100',
    textClass: 'text-critical-700',
    dotClass: 'bg-critical-500',
  },
  EXPIRED: {
    label: 'Expired',
    bgClass: 'bg-white/[0.04]',
    textClass: 'text-white/50',
    dotClass: 'bg-white/20',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposalStatusBadge({ status }: ProposalStatusBadgeProps) {
  const config = STATUS_MAP[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5',
        'text-[11px] font-bold uppercase tracking-wide',
        config.bgClass,
        config.textClass,
      )}
    >
      <span
        className={cn('inline-block h-1.5 w-1.5 rounded-full', config.dotClass)}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

ProposalStatusBadge.displayName = 'ProposalStatusBadge';
