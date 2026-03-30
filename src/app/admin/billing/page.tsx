'use client';

import React from 'react';
import { CreditCard, TrendingUp, Users, FileText, Zap, CheckCircle2 } from 'lucide-react';

const PLAN_INFO = {
  tier: 'Enterprise',
  price: '$2,499/month',
  billingCycle: 'Annual (20% discount)',
  nextBilling: 'April 1, 2026',
  clients: { used: 284, limit: 500 },
  plans: { used: 312, limit: 'Unlimited' },
  advisors: { used: 12, limit: 25 },
  reports: { used: 156, limit: 'Unlimited' },
  apiCalls: { used: 48_250, limit: 100_000 },
  aiInsights: { used: 1_842, limit: 5_000 },
};

const BILLING_HISTORY = [
  { date: 'Mar 1, 2026', amount: '$2,499.00', status: 'paid', invoice: 'INV-2026-003' },
  { date: 'Feb 1, 2026', amount: '$2,499.00', status: 'paid', invoice: 'INV-2026-002' },
  { date: 'Jan 1, 2026', amount: '$2,499.00', status: 'paid', invoice: 'INV-2026-001' },
  { date: 'Dec 1, 2025', amount: '$2,499.00', status: 'paid', invoice: 'INV-2025-012' },
  { date: 'Nov 1, 2025', amount: '$2,499.00', status: 'paid', invoice: 'INV-2025-011' },
];

const FEATURES = [
  'Unlimited plans & reports',
  'AI insights engine (5,000/month)',
  'HubSpot CRM integration',
  'Custodian data feeds (4 custodians)',
  'Client portal',
  'Workflow automation',
  'Compliance & audit tools',
  'Priority support',
  '25 advisor seats',
  'API access (100K calls/month)',
];

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Current plan */}
        <div className="bg-surface-soft rounded-xl border border-brand-200 shadow-sm p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-text">{PLAN_INFO.tier} Plan</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primarySoft">Current</span>
              </div>
              <p className="text-sm text-text-muted mt-0.5">{PLAN_INFO.price} &middot; {PLAN_INFO.billingCycle}</p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-accent-primarySoft bg-accent-primary/10 rounded-lg hover:bg-accent-primary/15">Manage Plan</button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Clients', used: PLAN_INFO.clients.used, limit: PLAN_INFO.clients.limit, icon: Users },
              { label: 'Advisors', used: PLAN_INFO.advisors.used, limit: PLAN_INFO.advisors.limit, icon: Users },
              { label: 'API Calls', used: PLAN_INFO.apiCalls.used, limit: PLAN_INFO.apiCalls.limit, icon: Zap },
              { label: 'AI Insights', used: PLAN_INFO.aiInsights.used, limit: PLAN_INFO.aiInsights.limit, icon: Zap },
              { label: 'Plans', used: PLAN_INFO.plans.used, limit: PLAN_INFO.plans.limit, icon: FileText },
              { label: 'Reports', used: PLAN_INFO.reports.used, limit: PLAN_INFO.reports.limit, icon: FileText },
            ].map((u) => {
              const Icon = u.icon;
              const pct = typeof u.limit === 'number' ? (u.used / u.limit) * 100 : 0;
              return (
                <div key={u.label} className="p-3 rounded-lg bg-transparent">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text-muted">{u.label}</span>
                    <Icon size={12} className="text-text-faint" />
                  </div>
                  <p className="text-sm font-bold text-text">
                    {u.used.toLocaleString()} <span className="text-text-faint font-normal">/ {typeof u.limit === 'number' ? u.limit.toLocaleString() : u.limit}</span>
                  </p>
                  {typeof u.limit === 'number' && (
                    <div className="w-full h-1.5 bg-surface-subtle rounded-full mt-1.5">
                      <div className={`h-full rounded-full ${pct > 90 ? 'bg-critical-500' : pct > 70 ? 'bg-warning-500' : 'bg-accent-primary'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Features */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5">
          <h3 className="text-sm font-semibold text-text mb-3">Included Features</h3>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-text-muted">
                <CheckCircle2 size={14} className="text-success-500 flex-shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Billing history */}
      <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm">
        <div className="px-5 py-4 border-b border-limestone-100">
          <h3 className="text-sm font-semibold text-text">Billing History</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-100 text-left">
              <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase">Date</th>
              <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase">Invoice</th>
              <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase text-right">Amount</th>
              <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {BILLING_HISTORY.map((b) => (
              <tr key={b.invoice} className="border-b border-limestone-50 hover:bg-surface-subtle/50">
                <td className="px-5 py-3 text-text-muted">{b.date}</td>
                <td className="px-5 py-3 text-accent-primarySoft font-medium">{b.invoice}</td>
                <td className="px-5 py-3 text-text text-right font-medium">{b.amount}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-success-50 text-success-700">
                    <CheckCircle2 size={10} /> Paid
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-faint text-center">Next billing date: {PLAN_INFO.nextBilling} &middot; Contact support@farther.com for billing inquiries</p>
    </div>
  );
}
