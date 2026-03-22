'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import { HeartPulse, Clock } from 'lucide-react';

export default function MedicarePage() {
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
              <HeartPulse size={20} className="text-brand-500" />
              <h1 className="text-xl font-bold text-charcoal-900">Medicare</h1>
            </div>
            <p className="text-sm text-charcoal-500">
              Plan for Medicare costs including Part B, Part D, and IRMAA surcharges.
            </p>
          </div>
        </div>

        {/* Stage 2 placeholder */}
        <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <Clock size={24} className="text-orange-400" />
            </div>
            <h3 className="text-sm font-semibold text-charcoal-900 mb-1">Coming in Stage 2</h3>
            <p className="text-sm text-charcoal-500 max-w-sm">
              Medicare planning will be available after plan data is entered (Stage 2).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
