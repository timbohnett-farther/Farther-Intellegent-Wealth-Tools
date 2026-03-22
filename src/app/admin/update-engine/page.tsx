'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Calendar,
  FileText,
  Zap,
  ChevronRight,
  Play,
  ExternalLink,
  Database,
  Globe,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const LAST_RUNS = [
  {
    runId: 'UPD-2026-Q1',
    trigger: 'quarterly',
    runDate: 'Mar 1, 2026 3:00 AM',
    duration: '4m 32s',
    sourcesChecked: 57,
    changesDetected: 14,
    tablesUpdated: 8,
    plansRecalculated: 284,
    humanReviewItems: 2,
    advisorAlerts: 6,
    errors: 0,
    status: 'completed' as const,
    summary:
      'Q1 2026 update: 8 numeric adjustments auto-published (AFR rates, CPI update, 3 state bracket adjustments). 2 items pending human review (proposed SALT cap extension bill, Maine estate tax change).',
  },
  {
    runId: 'UPD-2026-M02',
    trigger: 'monthly_afr',
    runDate: 'Feb 3, 2026 8:00 AM',
    duration: '0m 18s',
    sourcesChecked: 2,
    changesDetected: 1,
    tablesUpdated: 1,
    plansRecalculated: 0,
    humanReviewItems: 0,
    advisorAlerts: 0,
    errors: 0,
    status: 'completed' as const,
    summary: 'Monthly AFR update: Short 4.67%, Mid 4.23%, Long 4.68%, 7520 Rate 5.2%. No material change.',
  },
  {
    runId: 'UPD-2026-D28',
    trigger: 'daily_congress',
    runDate: 'Feb 28, 2026 6:00 AM',
    duration: '0m 8s',
    sourcesChecked: 3,
    changesDetected: 1,
    tablesUpdated: 0,
    plansRecalculated: 0,
    humanReviewItems: 1,
    advisorAlerts: 1,
    errors: 0,
    status: 'completed' as const,
    summary: 'Congress monitor: S.1234 (SALT Cap Extension Act) advanced to committee markup. Routed to review queue.',
  },
  {
    runId: 'UPD-2026-D27',
    trigger: 'daily_congress',
    runDate: 'Feb 27, 2026 6:00 AM',
    duration: '0m 6s',
    sourcesChecked: 3,
    changesDetected: 0,
    tablesUpdated: 0,
    plansRecalculated: 0,
    humanReviewItems: 0,
    advisorAlerts: 0,
    errors: 0,
    status: 'completed' as const,
    summary: 'No changes detected.',
  },
  {
    runId: 'UPD-2025-A',
    trigger: 'annual_tables',
    runDate: 'Nov 15, 2025 3:00 AM',
    duration: '12m 45s',
    sourcesChecked: 57,
    changesDetected: 42,
    tablesUpdated: 38,
    plansRecalculated: 271,
    humanReviewItems: 4,
    advisorAlerts: 12,
    errors: 1,
    status: 'completed' as const,
    summary:
      'Annual 2026 table update triggered by IRS Rev Proc 2025-45. All federal brackets, standard deductions, contribution limits, AMT exemptions, estate exemption updated. IRMAA brackets updated from CMS announcement. SS COLA 2.5% applied.',
  },
];

const SOURCE_STATUS = [
  { name: 'IRS.gov Newsroom', type: 'federal', lastCheck: '6:00 AM today', status: 'ok' as const, changesLastMonth: 2 },
  { name: 'Congress.gov API', type: 'federal', lastCheck: '6:00 AM today', status: 'ok' as const, changesLastMonth: 3 },
  { name: 'SSA.gov', type: 'federal', lastCheck: 'Mar 1 (quarterly)', status: 'ok' as const, changesLastMonth: 0 },
  { name: 'CMS.gov', type: 'federal', lastCheck: 'Mar 1 (quarterly)', status: 'ok' as const, changesLastMonth: 0 },
  { name: 'FRED / BLS', type: 'federal', lastCheck: 'Feb 3 (monthly)', status: 'ok' as const, changesLastMonth: 1 },
  { name: 'Federal Register', type: 'federal', lastCheck: '6:00 AM today', status: 'ok' as const, changesLastMonth: 1 },
  { name: 'California FTB', type: 'state', lastCheck: 'Mar 1 (quarterly)', status: 'ok' as const, changesLastMonth: 1 },
  { name: 'New York DTF', type: 'state', lastCheck: 'Mar 1 (quarterly)', status: 'ok' as const, changesLastMonth: 0 },
  { name: 'Massachusetts DOR', type: 'state', lastCheck: 'Mar 1 (quarterly)', status: 'ok' as const, changesLastMonth: 0 },
  { name: 'Illinois IDOR', type: 'state', lastCheck: 'Mar 1 (quarterly)', status: 'ok' as const, changesLastMonth: 0 },
  { name: 'Pershing NetExchange', type: 'state', lastCheck: 'Mar 1 (quarterly)', status: 'error' as const, changesLastMonth: 0 },
  { name: '44 other states', type: 'state', lastCheck: 'Mar 1 (quarterly)', status: 'ok' as const, changesLastMonth: 2 },
];

const PENDING_REVIEW = [
  {
    id: 'REV-001',
    source: 'Congress.gov',
    title: 'SALT Cap Extension Act (S.1234)',
    type: 'pending_legislation',
    severity: 'medium',
    detectedAt: 'Feb 28, 2026',
    affectedClients: 847,
    summary: 'Proposes raising SALT deduction cap from $10K to $30K for taxpayers with AGI under $400K.',
  },
  {
    id: 'REV-002',
    source: 'Maine Revenue',
    title: 'Maine Estate Tax Threshold Change',
    type: 'law_change',
    severity: 'low',
    detectedAt: 'Mar 1, 2026',
    affectedClients: 12,
    summary: 'Maine estate tax exemption increased from $6.8M to $7.1M effective Jan 1, 2027.',
  },
];

const SCHEDULE = [
  { name: 'Daily Congress Monitor', cron: '6:00 AM daily', nextRun: 'Mar 2, 2026 6:00 AM', icon: Calendar },
  { name: 'Monthly AFR Update', cron: '1st business day, 8:00 AM', nextRun: 'Apr 1, 2026 8:00 AM', icon: Clock },
  { name: 'Quarterly Full Run', cron: 'Jan 1, Apr 1, Jul 1, Oct 1 at 3:00 AM', nextRun: 'Apr 1, 2026 3:00 AM', icon: RefreshCw },
  { name: 'Annual Table Rebuild', cron: 'Triggered by IRS Rev Proc publication', nextRun: 'Oct/Nov 2026 (estimated)', icon: Database },
];

const TABLE_VERSIONS = [
  { type: 'Federal Income Brackets', taxYear: 2026, version: 'v3', lastUpdated: 'Nov 15, 2025', source: 'IRS Rev Proc 2025-45' },
  { type: 'Standard Deductions', taxYear: 2026, version: 'v1', lastUpdated: 'Nov 15, 2025', source: 'IRS Rev Proc 2025-45' },
  { type: 'Contribution Limits (401k)', taxYear: 2026, version: 'v1', lastUpdated: 'Nov 15, 2025', source: 'IRS Rev Proc 2025-45' },
  { type: 'IRMAA Brackets', taxYear: 2026, version: 'v2', lastUpdated: 'Nov 20, 2025', source: 'CMS 2026 Announcement' },
  { type: 'AFR Rates', taxYear: 2026, version: 'v3', lastUpdated: 'Feb 3, 2026', source: 'IRS Rev Rul 2026-4' },
  { type: 'SS COLA & Wage Base', taxYear: 2026, version: 'v1', lastUpdated: 'Oct 10, 2025', source: 'SSA COLA Announcement' },
  { type: 'Estate/Gift Exemption', taxYear: 2026, version: 'v1', lastUpdated: 'Nov 15, 2025', source: 'IRS Rev Proc 2025-45' },
  { type: 'California State Brackets', taxYear: 2026, version: 'v2', lastUpdated: 'Mar 1, 2026', source: 'CA FTB 2026 Inflation Adj.' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const triggerLabel: Record<string, string> = {
  quarterly: 'Quarterly',
  monthly_afr: 'Monthly AFR',
  daily_congress: 'Daily Monitor',
  annual_tables: 'Annual Update',
};

const triggerColor: Record<string, string> = {
  quarterly: 'bg-teal-500/15 text-teal-300',
  monthly_afr: 'bg-teal-500/15 text-teal-300',
  daily_congress: 'bg-white/[0.06] text-white/60',
  annual_tables: 'bg-warning-100 text-warning-700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UpdateEnginePage() {
  const [showAllRuns, setShowAllRuns] = useState(false);
  const displayedRuns = showAllRuns ? LAST_RUNS : LAST_RUNS.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Sources Monitored', value: '57', sub: '6 federal · 51 state', icon: Globe, color: 'text-teal-300' },
          { label: 'Tables Current', value: `${TABLE_VERSIONS.length}`, sub: 'All validated', icon: Database, color: 'text-success-500' },
          { label: 'Pending Review', value: `${PENDING_REVIEW.length}`, sub: `${PENDING_REVIEW.filter(p => p.severity === 'medium').length} medium priority`, icon: AlertTriangle, color: PENDING_REVIEW.length > 0 ? 'text-warning-500' : 'text-white/30' },
          { label: 'Last Run', value: '4m 32s', sub: 'Mar 1, 2026 3:00 AM', icon: Clock, color: 'text-teal-300' },
          { label: 'Plans Recalculated', value: '284', sub: 'Q1 2026 run', icon: Activity, color: 'text-teal-300' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-white/50">{kpi.label}</p>
                <Icon size={16} className={kpi.color} />
              </div>
              <p className="text-xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-white/30 mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Pending review + Schedule */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pending review */}
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Human Review Queue</h3>
            <Link href="/admin/update-engine/review-queue" className="text-xs font-medium text-teal-300 hover:text-teal-300 flex items-center gap-1">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          {PENDING_REVIEW.length === 0 ? (
            <p className="text-sm text-white/30 py-4 text-center">No items pending review</p>
          ) : (
            <div className="space-y-3">
              {PENDING_REVIEW.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border border-limestone-100 hover:border-white/[0.06] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{item.title}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.severity === 'high' ? 'bg-critical-100 text-critical-700' :
                      item.severity === 'medium' ? 'bg-warning-100 text-warning-700' :
                      'bg-teal-500/15 text-teal-300'
                    }`}>{item.severity}</span>
                  </div>
                  <p className="text-xs text-white/50 mb-1.5">{item.summary}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/30">{item.source} · {item.detectedAt}</span>
                    <span className="text-xs text-white/50">{item.affectedClients.toLocaleString()} clients</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Update Schedule</h3>
            <button className="inline-flex items-center gap-1 text-xs font-medium text-teal-300 hover:text-teal-300">
              <Play size={12} /> Run Now
            </button>
          </div>
          <div className="space-y-3">
            {SCHEDULE.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.name} className="flex items-center gap-3 p-3 rounded-lg bg-transparent">
                  <Icon size={16} className="text-white/30 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-white/50">{s.cron}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-white/50">Next run</p>
                    <p className="text-xs text-white/30">{s.nextRun}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Source status */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Data Source Status</h3>
        <div className="grid grid-cols-4 gap-3">
          {SOURCE_STATUS.map((src) => (
            <div key={src.name} className={`flex items-center gap-2 p-2.5 rounded-lg border ${
              src.status === 'ok' ? 'border-success-100 bg-success-50/30' : 'border-critical-100 bg-critical-50/30'
            }`}>
              {src.status === 'ok' ? (
                <CheckCircle2 size={14} className="text-success-500 flex-shrink-0" />
              ) : (
                <AlertTriangle size={14} className="text-critical-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{src.name}</p>
                <p className="text-[10px] text-white/50">{src.lastCheck}</p>
              </div>
              {src.changesLastMonth > 0 && (
                <span className="text-[10px] font-medium text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded-full">
                  {src.changesLastMonth}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tax table versions */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
        <div className="px-5 py-4 border-b border-limestone-100">
          <h3 className="text-sm font-semibold text-white">Current Tax Table Versions</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-100 text-left">
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Table Type</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Tax Year</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Version</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Last Updated</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Source</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_VERSIONS.map((tv) => (
              <tr key={tv.type} className="border-b border-limestone-50 hover:bg-white/[0.04]/50">
                <td className="px-5 py-3 font-medium text-white">{tv.type}</td>
                <td className="px-5 py-3 text-white/50">{tv.taxYear}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700">{tv.version}</span>
                </td>
                <td className="px-5 py-3 text-white/50">{tv.lastUpdated}</td>
                <td className="px-5 py-3 text-white/50 text-xs">{tv.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Run history */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
        <div className="px-5 py-4 border-b border-limestone-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Run History</h3>
          <button onClick={() => setShowAllRuns(!showAllRuns)} className="text-xs font-medium text-teal-300 hover:text-teal-300">
            {showAllRuns ? 'Show Less' : 'Show All'}
          </button>
        </div>
        <div className="divide-y divide-limestone-50">
          {displayedRuns.map((run) => (
            <div key={run.runId} className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{run.runId}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${triggerColor[run.trigger]}`}>
                    {triggerLabel[run.trigger]}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700">
                    <CheckCircle2 size={10} /> Completed
                  </span>
                </div>
                <span className="text-xs text-white/30">{run.runDate} · {run.duration}</span>
              </div>
              <p className="text-sm text-white/50 mb-2">{run.summary}</p>
              <div className="flex items-center gap-4 text-xs text-white/30">
                <span>{run.sourcesChecked} sources checked</span>
                <span>{run.changesDetected} changes detected</span>
                <span>{run.tablesUpdated} tables updated</span>
                <span>{run.plansRecalculated} plans recalculated</span>
                {run.humanReviewItems > 0 && (
                  <span className="text-warning-500">{run.humanReviewItems} pending review</span>
                )}
                {run.errors > 0 && (
                  <span className="text-critical-500">{run.errors} errors</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
