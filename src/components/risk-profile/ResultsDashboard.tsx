'use client';

import React from 'react';
import { RiskProfile, DIMENSION_LABELS, RiskDimension } from '@/lib/risk-profile/types';

interface ResultsDashboardProps {
  profile: RiskProfile;
  onRestart: () => void;
}

const PROFILE_COLORS: Record<string, { bg: string; text: string; ring: string; gradient: string }> = {
  'Very Conservative': { bg: 'bg-blue-100', text: 'text-blue-800', ring: 'ring-blue-300', gradient: 'from-blue-500 to-cyan-500' },
  'Conservative': { bg: 'bg-sky-100', text: 'text-sky-800', ring: 'ring-sky-300', gradient: 'from-sky-500 to-blue-500' },
  'Moderate': { bg: 'bg-amber-100', text: 'text-amber-800', ring: 'ring-amber-300', gradient: 'from-amber-500 to-yellow-500' },
  'Aggressive': { bg: 'bg-orange-100', text: 'text-orange-800', ring: 'ring-orange-300', gradient: 'from-orange-500 to-red-500' },
  'Very Aggressive': { bg: 'bg-red-100', text: 'text-red-800', ring: 'ring-red-300', gradient: 'from-red-500 to-rose-600' },
};

const ALLOCATION_COLORS: Record<string, string> = {
  stocks: '#3B82F6',
  bonds: '#10B981',
  cash: '#F59E0B',
};

function ScoreBar({ label, score, max = 5 }: { label: string; score: number; max?: number }) {
  const pct = (score / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-32 text-right flex-shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-800 w-8">{score.toFixed(1)}</span>
    </div>
  );
}

function AllocationBar({ allocation }: { allocation: { stocks: number; bonds: number; cash: number } }) {
  return (
    <div>
      <div className="flex h-8 rounded-lg overflow-hidden">
        {allocation.stocks > 0 && (
          <div
            className="flex items-center justify-center text-white text-[11px] font-semibold transition-all duration-700"
            style={{ width: `${allocation.stocks}%`, backgroundColor: ALLOCATION_COLORS.stocks }}
          >
            {allocation.stocks}%
          </div>
        )}
        {allocation.bonds > 0 && (
          <div
            className="flex items-center justify-center text-white text-[11px] font-semibold transition-all duration-700"
            style={{ width: `${allocation.bonds}%`, backgroundColor: ALLOCATION_COLORS.bonds }}
          >
            {allocation.bonds}%
          </div>
        )}
        {allocation.cash > 0 && (
          <div
            className="flex items-center justify-center text-white text-[11px] font-semibold transition-all duration-700"
            style={{ width: `${allocation.cash}%`, backgroundColor: ALLOCATION_COLORS.cash }}
          >
            {allocation.cash}%
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: ALLOCATION_COLORS.stocks }} />
          <span className="text-xs text-gray-600">Stocks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: ALLOCATION_COLORS.bonds }} />
          <span className="text-xs text-gray-600">Bonds</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: ALLOCATION_COLORS.cash }} />
          <span className="text-xs text-gray-600">Cash</span>
        </div>
      </div>
    </div>
  );
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  let color = 'text-red-600';
  let bgColor = 'from-red-400 to-red-500';
  let label = 'Low';
  if (confidence >= 90) {
    color = 'text-green-600';
    bgColor = 'from-green-400 to-green-500';
    label = 'Very High';
  } else if (confidence >= 75) {
    color = 'text-blue-600';
    bgColor = 'from-blue-400 to-blue-500';
    label = 'High';
  } else if (confidence >= 60) {
    color = 'text-amber-600';
    bgColor = 'from-amber-400 to-amber-500';
    label = 'Moderate';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Assessment Confidence</span>
        <span className={`text-sm font-bold ${color}`}>{confidence}% — {label}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${bgColor} transition-all duration-700`}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  );
}

export default function ResultsDashboard({ profile, onRestart }: ResultsDashboardProps) {
  const colors = PROFILE_COLORS[profile.profile] ?? PROFILE_COLORS['Moderate'];
  const dimensionEntries = Object.entries(profile.dimensionScores) as [RiskDimension, number][];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Badge */}
      <div className="card p-8 text-center">
        <p className="text-sm text-gray-500 mb-2">Your Risk Profile</p>
        <div className={`inline-flex items-center px-6 py-3 rounded-2xl ${colors.bg} ${colors.ring} ring-2`}>
          <span className={`text-2xl font-bold ${colors.text}`}>{profile.profile}</span>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-500">
          <span>Level <strong className="text-gray-800">{profile.level}</strong>/5</span>
          <span>Score <strong className="text-gray-800">{profile.overallScore.toFixed(2)}</strong>/5.00</span>
          <span>Questions <strong className="text-gray-800">{profile.questionCount}</strong></span>
        </div>
      </div>

      {/* Dimension Scores */}
      <div className="card p-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Risk Dimension Scores</h4>
        <div className="space-y-3">
          {dimensionEntries
            .filter(([, score]) => score > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([dim, score]) => (
              <ScoreBar
                key={dim}
                label={DIMENSION_LABELS[dim] ?? dim}
                score={score}
              />
            ))}
        </div>
      </div>

      {/* Recommended Allocation */}
      <div className="card p-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Recommended Asset Allocation</h4>
        <AllocationBar allocation={profile.recommendedAllocation} />
      </div>

      {/* Confidence */}
      <div className="card p-6">
        <ConfidenceMeter confidence={profile.confidence} />
      </div>

      {/* Contradictions */}
      {profile.contradictions.length > 0 && (
        <div className="card p-6 border-amber-200 bg-amber-50">
          <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Response Inconsistencies Detected
          </h4>
          <ul className="space-y-2">
            {profile.contradictions.map((c, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                {c.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclosures */}
      <div className="p-4 bg-gray-100 rounded-lg text-[10px] text-gray-400 space-y-1 leading-relaxed">
        <p>This risk profile assessment is for educational and illustrative purposes only and does not constitute investment advice.</p>
        <p>Risk tolerance is one component of investment suitability. A comprehensive financial plan should consider tax situation, estate plans, insurance needs, and other factors.</p>
        <p>Recommended allocations are general guidelines. Actual portfolio construction should be tailored by a qualified financial advisor.</p>
        <p>FINRA and CFP Board compliant methodology. Weighted scoring across 7 dimensions with contradiction detection.</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onRestart}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retake Assessment
        </button>
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}
