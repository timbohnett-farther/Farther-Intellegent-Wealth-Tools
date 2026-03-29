'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import { Wallet, Plus, DollarSign } from 'lucide-react';

export default function IncomePage() {
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
              <Wallet size={20} className="text-accent-primarySoft" />
              <h1 className="text-xl font-bold text-text">Income Sources</h1>
            </div>
            <p className="text-sm text-text-muted">
              Track all income sources including employment, Social Security, pensions, and rental income.
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent-primary text-text rounded-lg hover:bg-accent-primary/80 transition-colors">
            <Plus size={16} />
            Add Income Source
          </button>
        </div>

        {/* Empty state */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <DollarSign size={24} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-text mb-1">No income sources added yet</h3>
            <p className="text-sm text-text-muted max-w-sm">
              No income sources added yet. Click + Add Income Source to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
