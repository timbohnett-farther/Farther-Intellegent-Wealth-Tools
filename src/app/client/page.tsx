'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Target,
  CalendarDays,
  Phone,
  Mail,
  ArrowUpRight,
  PiggyBank,
  Clock,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

// ── Mock Data ──────────────────────────────────────────────────────
const CLIENT = {
  firstName: 'Sarah',
  lastName: 'Mitchell',
  advisorName: 'John Doe',
  advisorPhone: '(212) 555-0187',
  advisorEmail: 'john.doe@farther.com',
  lastUpdated: '2026-02-25',
};

const KPI = {
  netWorth: 3_450_000,
  planSuccessRate: 87,
  retirementFundedPct: 72,
  retirementGoalAge: 65,
  nextMeeting: '2026-03-15T10:00:00',
};

const GOALS = [
  { id: '1', name: 'Retirement at 65', target: 5_000_000, current: 3_600_000, category: 'retirement' },
  { id: '2', name: 'College Fund — Emma', target: 250_000, current: 145_000, category: 'education' },
  { id: '3', name: 'Vacation Home', target: 800_000, current: 320_000, category: 'lifestyle' },
  { id: '4', name: 'Emergency Fund', target: 150_000, current: 150_000, category: 'safety_net' },
];

const ACTION_ITEMS = [
  {
    id: '1',
    icon: PiggyBank,
    title: 'Increase 401(k) contributions',
    description: 'Raising your 401(k) by $500/mo could add $180K by retirement.',
    impact: '+3% success rate',
  },
  {
    id: '2',
    icon: Clock,
    title: 'Consider delaying retirement 1 year',
    description: 'Working one extra year adds Social Security benefits and reduces withdrawal years.',
    impact: '+5% success rate',
  },
  {
    id: '3',
    icon: RefreshCw,
    title: 'Roth conversion opportunity',
    description: 'Converting $50K this year while in a lower bracket could save $12K+ in future taxes.',
    impact: '$12K tax savings',
  },
];

// ── Helpers ────────────────────────────────────────────────────────
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMeetingDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function goalColor(pct: number) {
  if (pct >= 90) return 'bg-goal-funded';
  if (pct >= 50) return 'bg-goal-partial';
  return 'bg-goal-at-risk';
}

// ── Gauge Component ────────────────────────────────────────────────
function SuccessGauge({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 40;
  const strokeDash = (value / 100) * circumference;
  const color =
    value >= 80 ? '#2E8B57' : value >= 60 ? '#D4860B' : '#C0392B';

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#E4DDD4"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-charcoal-900">{value}%</span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function ClientHomePage() {
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">
            Hello, {CLIENT.firstName}
          </h1>
          <p className="text-sm text-charcoal-500 mt-1">
            Last updated {formatDate(CLIENT.lastUpdated)}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-charcoal-500 bg-white border border-limestone-200 rounded-lg px-4 py-3">
          <span className="font-medium text-charcoal-900">
            Your Advisor: {CLIENT.advisorName}
          </span>
          <span className="hidden sm:inline text-charcoal-300">|</span>
          <a
            href={`tel:${CLIENT.advisorPhone}`}
            className="flex items-center gap-1 hover:text-brand-500"
          >
            <Phone size={14} /> {CLIENT.advisorPhone}
          </a>
          <a
            href={`mailto:${CLIENT.advisorEmail}`}
            className="flex items-center gap-1 hover:text-brand-500"
          >
            <Mail size={14} /> Email
          </a>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth */}
        <div className="bg-white rounded-card border border-limestone-200 p-5">
          <div className="flex items-center gap-2 text-sm text-charcoal-500 mb-2">
            <TrendingUp size={16} />
            Net Worth
          </div>
          <p className="text-2xl font-bold text-charcoal-900">
            {formatCurrency(KPI.netWorth)}
          </p>
        </div>

        {/* Plan Success Rate */}
        <div className="bg-white rounded-card border border-limestone-200 p-5 flex items-center gap-4">
          <SuccessGauge value={KPI.planSuccessRate} />
          <div>
            <div className="text-sm text-charcoal-500">Plan Success Rate</div>
            <p className="text-lg font-semibold text-charcoal-900 mt-0.5">
              {KPI.planSuccessRate}% probability
            </p>
          </div>
        </div>

        {/* Retirement Goal */}
        <div className="bg-white rounded-card border border-limestone-200 p-5">
          <div className="flex items-center gap-2 text-sm text-charcoal-500 mb-2">
            <Target size={16} />
            Retirement Goal
          </div>
          <p className="text-2xl font-bold text-charcoal-900">
            {KPI.retirementFundedPct}% funded
          </p>
          <p className="text-xs text-charcoal-500 mt-1">
            Target age {KPI.retirementGoalAge}
          </p>
        </div>

        {/* Next Meeting */}
        <div className="bg-white rounded-card border border-limestone-200 p-5">
          <div className="flex items-center gap-2 text-sm text-charcoal-500 mb-2">
            <CalendarDays size={16} />
            Next Meeting
          </div>
          <p className="text-lg font-semibold text-charcoal-900">
            {formatMeetingDate(KPI.nextMeeting)}
          </p>
        </div>
      </div>

      {/* ── Plan Health Summary ── */}
      <div className="bg-gradient-to-r from-brand-50 to-white border border-brand-100 rounded-card p-6">
        <h2 className="text-lg font-semibold text-charcoal-900 mb-2">
          Plan Health Summary
        </h2>
        <p className="text-charcoal-700 leading-relaxed">
          Based on your current savings rate and projected returns, you have an{' '}
          <span className="font-bold text-brand-600">
            {KPI.planSuccessRate}% chance
          </span>{' '}
          of fully funding your retirement at age{' '}
          <span className="font-bold">{KPI.retirementGoalAge}</span>. Your net
          worth has grown steadily and your retirement goal is{' '}
          <span className="font-bold">{KPI.retirementFundedPct}% funded</span>.
          Below are three actions you can take to improve your plan even further.
        </p>
      </div>

      {/* ── Action Items ── */}
      <div>
        <h2 className="text-lg font-semibold text-charcoal-900 mb-4">
          Recommended Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ACTION_ITEMS.map((action) => {
            const Icon = action.icon;
            const isExpanded = expandedAction === action.id;
            return (
              <button
                key={action.id}
                onClick={() =>
                  setExpandedAction(isExpanded ? null : action.id)
                }
                className="bg-white rounded-card border border-limestone-200 p-5 text-left hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-charcoal-900">
                      {action.title}
                    </h3>
                    <p className="text-xs text-charcoal-500 mt-1 leading-relaxed">
                      {action.description}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-goal-funded">
                      <ArrowUpRight size={14} />
                      {action.impact}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Goals Progress ── */}
      <div>
        <h2 className="text-lg font-semibold text-charcoal-900 mb-4">
          Goals Progress
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GOALS.map((goal) => {
            const pct = Math.round((goal.current / goal.target) * 100);
            return (
              <div
                key={goal.id}
                className="bg-white rounded-card border border-limestone-200 p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-charcoal-900">
                    {goal.name}
                  </h3>
                  <span className="text-xs font-medium text-charcoal-500">
                    {pct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-limestone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${goalColor(pct)}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-charcoal-500">
                  <span>{formatCurrency(goal.current)}</span>
                  <span>Goal: {formatCurrency(goal.target)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
