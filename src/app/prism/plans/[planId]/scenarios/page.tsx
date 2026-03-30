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
              <GitBranch size={20} className="text-accent-primarySoft" />
              <h1 className="text-xl font-bold text-text">Scenarios</h1>
            </div>
            <p className="text-sm text-text-muted">
              Compare what-if scenarios side by side.
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent-primary text-text rounded-lg hover:bg-accent-primary/80 transition-colors">
            <Plus size={16} />
            Create Scenario
          </button>
        </div>

        {/* Empty state */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center mb-4">
              <Layers size={24} className="text-cyan-400" />
            </div>
            <h3 className="text-sm font-semibold text-text mb-1">No scenarios created yet</h3>
            <p className="text-sm text-text-muted max-w-sm">
              No scenarios created yet. Click + Create Scenario to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
