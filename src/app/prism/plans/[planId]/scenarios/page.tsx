'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import { GitBranch, Plus, Layers } from 'lucide-react';

export default function ScenariosPage() {
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
              <GitBranch size={20} className="text-brand-500" />
              <h1 className="text-xl font-bold text-charcoal-900">Scenarios</h1>
            </div>
            <p className="text-sm text-charcoal-500">
              Compare what-if scenarios side by side.
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
            <Plus size={16} />
            Create Scenario
          </button>
        </div>

        {/* Empty state */}
        <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center mb-4">
              <Layers size={24} className="text-cyan-400" />
            </div>
            <h3 className="text-sm font-semibold text-charcoal-900 mb-1">No scenarios created yet</h3>
            <p className="text-sm text-charcoal-500 max-w-sm">
              No scenarios created yet. Click + Create Scenario to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
