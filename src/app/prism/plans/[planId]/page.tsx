'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import {
  TrendingUp, DollarSign, Landmark, Receipt, Shield,
  CheckCircle2, Circle, AlertCircle, ChevronRight,
  FileText, Edit3, Share2, Download,
} from 'lucide-react';

// Placeholder plan data
const PLAN = {
  id: 'pl1',
  clientName: 'Sarah & Michael Chen',
  planName: 'Comprehensive Financial Plan',
  status: 'active',
  lastUpdated: '2026-02-15',
  completionScore: 88,
  probabilityOfSuccess: 92,
  retirementReady: true,
  retirementDate: '2032',
  totalNetWorth: 12500000,
  projectedEstate: 8900000,
  annualTaxEstimate: 347000,
};

const MODULES = [
  { label: 'Profile', segment: '/profile', complete: true },
  { label: 'Income', segment: '/income', complete: true },
  { label: 'Expenses', segment: '/expenses', complete: true },
  { label: 'Net Worth', segment: '/net-worth', complete: true },
  { label: 'Goals', segment: '/goals', complete: true },
  { label: 'Retirement', segment: '/retirement', complete: true },
  { label: 'Tax', segment: '/tax', complete: true },
  { label: 'Social Security', segment: '/social-security', complete: true },
  { label: 'Medicare', segment: '/medicare', complete: false },
  { label: 'Insurance', segment: '/insurance', complete: true },
  { label: 'Education', segment: '/education', complete: false },
  { label: 'Estate', segment: '/estate', complete: true },
  { label: 'Business', segment: '/business', complete: false },
];

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function SuccessGauge({ value }: { value: number }) {
  const radius = 40;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 85 ? '#10B981' : value >= 70 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="60" viewBox="0 0 100 60">
        <path
          d="M 10 55 A 40 40 0 0 1 90 55"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 10 55 A 40 40 0 0 1 90 55"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute bottom-0 text-xl font-bold text-gray-900" style={{ fontFeatureSettings: '"tnum"' }}>
        {value}%
      </span>
    </div>
  );
}

export default function PlanOverviewPage() {
  const params = useParams();
  const planId = params.planId as string;

  return (
    <div>
      <PlanNav planId={planId} clientName={PLAN.clientName} planName={PLAN.planName} />

      <div className="max-w-content mx-auto px-6 py-6">
        {/* Plan header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{PLAN.planName}</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                Active
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Last updated: {PLAN.lastUpdated} · Completion: {PLAN.completionScore}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              <Edit3 size={14} /> Edit
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              <Share2 size={14} /> Share
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              <Download size={14} /> Export
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">
              <TrendingUp size={14} /> Run Plan
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col items-center">
            <p className="text-xs text-gray-500 mb-2">Probability of Success</p>
            <SuccessGauge value={PLAN.probabilityOfSuccess} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-green-500" />
              <p className="text-xs text-gray-500">Retirement Ready?</p>
            </div>
            <p className="text-xl font-bold text-green-600">Yes</p>
            <p className="text-xs text-gray-400 mt-1">Target: {PLAN.retirementDate}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-brand-500" />
              <p className="text-xs text-gray-500">Total Net Worth</p>
            </div>
            <p className="text-xl font-bold text-gray-900" style={{ fontFeatureSettings: '"tnum"' }}>
              {formatCurrency(PLAN.totalNetWorth)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <Landmark size={16} className="text-purple-500" />
              <p className="text-xs text-gray-500">Projected Estate</p>
            </div>
            <p className="text-xl font-bold text-gray-900" style={{ fontFeatureSettings: '"tnum"' }}>
              {formatCurrency(PLAN.projectedEstate)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <Receipt size={16} className="text-amber-500" />
              <p className="text-xs text-gray-500">Annual Tax Est.</p>
            </div>
            <p className="text-xl font-bold text-gray-900" style={{ fontFeatureSettings: '"tnum"' }}>
              {formatCurrency(PLAN.annualTaxEstimate)}
            </p>
          </div>
        </div>

        {/* Planning Modules Status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Planning Modules</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {MODULES.map((mod) => (
              <Link
                key={mod.segment}
                href={`/prism/plans/${planId}${mod.segment}`}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors group"
              >
                {mod.complete ? (
                  <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                ) : (
                  <Circle size={16} className="text-gray-300 flex-shrink-0" />
                )}
                <span className="text-xs font-medium text-gray-700 group-hover:text-brand-600 truncate">
                  {mod.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom row - Cash Flow placeholder + Goals summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Cash Flow Summary</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">Cash flow chart will render here after plan calculation (Stage 2)</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Goals Summary</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { name: 'Retirement at 58', status: 'funded', pct: 92 },
                { name: 'College — Emma', status: 'partial', pct: 68 },
                { name: 'Vacation Home', status: 'partial', pct: 45 },
                { name: 'Legacy ($5M)', status: 'funded', pct: 100 },
              ].map((goal) => (
                <div key={goal.name} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{goal.name}</p>
                    <div className="mt-1 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${goal.status === 'funded' ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${goal.pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-600" style={{ fontFeatureSettings: '"tnum"' }}>
                    {goal.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
