'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import { ShieldCheck, Clock } from 'lucide-react';

export default function SocialSecurityPage() {
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
              <ShieldCheck size={20} className="text-brand-500" />
              <h1 className="text-xl font-bold text-gray-900">Social Security</h1>
            </div>
            <p className="text-sm text-gray-500">
              Optimize Social Security claiming strategies for maximum lifetime benefits.
            </p>
          </div>
        </div>

        {/* Stage 2 placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <Clock size={24} className="text-orange-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Coming in Stage 2</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Social Security analysis will be available after plan data is entered (Stage 2).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
