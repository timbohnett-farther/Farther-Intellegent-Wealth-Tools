'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import { Landmark, Plus, PiggyBank, Building2, TrendingDown } from 'lucide-react';

export default function NetWorthPage() {
  const params = useParams();
  const planId = params.planId as string;

  return (
    <div>
      <PlanNav
        planId={planId}
        clientName="Sarah & Michael Chen"
        planName="Comprehensive Financial Plan"
      />

      <div className="max-w-content mx-auto px-6 py-6">
        {/* Module header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Landmark size={20} className="text-accent-primarySoft" />
              <h1 className="text-xl font-bold text-text">Net Worth & Accounts</h1>
            </div>
            <p className="text-sm text-text-muted">
              Manage investment accounts, real estate, business interests, and liabilities.
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent-primary text-text rounded-lg hover:bg-accent-primary/80 transition-colors">
            <Plus size={16} />
            Add Account
          </button>
        </div>

        {/* Tax Bucket Summary */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-text mb-4">Tax Bucket Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-limestone-100 bg-transparent p-4 text-center">
              <p className="text-xs font-medium text-text-muted mb-1">Taxable</p>
              <p className="text-lg font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>$0</p>
            </div>
            <div className="rounded-lg border border-limestone-100 bg-transparent p-4 text-center">
              <p className="text-xs font-medium text-text-muted mb-1">Tax-Deferred</p>
              <p className="text-lg font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>$0</p>
            </div>
            <div className="rounded-lg border border-limestone-100 bg-transparent p-4 text-center">
              <p className="text-xs font-medium text-text-muted mb-1">Tax-Free</p>
              <p className="text-lg font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>$0</p>
            </div>
          </div>
        </div>

        {/* Asset List */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">Assets</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <PiggyBank size={24} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-text mb-1">No assets added yet</h3>
            <p className="text-sm text-text-muted max-w-sm">
              No assets added yet. Click + Add Account to get started.
            </p>
          </div>
        </div>

        {/* Liability List */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">Liabilities</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-critical-50 flex items-center justify-center mb-4">
              <TrendingDown size={24} className="text-critical-500" />
            </div>
            <h3 className="text-sm font-semibold text-text mb-1">No liabilities added yet</h3>
            <p className="text-sm text-text-muted max-w-sm">
              No liabilities added yet. Click + Add Account to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
