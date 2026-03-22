'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, ChevronRight } from 'lucide-react';

const SAMPLE_PLANS = [
  { id: 'pl1', clientName: 'Sarah & Michael Chen', planName: 'Comprehensive Financial Plan', status: 'active', type: 'comprehensive', lastUpdated: '2026-02-15', successRate: 92, completionScore: 88 },
  { id: 'pl2', clientName: 'Sarah & Michael Chen', planName: 'Retire at 58 Scenario', status: 'draft', type: 'retirement_only', lastUpdated: '2026-01-20', successRate: null, completionScore: 45 },
  { id: 'pl3', clientName: 'James Wilson', planName: 'Retirement Planning', status: 'active', type: 'comprehensive', lastUpdated: '2026-02-01', successRate: 87, completionScore: 82 },
  { id: 'pl4', clientName: 'Emily & David Thompson', planName: 'Financial Plan 2026', status: 'needs_review', type: 'comprehensive', lastUpdated: '2025-11-20', successRate: 78, completionScore: 75 },
  { id: 'pl5', clientName: 'Robert Martinez', planName: 'Retirement Analysis', status: 'needs_review', type: 'retirement_only', lastUpdated: '2025-08-15', successRate: 65, completionScore: 60 },
  { id: 'pl6', clientName: 'Lisa Anderson', planName: 'Estate & Tax Plan', status: 'active', type: 'estate_only', lastUpdated: '2026-01-28', successRate: 91, completionScore: 90 },
  { id: 'pl7', clientName: 'Grace Liu', planName: 'Comprehensive Plan', status: 'draft', type: 'comprehensive', lastUpdated: '2025-06-20', successRate: null, completionScore: 22 },
  { id: 'pl8', clientName: 'Patricia & Thomas Kim', planName: 'Full Financial Plan', status: 'active', type: 'comprehensive', lastUpdated: '2026-02-20', successRate: 95, completionScore: 94 },
];

const statusColors: Record<string, string> = {
  active: 'bg-success-100 text-success-700', draft: 'bg-white/[0.06] text-white/50',
  needs_review: 'bg-warning-100 text-warning-700', archived: 'bg-white/[0.06] text-white/50',
};
const statusLabels: Record<string, string> = {
  active: 'Active', draft: 'Draft', needs_review: 'Needs Review', archived: 'Archived',
};

export default function PlansPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = SAMPLE_PLANS.filter((p) => {
    if (search && !p.clientName.toLowerCase().includes(search.toLowerCase()) && !p.planName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-content mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-white tracking-wide">Plans</h1>
        <Link
          href="/prism/plans?new=true"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-400 transition-colors"
        >
          <Plus size={16} /> New Plan
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text" placeholder="Search plans or clients..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-white/[0.06] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white/[0.06]"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-white/[0.06] rounded-lg bg-white/[0.06] focus:outline-hidden focus:ring-2 focus:ring-teal-500">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="needs_review">Needs Review</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((plan) => (
          <Link
            key={plan.id}
            href={`/prism/plans/${plan.id}`}
            className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5 hover:shadow-md hover:border-brand-200 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-white/30" />
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[plan.status]}`}>
                  {statusLabels[plan.status]}
                </span>
              </div>
              <ChevronRight size={14} className="text-white/30 group-hover:text-teal-300" />
            </div>
            <h3 className="font-serif font-semibold text-white mb-0.5 group-hover:text-teal-300 transition-colors">{plan.planName}</h3>
            <p className="text-sm text-white/50 mb-3">{plan.clientName}</p>

            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">Updated {plan.lastUpdated}</span>
              {plan.successRate !== null && (
                <span className={`font-semibold ${plan.successRate >= 85 ? 'text-success-500' : plan.successRate >= 70 ? 'text-warning-500' : 'text-critical-500'}`}
                  style={{ fontFeatureSettings: '"tnum"' }}>
                  {plan.successRate}% success
                </span>
              )}
            </div>

            {/* Completion bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-white/30">Completion</span>
                <span className="text-white/50 font-medium" style={{ fontFeatureSettings: '"tnum"' }}>{plan.completionScore}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${plan.completionScore >= 90 ? 'bg-success-500' : plan.completionScore >= 60 ? 'bg-teal-500' : plan.completionScore >= 40 ? 'bg-warning-500' : 'bg-white/20'}`}
                  style={{ width: `${plan.completionScore}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
