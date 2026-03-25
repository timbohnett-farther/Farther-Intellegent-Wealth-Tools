'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  CreditCard,
  Home,
  BarChart3,
} from 'lucide-react';

// ── Mock Data ──────────────────────────────────────────────────────
const NET_WORTH_HISTORY = [
  { month: 'Sep 2025', value: 3_100_000 },
  { month: 'Oct 2025', value: 3_180_000 },
  { month: 'Nov 2025', value: 3_250_000 },
  { month: 'Dec 2025', value: 3_320_000 },
  { month: 'Jan 2026', value: 3_380_000 },
  { month: 'Feb 2026', value: 3_450_000 },
];

const ACCOUNTS = [
  { id: '1', name: 'Joint Brokerage', institution: 'Fidelity', type: 'Taxable', balance: 980_000, taxBucket: 'taxable' },
  { id: '2', name: '401(k) — Sarah', institution: 'Vanguard', type: '401(k)', balance: 1_250_000, taxBucket: 'tax_deferred' },
  { id: '3', name: 'Roth IRA — Sarah', institution: 'Schwab', type: 'Roth IRA', balance: 320_000, taxBucket: 'tax_free' },
  { id: '4', name: '401(k) — Michael', institution: 'Fidelity', type: '401(k)', balance: 650_000, taxBucket: 'tax_deferred' },
  { id: '5', name: 'Savings Account', institution: 'Chase', type: 'Savings', balance: 150_000, taxBucket: 'taxable' },
  { id: '6', name: '529 — Emma', institution: 'NY Direct', type: '529', balance: 145_000, taxBucket: 'tax_free' },
  { id: '7', name: 'Mortgage', institution: 'Wells Fargo', type: 'Mortgage', balance: -380_000, taxBucket: 'liability' },
  { id: '8', name: 'Auto Loan', institution: 'Capital One', type: 'Auto Loan', balance: -22_000, taxBucket: 'liability' },
];

const ALLOCATION = [
  { label: 'US Equities', pct: 42, color: '#4E7082' },
  { label: 'International Equities', pct: 18, color: '#0EA5E9' },
  { label: 'Fixed Income', pct: 22, color: '#22c55e' },
  { label: 'Real Estate', pct: 8, color: '#f59e0b' },
  { label: 'Alternatives', pct: 5, color: '#7B68EE' },
  { label: 'Cash', pct: 5, color: '#7A7265' },
];

// ── Helpers ────────────────────────────────────────────────────────
function formatCurrency(n: number) {
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return n < 0 ? `(${formatted})` : formatted;
}

function bucketLabel(bucket: string) {
  switch (bucket) {
    case 'taxable': return 'Taxable';
    case 'tax_deferred': return 'Tax-Deferred';
    case 'tax_free': return 'Tax-Free';
    case 'liability': return 'Liability';
    default: return bucket;
  }
}

function bucketColor(bucket: string) {
  switch (bucket) {
    case 'taxable': return 'bg-taxable/10 text-taxable';
    case 'tax_deferred': return 'bg-tax-deferred/10 text-tax-deferred';
    case 'tax_free': return 'bg-tax-free/10 text-tax-free';
    case 'liability': return 'bg-critical-50 text-critical-500';
    default: return 'bg-white/[0.06] text-white/50';
  }
}

// ── Simple Bar Chart ───────────────────────────────────────────────
function NetWorthChart({ data }: { data: typeof NET_WORTH_HISTORY }) {
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value)) * 0.95;
  const range = max - min;

  return (
    <div className="flex items-end gap-3 h-48 px-2">
      {data.map((point, i) => {
        const height = range > 0 ? ((point.value - min) / range) * 100 : 50;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <span className="text-[10px] text-white/50 font-medium">
              {formatCurrency(point.value)}
            </span>
            <div
              className="w-full rounded-t-md bg-teal-500 transition-all"
              style={{ height: `${Math.max(height, 8)}%` }}
            />
            <span className="text-[10px] text-white/30">{point.month.split(' ')[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Allocation Ring ────────────────────────────────────────────────
function AllocationChart({ data }: { data: typeof ALLOCATION }) {
  let cumulative = 0;
  const total = data.reduce((s, d) => s + d.pct, 0);
  const circumference = 2 * Math.PI * 45;

  return (
    <div className="flex items-center gap-8">
      <div className="relative w-36 h-36 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {data.map((slice, i) => {
            const offset = (cumulative / total) * circumference;
            const dash = (slice.pct / total) * circumference;
            cumulative += slice.pct;
            return (
              <circle
                key={i}
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={slice.color}
                strokeWidth="10"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
          })}
        </svg>
      </div>
      <div className="flex flex-col gap-2">
        {data.map((slice, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-white/50">{slice.label}</span>
            <span className="font-semibold text-white ml-auto">{slice.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function ClientFinancesPage() {
  const totalAssets = ACCOUNTS.filter((a) => a.balance > 0).reduce(
    (s, a) => s + a.balance,
    0
  );
  const totalLiabilities = ACCOUNTS.filter((a) => a.balance < 0).reduce(
    (s, a) => s + Math.abs(a.balance),
    0
  );
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">My Finances</h1>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/[0.07] rounded-card border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
            <TrendingUp size={16} className="text-goal-funded" />
            Total Assets
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(totalAssets)}
          </p>
        </div>
        <div className="bg-white/[0.07] rounded-card border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
            <TrendingDown size={16} className="text-goal-at-risk" />
            Total Liabilities
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(totalLiabilities)}
          </p>
        </div>
        <div className="bg-white/[0.07] rounded-card border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
            <BarChart3 size={16} className="text-teal-300" />
            Net Worth
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(netWorth)}
          </p>
        </div>
      </div>

      {/* ── Net Worth Chart ── */}
      <div className="bg-white/[0.07] rounded-card border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Net Worth Trend
        </h2>
        <NetWorthChart data={NET_WORTH_HISTORY} />
      </div>

      {/* ── Accounts ── */}
      <div className="bg-white/[0.07] rounded-card border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-limestone-100">
          <h2 className="text-lg font-semibold text-white">Accounts</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {ACCOUNTS.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                  {account.balance < 0 ? (
                    <CreditCard size={18} className="text-white/30" />
                  ) : account.type.includes('401') ||
                    account.type.includes('IRA') ? (
                    <Landmark size={18} className="text-white/30" />
                  ) : account.type === 'Mortgage' ? (
                    <Home size={18} className="text-white/30" />
                  ) : (
                    <BarChart3 size={18} className="text-white/30" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {account.name}
                  </p>
                  <p className="text-xs text-white/50">
                    {account.institution} &middot; {account.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${bucketColor(account.taxBucket)}`}
                >
                  {bucketLabel(account.taxBucket)}
                </span>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    account.balance < 0 ? 'text-critical-500' : 'text-white'
                  }`}
                >
                  {formatCurrency(account.balance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Asset Allocation ── */}
      <div className="bg-white/[0.07] rounded-card border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold text-white mb-6">
          Asset Allocation
        </h2>
        <AllocationChart data={ALLOCATION} />
      </div>
    </div>
  );
}
