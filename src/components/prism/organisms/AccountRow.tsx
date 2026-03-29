'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import {
  Landmark,
  Wallet,
  PiggyBank,
  ShieldCheck,
  Home,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/prism/atoms';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaxBucket = 'taxable' | 'tax_deferred' | 'tax_free' | 'non_financial';

export interface AccountRowProps {
  /** Account display name */
  name: string;
  /** Account type key (from the domain types) */
  accountType: string;
  /** Financial institution name */
  institution: string | null;
  /** Current balance in dollars */
  balance: number;
  /** Tax treatment bucket */
  taxBucket: TaxBucket;
  /** ISO timestamp of last data sync */
  lastSync: string | null;
  /** Integration / data source label */
  dataSource: string;
  /** Click handler for the row */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `(${formatted})` : formatted;
}

function formatAccountType(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Tax bucket badge config
// ---------------------------------------------------------------------------

const TAX_BUCKET_CONFIG: Record<TaxBucket, { label: string; variant: 'warning' | 'brand' | 'info' | 'neutral' }> = {
  taxable: { label: 'Taxable', variant: 'warning' },
  tax_deferred: { label: 'Tax-Deferred', variant: 'brand' },
  tax_free: { label: 'Tax-Free', variant: 'info' },
  non_financial: { label: 'Non-Financial', variant: 'neutral' },
};

// ---------------------------------------------------------------------------
// Account type icon mapping (best-effort heuristic)
// ---------------------------------------------------------------------------

function AccountIcon({ accountType }: { accountType: string }) {
  const t = accountType.toLowerCase();
  if (t.includes('checking') || t.includes('savings') || t.includes('money_market') || t.includes('cd'))
    return <Landmark className="h-4 w-4 text-text-faint" aria-hidden="true" />;
  if (t.includes('brokerage') || t.includes('crypto') || t.includes('hedge') || t.includes('private'))
    return <Wallet className="h-4 w-4 text-text-faint" aria-hidden="true" />;
  if (t.includes('ira') || t.includes('401k') || t.includes('403b') || t.includes('457') || t.includes('pension') || t.includes('roth'))
    return <PiggyBank className="h-4 w-4 text-text-faint" aria-hidden="true" />;
  if (t.includes('insurance') || t.includes('hsa') || t.includes('529'))
    return <ShieldCheck className="h-4 w-4 text-text-faint" aria-hidden="true" />;
  if (t.includes('real_estate') || t.includes('mortgage') || t.includes('heloc'))
    return <Home className="h-4 w-4 text-text-faint" aria-hidden="true" />;
  if (t.includes('credit_card') || t.includes('loan') || t.includes('sbloc') || t.includes('margin'))
    return <CreditCard className="h-4 w-4 text-text-faint" aria-hidden="true" />;
  return <Wallet className="h-4 w-4 text-text-faint" aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountRow({
  name,
  accountType,
  institution,
  balance,
  taxBucket,
  lastSync,
  dataSource,
  onClick,
  className,
}: AccountRowProps) {
  const bucketCfg = TAX_BUCKET_CONFIG[taxBucket];

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl px-4 py-3 transition-colors',
        onClick && 'cursor-pointer hover:bg-surface-subtle',
        className,
      )}
    >
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
        <AccountIcon accountType={accountType} />
      </div>

      {/* Name + institution + type */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{name}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-text-faint">
          <span className="truncate">{formatAccountType(accountType)}</span>
          {institution && (
            <>
              <span aria-hidden="true">&#183;</span>
              <span className="truncate">{institution}</span>
            </>
          )}
        </div>
      </div>

      {/* Tax bucket badge */}
      <Badge variant={bucketCfg.variant} className="shrink-0">
        {bucketCfg.label}
      </Badge>

      {/* Balance */}
      <p
        className={cn(
          'text-sm font-bold tabular-nums shrink-0 w-28 text-right',
          balance < 0 ? 'text-[#ef4444]' : 'text-text',
        )}
      >
        {formatCurrency(balance)}
      </p>

      {/* Sync info */}
      <div className="hidden sm:flex flex-col items-end shrink-0 w-24">
        <span className="text-[10px] text-text-faint truncate">{dataSource}</span>
        {lastSync && (
          <span className="flex items-center gap-1 text-[10px] text-text-faint">
            <RefreshCw className="h-2.5 w-2.5" aria-hidden="true" />
            {relativeTime(lastSync)}
          </span>
        )}
      </div>
    </div>
  );
}

AccountRow.displayName = 'AccountRow';
