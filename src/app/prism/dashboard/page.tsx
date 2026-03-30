'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users, FileText, TrendingUp, AlertCircle, Plus, Calculator, BarChart3, Upload,
  ArrowUpRight, ArrowDownRight, Clock, ChevronRight,
} from 'lucide-react';

// Placeholder data — will be replaced with API calls in Stage 2
const STATS = [
  { label: 'Total Clients', value: '47', delta: '+3 this month', trend: 'up' as const, icon: <Users size={20} /> },
  { label: 'Plans Due for Review', value: '8', delta: '2 overdue', trend: 'down' as const, icon: <FileText size={20} /> },
  { label: 'Avg. Plan Success Rate', value: '87%', delta: '+2.1% vs last quarter', trend: 'up' as const, icon: <TrendingUp size={20} /> },
  { label: 'Open Action Items', value: '12', delta: '5 high priority', trend: 'down' as const, icon: <AlertCircle size={20} /> },
];

const RECENT_ACTIVITY = [
  { client: 'Sarah & Michael Chen', event: 'Plan updated — added rental income', time: '2 hours ago', initials: 'SC' },
  { client: 'James Wilson', event: 'Risk profile completed — Band 5', time: '4 hours ago', initials: 'JW' },
  { client: 'Emily & David Thompson', event: 'New plan created — Comprehensive', time: '1 day ago', initials: 'ET' },
  { client: 'Robert Martinez', event: 'Estate documents reviewed', time: '1 day ago', initials: 'RM' },
  { client: 'Lisa Anderson', event: 'Social Security analysis run', time: '2 days ago', initials: 'LA' },
  { client: 'Patricia & Thomas Kim', event: 'Retirement scenario comparison saved', time: '2 days ago', initials: 'PK' },
];

const CLIENTS_NEEDING_ATTENTION = [
  { name: 'Robert Martinez', lastReview: '2025-08-15', status: 'needs_review', risk: 'High' },
  { name: 'Grace Liu', lastReview: '2025-06-20', status: 'needs_review', risk: 'Medium' },
  { name: 'William & Sarah Foster', lastReview: '2025-07-01', status: 'draft', risk: 'Low' },
  { name: 'Jennifer Adams', lastReview: '2025-09-10', status: 'needs_review', risk: 'Medium' },
];

const UPCOMING_REVIEWS = [
  { date: 'Mar 3, 2026', client: 'Emily & David Thompson', task: 'Annual Review', assigned: 'John Doe' },
  { date: 'Mar 5, 2026', client: 'Sarah & Michael Chen', task: 'Tax Planning', assigned: 'John Doe' },
  { date: 'Mar 8, 2026', client: 'James Wilson', task: 'Retirement Update', assigned: 'Jane Smith' },
  { date: 'Mar 12, 2026', client: 'Lisa Anderson', task: 'Estate Review', assigned: 'John Doe' },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-success-100 text-success-700',
    draft: 'bg-surface-subtle text-text-muted',
    needs_review: 'bg-warning-100 text-warning-700',
    archived: 'bg-surface-subtle text-text-muted',
  };
  const labels: Record<string, string> = {
    active: 'Active', draft: 'Draft', needs_review: 'Needs Review', archived: 'Archived',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

export default function DashboardPage() {
  return (
    <div className="max-w-content mx-auto px-6 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">Welcome back, John. Here&apos;s your practice overview.</p>
        </div>
        <Link
          href="/prism/clients?new=true"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary text-text text-sm font-medium rounded-lg hover:bg-accent-primary/80 transition-colors"
        >
          <Plus size={16} />
          New Client
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-faint">{stat.icon}</span>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${stat.trend === 'up' ? 'text-success-500' : 'text-warning-500'}`}>
                {stat.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stat.delta}
              </span>
            </div>
            <p className="text-2xl font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>{stat.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Activity (2/3 width) */}
        <div className="lg:col-span-2 bg-surface-soft backdrop-blur-xl rounded-xl border border-border-subtle shadow-sm">
          <div className="px-5 py-4 border-b border-limestone-100 flex items-center justify-between">
            <h3 className="font-semibold text-text">Recent Activity</h3>
            <Link href="/prism/insights" className="text-xs text-accent-primarySoft hover:text-accent-primarySoft font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-subtle transition-colors">
                <div className="w-8 h-8 rounded-full bg-accent-primary/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent-primarySoft text-[10px] font-semibold">{item.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text font-medium truncate">{item.client}</p>
                  <p className="text-xs text-text-muted truncate">{item.event}</p>
                </div>
                <span className="text-[10px] text-text-faint whitespace-nowrap flex items-center gap-1">
                  <Clock size={10} />
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions (1/3 width) */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm">
          <div className="px-5 py-4 border-b border-limestone-100">
            <h3 className="font-semibold text-text">Quick Actions</h3>
          </div>
          <div className="p-4 space-y-2">
            <Link
              href="/prism/plans?new=true"
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border-subtle hover:border-accent-primarySoft hover:bg-accent-primary/10 transition-colors group"
            >
              <Plus size={18} className="text-accent-primarySoft" />
              <span className="text-sm font-medium text-text-muted group-hover:text-accent-primarySoft">Start New Plan</span>
              <ChevronRight size={14} className="ml-auto text-text-faint group-hover:text-accent-primarySoft" />
            </Link>
            <Link
              href="/prism/tax-center"
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border-subtle hover:border-accent-primarySoft hover:bg-accent-primary/10 transition-colors group"
            >
              <Calculator size={18} className="text-accent-primarySoft" />
              <span className="text-sm font-medium text-text-muted group-hover:text-accent-primarySoft">Run Tax Analysis</span>
              <ChevronRight size={14} className="ml-auto text-text-faint group-hover:text-accent-primarySoft" />
            </Link>
            <Link
              href="/prism/reports"
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border-subtle hover:border-accent-primarySoft hover:bg-accent-primary/10 transition-colors group"
            >
              <BarChart3 size={18} className="text-accent-primarySoft" />
              <span className="text-sm font-medium text-text-muted group-hover:text-accent-primarySoft">Generate Reports</span>
              <ChevronRight size={14} className="ml-auto text-text-faint group-hover:text-accent-primarySoft" />
            </Link>
            <Link
              href="/prism/clients?import=true"
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border-subtle hover:border-accent-primarySoft hover:bg-accent-primary/10 transition-colors group"
            >
              <Upload size={18} className="text-accent-primarySoft" />
              <span className="text-sm font-medium text-text-muted group-hover:text-accent-primarySoft">Import Client Data</span>
              <ChevronRight size={14} className="ml-auto text-text-faint group-hover:text-accent-primarySoft" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clients needing attention */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm">
          <div className="px-5 py-4 border-b border-limestone-100">
            <h3 className="font-semibold text-text">Clients Needing Attention</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-limestone-100">
                  <th className="text-left px-5 py-2 text-xs font-medium text-text-muted">Name</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-muted">Last Review</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-muted">Status</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-muted">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {CLIENTS_NEEDING_ATTENTION.map((client, i) => (
                  <tr key={i} className="hover:bg-surface-subtle">
                    <td className="px-5 py-2.5 font-medium text-text">{client.name}</td>
                    <td className="px-3 py-2.5 text-text-muted">{client.lastReview}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={client.status} /></td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-medium ${client.risk === 'High' ? 'text-critical-500' : client.risk === 'Medium' ? 'text-warning-500' : 'text-success-500'}`}>
                        {client.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming reviews */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm">
          <div className="px-5 py-4 border-b border-limestone-100">
            <h3 className="font-semibold text-text">Upcoming Reviews</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {UPCOMING_REVIEWS.map((review, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-surface-subtle">
                <div className="text-center flex-shrink-0 w-12">
                  <p className="text-xs font-medium text-accent-primarySoft">{review.date.split(', ')[0].split(' ')[0]}</p>
                  <p className="text-lg font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
                    {review.date.split(', ')[0].split(' ')[1]}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{review.client}</p>
                  <p className="text-xs text-text-muted">{review.task}</p>
                </div>
                <span className="text-xs text-text-faint">{review.assigned}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
