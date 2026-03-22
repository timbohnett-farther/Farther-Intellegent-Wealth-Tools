'use client';

import React from 'react';
import {
  Target,
  GraduationCap,
  Home,
  Car,
  Palmtree,
  Heart,
  Briefcase,
  Landmark,
  Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GoalStatus = 'on_track' | 'at_risk' | 'funded' | 'underfunded';

export interface GoalCardData {
  goalId: string;
  goalName: string;
  goalType: string;
  targetAmount: number;
  targetYear: number;
  fundedRatio: number;
  probabilityOfMeeting: number;
  status: GoalStatus;
  shortfall: number;
  additionalMonthlySavingsNeeded: number;
}

export interface GoalCardsGridProps {
  goals: GoalCardData[];
  /** Additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

const GOAL_ICON_MAP: Record<string, LucideIcon> = {
  retirement: Target,
  education: GraduationCap,
  education_college: GraduationCap,
  home: Home,
  home_purchase: Home,
  car: Car,
  vehicle: Car,
  travel: Palmtree,
  vacation: Palmtree,
  health: Heart,
  healthcare: Heart,
  business: Briefcase,
  estate: Landmark,
  legacy: Landmark,
  insurance: Shield,
  protection: Shield,
};

function getGoalIcon(goalType: string): LucideIcon {
  const normalized = goalType.toLowerCase().replace(/[\s-]/g, '_');
  return GOAL_ICON_MAP[normalized] ?? Target;
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<GoalStatus, { label: string; bg: string; text: string }> = {
  on_track: { label: 'On Track', bg: 'bg-success-50', text: 'text-success-700' },
  funded: { label: 'Funded', bg: 'bg-success-50', text: 'text-success-700' },
  at_risk: { label: 'At Risk', bg: 'bg-warning-50', text: 'text-warning-700' },
  underfunded: { label: 'Underfunded', bg: 'bg-critical-50', text: 'text-critical-700' },
};

// ---------------------------------------------------------------------------
// Progress bar color
// ---------------------------------------------------------------------------

function getProgressColor(fundedRatio: number): string {
  if (fundedRatio >= 0.95) return 'bg-success-500';
  if (fundedRatio >= 0.5) return 'bg-warning-500';
  return 'bg-critical-500';
}

function getProgressTrackColor(fundedRatio: number): string {
  if (fundedRatio >= 0.95) return 'bg-success-100';
  if (fundedRatio >= 0.5) return 'bg-warning-100';
  return 'bg-critical-100';
}

// ---------------------------------------------------------------------------
// Single Goal Card
// ---------------------------------------------------------------------------

function GoalCardItem({ goal }: { goal: GoalCardData }) {
  const Icon = getGoalIcon(goal.goalType);
  const statusCfg = STATUS_CONFIG[goal.status];
  const progressPercent = Math.min(goal.fundedRatio * 100, 100);

  return (
    <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
      {/* Header: icon + name + target year */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
            <Icon className="h-4 w-4 text-brand-700" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-charcoal-900 truncate">
              {goal.goalName}
            </h3>
            <span className="text-xs text-charcoal-300">Target {goal.targetYear}</span>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.bg} ${statusCfg.text}`}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Target amount */}
      <p className="mt-3 text-lg font-bold tabular-nums text-charcoal-900">
        {formatCurrency(goal.targetAmount)}
      </p>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-charcoal-500">Funded</span>
          <span className="text-xs font-medium tabular-nums text-charcoal-700">
            {formatPercent(goal.fundedRatio)}
          </span>
        </div>
        <div
          className={`h-2 w-full overflow-hidden rounded-full ${getProgressTrackColor(goal.fundedRatio)}`}
        >
          <div
            className={`h-full rounded-full transition-all ${getProgressColor(goal.fundedRatio)}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Probability */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-charcoal-300">Probability</span>
        <span className="text-xs font-medium tabular-nums text-charcoal-500">
          {Math.round(goal.probabilityOfMeeting * 100)}%
        </span>
      </div>

      {/* Additional savings needed (only for underfunded goals) */}
      {goal.status === 'underfunded' && goal.additionalMonthlySavingsNeeded > 0 && (
        <div className="mt-3 rounded-md bg-critical-50 px-3 py-2">
          <p className="text-[11px] text-critical-700">
            <span className="font-medium">Shortfall:</span>{' '}
            <span className="tabular-nums">{formatCurrency(goal.shortfall)}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-critical-500">
            Save an additional{' '}
            <span className="font-semibold tabular-nums">
              {formatCurrency(goal.additionalMonthlySavingsNeeded)}
            </span>
            /mo to close the gap
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoalCardsGrid({ goals, className }: GoalCardsGridProps) {
  if (goals.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm text-charcoal-300">No goals configured.</p>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className ?? ''}`}
    >
      {goals.map((goal) => (
        <GoalCardItem key={goal.goalId} goal={goal} />
      ))}
    </div>
  );
}

GoalCardsGrid.displayName = 'GoalCardsGrid';
