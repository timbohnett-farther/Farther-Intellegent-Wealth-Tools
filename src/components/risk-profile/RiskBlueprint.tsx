'use client';

import React from 'react';
import type {
  RiskProfile,
  RiskBand,
  AxisScores,
  GoalFeasibility,
} from '@/lib/risk-profile/types';
import { RISK_BAND_LABELS, RISK_BAND_DESCRIPTIONS, AXIS_LABELS } from '@/lib/risk-profile/types';

interface RiskBlueprintProps {
  profile: RiskProfile;
}

const BAND_COLORS: Record<RiskBand, { bg: string; text: string; bar: string }> = {
  1: { bg: 'bg-teal-500/15', text: 'text-teal-300', bar: 'from-brand-400 to-brand-700' },
  2: { bg: 'bg-cyan-100', text: 'text-cyan-800', bar: 'from-cyan-400 to-cyan-500' },
  3: { bg: 'bg-teal-500/15', text: 'text-teal-300', bar: 'from-brand-400 to-brand-700' },
  4: { bg: 'bg-warning-100', text: 'text-warning-700', bar: 'from-warning-500 to-warning-700' },
  5: { bg: 'bg-orange-100', text: 'text-orange-800', bar: 'from-orange-400 to-orange-500' },
  6: { bg: 'bg-critical-100', text: 'text-critical-700', bar: 'from-critical-500 to-critical-700' },
  7: { bg: 'bg-rose-100', text: 'text-rose-800', bar: 'from-rose-500 to-rose-600' },
};

function AxisBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/50 w-28 text-right flex-shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-brand-400 to-brand-700 transition-all duration-700 ease-out"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-white w-10">{score}</span>
    </div>
  );
}

function BandBadge({ band, size = 'lg' }: { band: RiskBand; size?: 'sm' | 'lg' }) {
  const colors = BAND_COLORS[band];
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${colors.bg} ring-2 ring-opacity-40`}
         style={{ '--tw-ring-color': 'currentColor' } as React.CSSProperties}>
      <span className={`${size === 'lg' ? 'text-2xl' : 'text-sm'} font-bold ${colors.text}`}>
        {band}
      </span>
      <span className={`${size === 'lg' ? 'text-sm' : 'text-xs'} font-medium ${colors.text}`}>
        {RISK_BAND_LABELS[band]}
      </span>
    </div>
  );
}

function GoalFeasibilityRow({ goal }: { goal: GoalFeasibility }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${goal.feasible ? 'bg-success-50' : 'bg-warning-50'}`}>
      <div>
        <span className="text-sm font-medium text-white">{goal.goalName}</span>
        <span className="text-xs text-white/50 ml-2">
          needs {(goal.requiredReturn * 100).toFixed(1)}% return
        </span>
      </div>
      <div className="flex items-center gap-2">
        {goal.feasible ? (
          <span className="text-xs font-semibold text-success-700 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            On Track
          </span>
        ) : (
          <span className="text-xs font-semibold text-warning-700 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Shortfall
          </span>
        )}
      </div>
    </div>
  );
}

export default function RiskBlueprint({ profile }: RiskBlueprintProps) {
  const { axisScores, recommendedBand, toleranceBand, capacityBand } = profile;

  return (
    <div className="space-y-6">
      {/* Primary Result */}
      <div className="card p-8 text-center">
        <p className="text-sm text-white/50 mb-3">Recommended Risk Band</p>
        <BandBadge band={recommendedBand} />
        <p className="text-sm text-white/50 mt-4 max-w-md mx-auto leading-relaxed">
          {RISK_BAND_DESCRIPTIONS[recommendedBand]}
        </p>

        {toleranceBand !== capacityBand && (
          <div className="mt-4 p-3 bg-warning-50 rounded-lg text-xs text-warning-700">
            <strong>Note:</strong> Your tolerance band ({toleranceBand} — {RISK_BAND_LABELS[toleranceBand]}) differs from your capacity band ({capacityBand} — {RISK_BAND_LABELS[capacityBand]}). The recommendation uses the lower of the two for safety.
          </div>
        )}
      </div>

      {/* Multi-Axis Scores */}
      <div className="card p-6">
        <h4 className="text-sm font-semibold text-white/60 mb-4">Risk Profile Axes</h4>
        <div className="space-y-3">
          <AxisBar label={AXIS_LABELS.tolerance} score={Math.round(axisScores.tolerance)} />
          <AxisBar label={AXIS_LABELS.capacity} score={Math.round(axisScores.capacity)} />
          <AxisBar label={AXIS_LABELS.complexity} score={Math.round(axisScores.complexity)} />
        </div>
        <div className="mt-4 pt-4 border-t border-limestone-100 flex items-center justify-between">
          <span className="text-xs text-white/50">Required Return to Meet Goals</span>
          <span className="text-sm font-bold text-white">{(axisScores.need * 100).toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-white/50">Behavioral Bias Index</span>
          <span className={`text-sm font-bold ${axisScores.biasIndex > 60 ? 'text-warning-500' : axisScores.biasIndex > 30 ? 'text-white/50' : 'text-success-500'}`}>
            {Math.round(axisScores.biasIndex)} / 100
          </span>
        </div>
      </div>

      {/* Goal Feasibility */}
      {profile.goalFeasibility.length > 0 && (
        <div className="card p-6">
          <h4 className="text-sm font-semibold text-white/60 mb-3">Goal Feasibility</h4>
          <div className="space-y-2">
            {profile.goalFeasibility.map((g, i) => (
              <GoalFeasibilityRow key={i} goal={g} />
            ))}
          </div>
          {profile.goalFeasibility.some(g => !g.feasible) && (
            <p className="text-xs text-warning-500 mt-3">
              Some goals may require saving more, extending time horizons, or accepting higher risk.
            </p>
          )}
        </div>
      )}

      {/* Confidence */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/50">Assessment Confidence</span>
          <span className={`text-sm font-bold ${profile.confidence >= 80 ? 'text-success-500' : profile.confidence >= 60 ? 'text-teal-300' : 'text-warning-500'}`}>
            {profile.confidence}%
          </span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-linear-to-r ${profile.confidence >= 80 ? 'from-success-500 to-success-700' : profile.confidence >= 60 ? 'from-brand-400 to-brand-700' : 'from-warning-500 to-warning-700'} transition-all duration-700`}
            style={{ width: `${profile.confidence}%` }}
          />
        </div>
      </div>
    </div>
  );
}
