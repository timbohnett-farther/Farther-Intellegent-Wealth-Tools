'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import { GraduationCap, Clock } from 'lucide-react';

export default function EducationPage() {
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
              <GraduationCap size={20} className="text-teal-300" />
              <h1 className="text-xl font-bold text-white">Education Planning</h1>
            </div>
            <p className="text-sm text-white/50">
              Plan for education costs including 529 plans and financial aid strategies.
            </p>
          </div>
        </div>

        {/* Stage 3 placeholder */}
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <Clock size={24} className="text-orange-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Coming in Stage 3</h3>
            <p className="text-sm text-white/50 max-w-sm">
              Education planning will be available in Stage 3.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
