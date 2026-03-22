'use client';

import React, { useState } from 'react';
import type { RiskProfile, RiskBand } from '@/lib/risk-profile/types';
import { RISK_BAND_LABELS } from '@/lib/risk-profile/types';
import RiskBlueprint from './RiskBlueprint';
import BacktestComparison from './BacktestComparison';
import BiasFlags from './BiasFlags';
import ComplianceNotes from './ComplianceNotes';

interface ResultsDashboardProps {
  profile: RiskProfile;
  onRestart: () => void;
}

const TABS = [
  { id: 'blueprint', label: 'Risk Blueprint' },
  { id: 'portfolios', label: 'Portfolio Comparison' },
  { id: 'behavioral', label: 'Behavioral Analysis' },
  { id: 'compliance', label: 'Compliance' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ResultsDashboard({ profile, onRestart }: ResultsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('blueprint');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header summary bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Band</span>
            <span className="text-lg font-bold text-white">{profile.recommendedBand}</span>
            <span className="text-sm text-white/50">{RISK_BAND_LABELS[profile.recommendedBand]}</span>
          </div>
          <div className="h-8 w-px bg-white/[0.06]" />
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span>Tolerance <strong className="text-white">{Math.round(profile.axisScores.tolerance)}</strong></span>
            <span>Capacity <strong className="text-white">{Math.round(profile.axisScores.capacity)}</strong></span>
            <span>Need <strong className="text-white">{(profile.axisScores.need * 100).toFixed(1)}%</strong></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile.detectedBiases.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning-100 text-warning-700">
              {profile.detectedBiases.length} bias{profile.detectedBiases.length !== 1 ? 'es' : ''}
            </span>
          )}
          {profile.inconsistencies.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-critical-100 text-critical-700">
              {profile.inconsistencies.length} flag{profile.inconsistencies.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print overflow-x-auto">
        <div className="flex gap-1 border-b border-white/[0.06] min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-teal-500 text-teal-300 font-medium'
                  : 'text-white/50 hover:text-white/60'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'blueprint' && (
        <RiskBlueprint profile={profile} />
      )}

      {activeTab === 'portfolios' && (
        <BacktestComparison
          conservative={{
            portfolio: profile.conservativePortfolio,
            backtest: profile.conservativeBacktest,
          }}
          recommended={{
            portfolio: profile.recommendedPortfolio,
            backtest: profile.recommendedBacktest,
          }}
          aggressive={{
            portfolio: profile.aggressivePortfolio,
            backtest: profile.aggressiveBacktest,
          }}
        />
      )}

      {activeTab === 'behavioral' && (
        <BiasFlags
          biases={profile.detectedBiases}
          inconsistencies={profile.inconsistencies}
        />
      )}

      {activeTab === 'compliance' && (
        <ComplianceNotes profile={profile} />
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-4 no-print">
        <button
          onClick={onRestart}
          className="px-6 py-2.5 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-500 transition-colors"
        >
          Retake Assessment
        </button>
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 border border-white/[0.10] text-white/60 text-sm font-medium rounded-lg hover:bg-white/[0.04] transition-colors"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}
