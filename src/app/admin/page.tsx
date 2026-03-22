'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt$(v: number): string {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtCompact(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const FIRM_STATS = {
  totalAdvisors: 12,
  activeAdvisors: 11,
  totalClients: 284,
  totalPlans: 312,
  activePlans: 267,
  totalAUM: 1_420_000_000,
  avgSuccessRate: 0.78,
  criticalAlerts: 8,
  warningAlerts: 24,
  plansNeedingReview: 15,
  lastCustodianSync: '2026-03-01T02:15:00Z',
  lastMarketUpdate: '2026-03-01T06:00:00Z',
};

const ADVISOR_PERFORMANCE = [
  { name: 'Sarah Chen', clients: 42, plans: 48, avgSuccess: 82, lastLogin: '2h ago' },
  { name: 'Michael Torres', clients: 38, plans: 42, avgSuccess: 79, lastLogin: '1h ago' },
  { name: 'Lisa Park', clients: 35, plans: 38, avgSuccess: 81, lastLogin: '4h ago' },
  { name: 'James Wilson', clients: 32, plans: 36, avgSuccess: 76, lastLogin: '1d ago' },
  { name: 'Emily Davis', clients: 28, plans: 30, avgSuccess: 80, lastLogin: '30m ago' },
];

const MONTHLY_ACTIVITY = [
  { month: 'Oct', plans: 18, reports: 12, meetings: 45 },
  { month: 'Nov', plans: 22, reports: 15, meetings: 52 },
  { month: 'Dec', plans: 15, reports: 28, meetings: 38 },
  { month: 'Jan', plans: 32, reports: 20, meetings: 60 },
  { month: 'Feb', plans: 28, reports: 18, meetings: 55 },
  { month: 'Mar', plans: 24, reports: 14, meetings: 48 },
];

const WEALTH_TIER_DIST = [
  { name: 'Mass Affluent', value: 95, color: '#1d7682' },
  { name: 'HNW', value: 128, color: '#22c55e' },
  { name: 'UHNW', value: 48, color: '#f59e0b' },
  { name: 'Ultra UHNW', value: 13, color: '#ef4444' },
];

const INTEGRATION_STATUS = [
  { name: 'HubSpot CRM', status: 'connected' as const, lastSync: '5 min ago', accounts: null },
  { name: 'Schwab Advisor', status: 'connected' as const, lastSync: '2:15 AM', accounts: 1842 },
  { name: 'Fidelity WealthCentral', status: 'connected' as const, lastSync: '2:20 AM', accounts: 956 },
  { name: 'Pershing NetExchange', status: 'error' as const, lastSync: 'Failed 2:25 AM', accounts: 312 },
  { name: 'Market Data (FMP)', status: 'connected' as const, lastSync: '6:00 AM', accounts: null },
  { name: 'FRED Economic Data', status: 'connected' as const, lastSync: '6:00 AM', accounts: null },
];

const SUCCESS_DISTRIBUTION = [
  { range: '<50%', count: 12 },
  { range: '50-60%', count: 28 },
  { range: '60-70%', count: 45 },
  { range: '70-80%', count: 82 },
  { range: '80-90%', count: 72 },
  { range: '90%+', count: 28 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Advisors', value: `${FIRM_STATS.totalAdvisors}`, sub: `${FIRM_STATS.activeAdvisors} active`, icon: Users, color: 'text-teal-300' },
          { label: 'Total Clients', value: `${FIRM_STATS.totalClients}`, sub: `${FIRM_STATS.totalPlans} plans`, icon: FileText, color: 'text-teal-300' },
          { label: 'Firm AUM', value: fmtCompact(FIRM_STATS.totalAUM), sub: 'Across all plans', icon: DollarSign, color: 'text-success-500' },
          { label: 'Avg Success Rate', value: `${(FIRM_STATS.avgSuccessRate * 100).toFixed(0)}%`, sub: `${FIRM_STATS.activePlans} active plans`, icon: TrendingUp, color: 'text-teal-300' },
          { label: 'Open Alerts', value: `${FIRM_STATS.criticalAlerts + FIRM_STATS.warningAlerts}`, sub: `${FIRM_STATS.criticalAlerts} critical`, icon: AlertTriangle, color: 'text-critical-500' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wider">{kpi.label}</p>
                <Icon size={16} className={kpi.color} />
              </div>
              <p className="text-xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-white/30 mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Monthly activity */}
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
          <h3 className="font-serif text-lg text-white mb-4">Monthly Activity</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_ACTIVITY}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="plans" fill="#1d7682" name="Plans Created" radius={[3, 3, 0, 0]} />
                <Bar dataKey="reports" fill="#22c55e" name="Reports Generated" radius={[3, 3, 0, 0]} />
                <Bar dataKey="meetings" fill="#f59e0b" name="Client Meetings" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Success rate distribution */}
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
          <h3 className="font-serif text-lg text-white mb-4">Plan Success Rate Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SUCCESS_DISTRIBUTION}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Plans" radius={[3, 3, 0, 0]}>
                  {SUCCESS_DISTRIBUTION.map((entry, i) => (
                    <Cell key={i} fill={i < 2 ? '#ef4444' : i < 3 ? '#f59e0b' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Top advisors */}
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5 col-span-2">
          <h3 className="font-serif text-lg text-white mb-3">Advisor Performance</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-limestone-100 text-left">
                <th className="pb-2 text-xs text-white/40 uppercase tracking-wider">Advisor</th>
                <th className="pb-2 text-xs text-white/40 uppercase tracking-wider text-right">Clients</th>
                <th className="pb-2 text-xs text-white/40 uppercase tracking-wider text-right">Plans</th>
                <th className="pb-2 text-xs text-white/40 uppercase tracking-wider text-right">Avg Success</th>
                <th className="pb-2 text-xs text-white/40 uppercase tracking-wider">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {ADVISOR_PERFORMANCE.map((a) => (
                <tr key={a.name} className="border-b border-limestone-50">
                  <td className="py-2.5 font-medium text-white">{a.name}</td>
                  <td className="py-2.5 text-white/50 text-right">{a.clients}</td>
                  <td className="py-2.5 text-white/50 text-right">{a.plans}</td>
                  <td className="py-2.5 text-right">
                    <span className={`font-medium ${a.avgSuccess >= 80 ? 'text-success-500' : a.avgSuccess >= 70 ? 'text-warning-500' : 'text-critical-500'}`}>
                      {a.avgSuccess}%
                    </span>
                  </td>
                  <td className="py-2.5 text-white/50">{a.lastLogin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Client distribution */}
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
          <h3 className="font-serif text-lg text-white mb-3">Clients by Wealth Tier</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={WEALTH_TIER_DIST} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                  {WEALTH_TIER_DIST.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-2">
            {WEALTH_TIER_DIST.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="font-medium text-white/60">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integration status */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg text-white">Integration Status</h3>
          <button className="inline-flex items-center gap-1 text-xs font-medium text-teal-300 hover:text-teal-300">
            <RefreshCw size={12} /> Sync All
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {INTEGRATION_STATUS.map((int) => (
            <div key={int.name} className={`flex items-center gap-3 p-3 rounded-lg border ${
              int.status === 'connected' ? 'border-success-100 bg-success-50/30' : 'border-critical-100 bg-critical-50/30'
            }`}>
              {int.status === 'connected' ? (
                <Wifi size={16} className="text-success-500 flex-shrink-0" />
              ) : (
                <WifiOff size={16} className="text-critical-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{int.name}</p>
                <p className="text-xs text-white/50">
                  {int.lastSync}{int.accounts ? ` · ${int.accounts.toLocaleString()} accounts` : ''}
                </p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                int.status === 'connected' ? 'bg-success-100 text-success-700' : 'bg-critical-100 text-critical-700'
              }`}>
                {int.status === 'connected' ? 'Connected' : 'Error'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Plans needing review */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="font-serif text-lg text-white mb-3">Plans Needing Review ({FIRM_STATS.plansNeedingReview})</h3>
        <div className="space-y-2">
          {[
            { client: 'Robert Johnson', advisor: 'James Wilson', lastReview: '14 months ago', successRate: 64, reason: 'Success rate below 70%' },
            { client: 'Margaret Thompson', advisor: 'Lisa Park', lastReview: '18 months ago', successRate: 72, reason: 'Annual review overdue' },
            { client: 'David Lee', advisor: 'Emily Davis', lastReview: '13 months ago', successRate: 68, reason: 'Major life event (divorce)' },
            { client: 'Susan Miller', advisor: 'Michael Torres', lastReview: '15 months ago', successRate: 75, reason: 'Annual review overdue' },
            { client: 'Thomas Brown', advisor: 'Sarah Chen', lastReview: '12 months ago', successRate: 71, reason: 'Account balance drop >10%' },
          ].map((p) => (
            <div key={p.client} className="flex items-center justify-between py-2 border-b border-limestone-50 last:border-0">
              <div className="flex items-center gap-3">
                <AlertTriangle size={14} className={p.successRate < 70 ? 'text-critical-500' : 'text-warning-500'} />
                <div>
                  <p className="text-sm font-medium text-white">{p.client}</p>
                  <p className="text-xs text-white/50">{p.advisor} · Last review: {p.lastReview}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/50">{p.reason}</span>
                <span className={`text-sm font-bold ${p.successRate < 70 ? 'text-critical-500' : 'text-warning-500'}`}>{p.successRate}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
