'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import { Settings, SlidersHorizontal } from 'lucide-react';

export default function SettingsPage() {
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
              <Settings size={20} className="text-teal-300" />
              <h1 className="text-xl font-bold text-white">Plan Settings</h1>
            </div>
            <p className="text-sm text-white/50">
              Configure plan assumptions, time horizon, and return assumptions.
            </p>
          </div>
        </div>

        {/* Plan assumptions placeholder */}
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-6">
            <SlidersHorizontal size={18} className="text-white/30" />
            <h3 className="font-semibold text-white">Plan Assumptions</h3>
          </div>

          <div className="space-y-6">
            {/* Time Horizon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Planning Horizon</label>
                <div className="h-10 rounded-lg border border-white/[0.06] bg-transparent px-3 flex items-center text-sm text-white/30">
                  Through age 95
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Plan Start Year</label>
                <div className="h-10 rounded-lg border border-white/[0.06] bg-transparent px-3 flex items-center text-sm text-white/30">
                  2026
                </div>
              </div>
            </div>

            {/* Return Assumptions */}
            <div>
              <h4 className="text-sm font-medium text-white/60 mb-3">Return Assumptions</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Inflation Rate</label>
                  <div className="h-10 rounded-lg border border-white/[0.06] bg-transparent px-3 flex items-center text-sm text-white/30">
                    2.5%
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Pre-Retirement Return</label>
                  <div className="h-10 rounded-lg border border-white/[0.06] bg-transparent px-3 flex items-center text-sm text-white/30">
                    7.0%
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Post-Retirement Return</label>
                  <div className="h-10 rounded-lg border border-white/[0.06] bg-transparent px-3 flex items-center text-sm text-white/30">
                    5.5%
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Assumptions */}
            <div>
              <h4 className="text-sm font-medium text-white/60 mb-3">Tax Assumptions</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1">State of Residence</label>
                  <div className="h-10 rounded-lg border border-white/[0.06] bg-transparent px-3 flex items-center text-sm text-white/30">
                    California
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Filing Status</label>
                  <div className="h-10 rounded-lg border border-white/[0.06] bg-transparent px-3 flex items-center text-sm text-white/30">
                    Married Filing Jointly
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Placeholder note */}
          <div className="mt-6 pt-4 border-t border-limestone-100">
            <p className="text-xs text-white/30 text-center">
              Plan assumptions form will be interactive in Stage 2. Values shown are defaults.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
