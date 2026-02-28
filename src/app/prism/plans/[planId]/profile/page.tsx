'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import { User, ClipboardList } from 'lucide-react';

export default function ProfilePage() {
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
              <User size={20} className="text-brand-500" />
              <h1 className="text-xl font-bold text-gray-900">Client Profile</h1>
            </div>
            <p className="text-sm text-gray-500">
              Manage personal details, contact information, and planning preferences.
            </p>
          </div>
        </div>

        {/* Profile info placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-4">
              <ClipboardList size={24} className="text-brand-400" />
            </div>
            <p className="text-sm text-gray-500">
              Client profile form is available in the data entry section.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
