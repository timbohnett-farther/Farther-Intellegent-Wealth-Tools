'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import { Receipt, Plus, CreditCard } from 'lucide-react';

export default function ExpensesPage() {
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
              <Receipt size={20} className="text-brand-500" />
              <h1 className="text-xl font-bold text-gray-900">Expenses</h1>
            </div>
            <p className="text-sm text-gray-500">
              Track living expenses, insurance premiums, debt payments, and one-time costs.
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
            <Plus size={16} />
            Add Expense
          </button>
        </div>

        {/* Empty state */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <CreditCard size={24} className="text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">No expenses added yet</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              No expenses added yet. Click + Add Expense to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
