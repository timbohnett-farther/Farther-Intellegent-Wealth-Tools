'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HealthStatus = 'healthy' | 'degraded' | 'critical';
type Severity = 'critical' | 'warning' | 'info';
type PipelineStageStatus = 'passed' | 'failed' | 'running' | 'pending';

interface TestSuiteResult {
  label: string;
  passed: number;
  total: number;
}

interface CoverageMetric {
  label: string;
  value: number;
  requiredLabel?: string;
}

interface ModuleHealth {
  name: string;
  score: number;
  trend: number[]; // last 7 data points for sparkline
}

interface DesignCompliance {
  violations: number;
  score: number;
  recentViolations: Array<{ component: string; rule: string; severity: Severity }>;
}

interface Alert {
  id: string;
  severity: Severity;
  module: string;
  message: string;
  time: string;
}

interface PipelineStage {
  name: string;
  status: PipelineStageStatus;
}

interface PipelineRun {
  id: string;
  branch: string;
  commit: string;
  status: 'passed' | 'failed';
  duration: string;
  time: string;
  stages: PipelineStage[];
}

interface SentinelData {
  overallScore: number;
  lastUpdated: string;
  testSuites: TestSuiteResult[];
  coverage: CoverageMetric[];
  modules: ModuleHealth[];
  designCompliance: DesignCompliance;
  alerts: Alert[];
  pipelines: PipelineRun[];
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_DATA: SentinelData = {
  overallScore: 94,
  lastUpdated: '2026-03-01T14:32:00Z',
  testSuites: [
    { label: 'Unit Tests', passed: 1847, total: 1853 },
    { label: 'Integration Tests', passed: 342, total: 348 },
    { label: 'E2E Tests', passed: 127, total: 128 },
    { label: 'Security Tests', passed: 89, total: 89 },
  ],
  coverage: [
    { label: 'Overall Coverage', value: 91.3 },
    { label: 'Branch Coverage', value: 87.6 },
    { label: 'Calculation Engine', value: 100.0, requiredLabel: '100% required' },
  ],
  modules: [
    { name: 'Planning Engine', score: 97, trend: [92, 93, 94, 95, 96, 96, 97] },
    { name: 'Proposal Engine', score: 95, trend: [90, 91, 93, 94, 94, 95, 95] },
    { name: 'Debt Engine', score: 96, trend: [88, 90, 92, 94, 95, 96, 96] },
    { name: 'Tax Engine', score: 98, trend: [95, 96, 96, 97, 97, 98, 98] },
    { name: 'Calc Engine', score: 100, trend: [100, 100, 100, 100, 100, 100, 100] },
    { name: 'Analytics Engine', score: 93, trend: [89, 90, 91, 92, 92, 93, 93] },
    { name: 'Design System', score: 91, trend: [85, 87, 88, 89, 90, 90, 91] },
    { name: 'Household', score: 94, trend: [90, 91, 92, 93, 93, 94, 94] },
    { name: 'Integrations', score: 88, trend: [82, 84, 85, 86, 87, 87, 88] },
    { name: 'API', score: 96, trend: [93, 94, 94, 95, 95, 96, 96] },
    { name: 'Client Portal', score: 92, trend: [87, 88, 89, 90, 91, 91, 92] },
    { name: 'FP-Pulse', score: 78, trend: [70, 72, 74, 75, 76, 77, 78] },
  ],
  designCompliance: {
    violations: 2,
    score: 96,
    recentViolations: [
      { component: 'LegacyTable', rule: 'Use Prism DataGrid instead of raw <table>', severity: 'warning' },
      { component: 'OldTooltip', rule: 'Non-standard tooltip styling detected', severity: 'info' },
    ],
  },
  alerts: [
    { id: 'a1', severity: 'warning', module: 'FP-Pulse', time: '14 min ago', message: 'Module health below 80 threshold — review recommended' },
    { id: 'a2', severity: 'info', module: 'Design System', time: '1 hr ago', message: 'New Prism token audit completed — 2 legacy tokens flagged' },
    { id: 'a3', severity: 'warning', module: 'Integrations', time: '2 hrs ago', message: 'Integration test flake rate increased to 1.7%' },
    { id: 'a4', severity: 'info', module: 'Tax Engine', time: '3 hrs ago', message: 'Coverage improvement: 97.2% → 98.0%' },
    { id: 'a5', severity: 'info', module: 'Debt Engine', time: '5 hrs ago', message: 'All 96 debt calculation edge cases passing' },
  ],
  pipelines: [
    {
      id: 'p1', branch: 'main', commit: 'a3f92c1', status: 'passed', duration: '8m 42s', time: '32 min ago',
      stages: [
        { name: 'Code Quality', status: 'passed' },
        { name: 'Unit Tests', status: 'passed' },
        { name: 'Integration', status: 'passed' },
        { name: 'Design', status: 'passed' },
        { name: 'Security', status: 'passed' },
        { name: 'Deploy Gate', status: 'passed' },
      ],
    },
    {
      id: 'p2', branch: 'feat/pulse-alerts', commit: 'e7b41d0', status: 'failed', duration: '5m 18s', time: '1 hr ago',
      stages: [
        { name: 'Code Quality', status: 'passed' },
        { name: 'Unit Tests', status: 'passed' },
        { name: 'Integration', status: 'failed' },
        { name: 'Design', status: 'pending' },
        { name: 'Security', status: 'pending' },
        { name: 'Deploy Gate', status: 'pending' },
      ],
    },
    {
      id: 'p3', branch: 'fix/debt-calc-edge', commit: 'c1d82f3', status: 'passed', duration: '7m 56s', time: '3 hrs ago',
      stages: [
        { name: 'Code Quality', status: 'passed' },
        { name: 'Unit Tests', status: 'passed' },
        { name: 'Integration', status: 'passed' },
        { name: 'Design', status: 'passed' },
        { name: 'Security', status: 'passed' },
        { name: 'Deploy Gate', status: 'passed' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHealthStatus(score: number): HealthStatus {
  if (score >= 90) return 'healthy';
  if (score >= 70) return 'degraded';
  return 'critical';
}

function getStatusStyles(status: HealthStatus): { dot: string; badge: string; label: string } {
  switch (status) {
    case 'healthy':
      return { dot: 'bg-success-500', badge: 'bg-success-50 text-success-700', label: 'Healthy' };
    case 'degraded':
      return { dot: 'bg-warning-500', badge: 'bg-warning-50 text-warning-700', label: 'Degraded' };
    case 'critical':
      return { dot: 'bg-critical-500', badge: 'bg-critical-50 text-critical-700', label: 'Critical' };
  }
}

function getSeverityStyles(severity: Severity): string {
  switch (severity) {
    case 'critical': return 'bg-critical-50 text-critical-700';
    case 'warning': return 'bg-warning-50 text-warning-700';
    case 'info': return 'bg-info-50 text-info-700';
  }
}

function getPassRateColor(passed: number, total: number): string {
  const rate = total > 0 ? passed / total : 0;
  if (rate >= 0.98) return 'bg-success-500';
  if (rate >= 0.90) return 'bg-warning-500';
  return 'bg-critical-500';
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-success-700';
  if (score >= 70) return 'text-warning-700';
  return 'text-critical-700';
}

function getScoreDotColor(score: number): string {
  if (score >= 90) return 'bg-success-500';
  if (score >= 70) return 'bg-warning-500';
  return 'bg-critical-500';
}

function getPipelineStageColor(status: PipelineStageStatus): string {
  switch (status) {
    case 'passed': return 'bg-success-500';
    case 'failed': return 'bg-critical-500';
    case 'running': return 'bg-info-500 animate-pulse';
    case 'pending': return 'bg-white/[0.10]';
  }
}

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function HeroSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-8 shadow-sm animate-pulse">
      <div className="flex flex-col items-center gap-4">
        <div className="h-5 w-52 rounded bg-white/[0.06]" />
        <div className="h-32 w-32 rounded-full bg-white/[0.06]" />
        <div className="h-6 w-24 rounded-full bg-white/[0.06]" />
        <div className="h-3 w-36 rounded bg-white/[0.06]" />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 shadow-sm animate-pulse">
      <div className="h-3 w-24 rounded bg-white/[0.06] mb-3" />
      <div className="h-8 w-28 rounded bg-white/[0.06] mb-2" />
      <div className="h-2 w-full rounded bg-white/[0.06]" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-limestone-100">
          <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
          <div className="h-4 w-24 rounded bg-white/[0.06]" />
          <div className="h-4 flex-1 rounded bg-white/[0.06]" />
          <div className="h-4 w-20 rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function CircularScore({ score }: { score: number }) {
  const status = getHealthStatus(score);
  const styles = getStatusStyles(status);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor =
    status === 'healthy' ? '#22c55e' :
    status === 'degraded' ? '#f59e0b' :
    '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="144" height="144" viewBox="0 0 128 128" className="-rotate-90">
        <circle
          cx="64" cy="64" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
        />
        <circle
          cx="64" cy="64" r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className="text-xs font-medium text-white/50">/ 100</span>
      </div>
    </div>
  );
}

function Sparkline({ data, width = 56, height = 20 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const lastScore = data[data.length - 1];
  const color = lastScore >= 90 ? '#22c55e' : lastScore >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TestSuiteCard({ suite }: { suite: TestSuiteResult }) {
  const rate = suite.total > 0 ? (suite.passed / suite.total) * 100 : 0;
  const barColor = getPassRateColor(suite.passed, suite.total);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 shadow-sm">
      <p className="text-sm font-medium text-white/50 mb-1">{suite.label}</p>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="font-serif text-3xl text-white tracking-wide">{suite.passed}</span>
        <span className="text-sm text-white/30">/ {suite.total}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className="text-xs text-white/30 mt-1.5">{rate.toFixed(1)}% pass rate</p>
    </div>
  );
}

function CoverageCard({ metric }: { metric: CoverageMetric }) {
  const pct = Math.min(100, metric.value);
  const barColor = pct >= 90 ? 'bg-success-500' : pct >= 80 ? 'bg-warning-500' : 'bg-critical-500';

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-white/50">{metric.label}</p>
        {metric.requiredLabel && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-success-700 bg-success-50 px-2 py-0.5 rounded-full">
            {metric.requiredLabel}
          </span>
        )}
      </div>
      <p className="font-serif text-3xl text-white tracking-wide mb-3">{metric.value.toFixed(1)}%</p>
      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ModuleCard({ module }: { module: ModuleHealth }) {
  const status = getHealthStatus(module.score);
  const dotColor = getScoreDotColor(module.score);
  const scoreColor = getScoreColor(module.score);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
          <p className="text-sm font-semibold text-white">{module.name}</p>
        </div>
        <Sparkline data={module.trend} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${scoreColor}`}>{module.score}</span>
        <span className="text-xs text-white/30">/ 100</span>
      </div>
      <p className="text-xs text-white/30 mt-0.5 capitalize">
        {getStatusStyles(status).label}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function SentinelDashboardPage() {
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SentinelData | null>(null);
  const [alertSortField, setAlertSortField] = useState<'severity' | 'module' | 'time'>('time');
  const [alertSortDir, setAlertSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate network request with mock data
      await new Promise((resolve) => setTimeout(resolve, 800));
      setData(MOCK_DATA);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load Sentinel dashboard';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Alert sorting
  const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

  const sortedAlerts = data
    ? [...data.alerts].sort((a, b) => {
        const mul = alertSortDir === 'asc' ? 1 : -1;
        if (alertSortField === 'severity') {
          return mul * (severityOrder[a.severity] - severityOrder[b.severity]);
        }
        if (alertSortField === 'module') {
          return mul * a.module.localeCompare(b.module);
        }
        // 'time' — keep original order (already sorted by time in mock)
        return mul * (data.alerts.indexOf(a) - data.alerts.indexOf(b));
      })
    : [];

  const toggleAlertSort = (field: typeof alertSortField) => {
    if (alertSortField === field) {
      setAlertSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setAlertSortField(field);
      setAlertSortDir('desc');
    }
  };

  const sortIcon = (field: typeof alertSortField) =>
    alertSortField === field ? (alertSortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  if (error && !loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="font-serif text-3xl text-white tracking-wide">Quality Dashboard</h1>
          <p className="mt-1 text-sm text-white/50">FP-Sentinel — System Quality & Health Monitor</p>
        </div>
        <div className="rounded-lg border border-critical-200 bg-critical-50 p-6 text-center">
          <p className="text-sm font-medium text-critical-700 mb-3">{error}</p>
          <button
            onClick={fetchData}
            className="rounded-lg bg-steel-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-steel-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const overallStatus = data ? getHealthStatus(data.overallScore) : 'healthy';
  const overallStyles = getStatusStyles(overallStatus);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-white tracking-wide">Quality Dashboard</h1>
          <p className="mt-1 text-sm text-white/50">
            FP-Sentinel — System Quality & Health Monitor
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04] transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* 1. Hero — Overall System Health Score */}
      {loading ? (
        <HeroSkeleton />
      ) : data ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-8 shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-white/50">
              System Health Score
            </h2>
            <CircularScore score={data.overallScore} />
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${overallStyles.badge}`}>
              {overallStyles.label}
            </span>
            <p className="text-xs text-white/30">
              Last updated: {new Date(data.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>
      ) : null}

      {/* 2. Test Suite Status Cards */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-white/30 mb-3">Test Suites</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            : data?.testSuites.map((suite) => (
                <TestSuiteCard key={suite.label} suite={suite} />
              ))}
        </div>
      </div>

      {/* 3. Coverage Metrics */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-white/30 mb-3">Coverage Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            : data?.coverage.map((metric) => (
                <CoverageCard key={metric.label} metric={metric} />
              ))}
        </div>
      </div>

      {/* 4. Module Health Grid */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-white/30 mb-3">Module Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)
            : data?.modules.map((mod) => (
                <ModuleCard key={mod.name} module={mod} />
              ))}
        </div>
      </div>

      {/* 5. Design Compliance */}
      {loading ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm animate-pulse">
          <div className="h-5 w-40 rounded bg-white/[0.06] mb-4" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-white/[0.06]" />
            <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
          </div>
        </div>
      ) : data ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-limestone-100">
            <h3 className="text-base font-semibold text-white">Design Compliance</h3>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-white/30">Violations</p>
                <p className={`text-lg font-bold ${data.designCompliance.violations === 0 ? 'text-success-700' : 'text-warning-700'}`}>
                  {data.designCompliance.violations}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/30">Design Score</p>
                <p className="text-lg font-bold text-white">{data.designCompliance.score}</p>
              </div>
            </div>
          </div>
          {data.designCompliance.recentViolations.length > 0 ? (
            <div className="divide-y divide-limestone-100">
              {data.designCompliance.recentViolations.map((v, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getSeverityStyles(v.severity)}`}>
                    {v.severity}
                  </span>
                  <span className="text-sm font-medium text-white">{v.component}</span>
                  <span className="text-sm text-white/50 flex-1">{v.rule}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-white/50">No design violations detected.</p>
            </div>
          )}
        </div>
      ) : null}

      {/* 6. Recent Alerts Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-limestone-100">
          <h3 className="text-base font-semibold text-white">Recent Alerts</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6"><TableSkeleton /></div>
          ) : sortedAlerts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-white/50">No recent alerts.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-limestone-100 bg-transparent/50">
                  <th
                    className="px-6 py-3 text-xs font-semibold uppercase text-white/30 cursor-pointer select-none"
                    onClick={() => toggleAlertSort('severity')}
                  >
                    Severity{sortIcon('severity')}
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-semibold uppercase text-white/30 cursor-pointer select-none"
                    onClick={() => toggleAlertSort('module')}
                  >
                    Module{sortIcon('module')}
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-white/30">
                    Message
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-semibold uppercase text-white/30 text-right cursor-pointer select-none"
                    onClick={() => toggleAlertSort('time')}
                  >
                    Time{sortIcon('time')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-limestone-100">
                {sortedAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-white/[0.04]/50 transition-colors">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getSeverityStyles(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-white">{alert.module}</td>
                    <td className="px-3 py-3 text-white/50">{alert.message}</td>
                    <td className="px-3 py-3 text-right text-white/30">{alert.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 7. CI/CD Pipeline Status */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-white/30 mb-3">CI/CD Pipelines</h3>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 shadow-sm animate-pulse">
                <div className="h-4 w-48 rounded bg-white/[0.06] mb-3" />
                <div className="flex gap-2">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="h-3 w-20 rounded bg-white/[0.06]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {data?.pipelines.map((pipeline) => (
              <div key={pipeline.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 shadow-sm">
                {/* Pipeline header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        pipeline.status === 'passed'
                          ? 'bg-success-50 text-success-700'
                          : 'bg-critical-50 text-critical-700'
                      }`}
                    >
                      {pipeline.status === 'passed' ? 'Passed' : 'Failed'}
                    </span>
                    <span className="text-sm font-semibold text-white">{pipeline.branch}</span>
                    <span className="text-xs font-mono text-white/30">{pipeline.commit}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    <span>{pipeline.duration}</span>
                    <span>{pipeline.time}</span>
                  </div>
                </div>

                {/* Stage progression */}
                <div className="flex items-center gap-1">
                  {pipeline.stages.map((stage, idx) => (
                    <React.Fragment key={stage.name}>
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className={`h-2 w-full rounded-full ${getPipelineStageColor(stage.status)}`} />
                        <span className="text-[10px] text-white/30 text-center leading-tight">
                          {stage.name}
                        </span>
                      </div>
                      {idx < pipeline.stages.length - 1 && (
                        <svg className="h-3 w-3 text-white/30 flex-shrink-0 mt-[-10px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
