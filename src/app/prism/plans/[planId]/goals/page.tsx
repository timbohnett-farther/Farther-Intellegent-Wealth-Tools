'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import { Target, Plus, Flag } from 'lucide-react';

export default function GoalsPage() {
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
              <Target size={20} className="text-brand-500" />
              <h1 className="text-xl font-bold text-charcoal-900">Goals</h1>
            </div>
            <p className="text-sm text-charcoal-500">
              Define retirement, education, legacy, and other financial goals.
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
            <Plus size={16} />
            Add Goal
          </button>
        </div>

        {/* Empty state */}
        <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-4">
              <Flag size={24} className="text-brand-700" />
            </div>
            <h3 className="text-sm font-semibold text-charcoal-900 mb-1">No goals defined yet</h3>
            <p className="text-sm text-charcoal-500 max-w-sm">
              No goals defined yet. Click + Add Goal to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
