'use client';

import React from 'react';
import type { DetectedBias, Inconsistency } from '@/lib/risk-profile/types';

interface BiasFlagsProps {
  biases: DetectedBias[];
  inconsistencies: Inconsistency[];
}

const BIAS_ICONS: Record<string, string> = {
  loss_aversion: 'LA',
  recency: 'RB',
  overconfidence: 'OC',
  framing: 'FR',
  herd: 'HB',
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-teal-500/10', text: 'text-teal-300', dot: 'bg-teal-400' },
  moderate: { bg: 'bg-warning-50', text: 'text-warning-700', dot: 'bg-warning-500' },
  high: { bg: 'bg-critical-50', text: 'text-critical-700', dot: 'bg-critical-500' },
  info: { bg: 'bg-teal-500/10', text: 'text-teal-300', dot: 'bg-teal-400' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-700', dot: 'bg-warning-500' },
  critical: { bg: 'bg-critical-50', text: 'text-critical-700', dot: 'bg-critical-500' },
};

export default function BiasFlags({ biases, inconsistencies }: BiasFlagsProps) {
  if (biases.length === 0 && inconsistencies.length === 0) {
    return (
      <div className="card p-6">
        <h4 className="text-sm font-semibold text-white/60 mb-2">Behavioral Analysis</h4>
        <div className="p-4 bg-success-50 rounded-lg text-sm text-success-700 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          No significant behavioral biases or inconsistencies detected. Responses are internally consistent.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Detected Biases */}
      {biases.length > 0 && (
        <div className="card p-6">
          <h4 className="text-sm font-semibold text-white/60 mb-1">Detected Behavioral Biases</h4>
          <p className="text-xs text-white/30 mb-4">
            These patterns may affect investment decision-making. Use the talking points below during client discussions.
          </p>

          <div className="space-y-3">
            {biases.map((bias, i) => {
              const colors = SEVERITY_COLORS[bias.severity];
              return (
                <div key={i} className={`p-4 rounded-lg ${colors.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold ${colors.bg} ${colors.text} border border-current border-opacity-20`}>
                      {BIAS_ICONS[bias.type] ?? '?'}
                    </span>
                    <span className={`text-sm font-semibold ${colors.text} capitalize`}>
                      {bias.type.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                      {bias.severity}
                    </span>
                  </div>
                  <p className={`text-xs ${colors.text} mb-2`}>{bias.description}</p>
                  <div className="text-xs text-white/50 bg-white bg-opacity-60 rounded p-2">
                    <strong>Advisor talking point:</strong> {bias.advisorTalkingPoint}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inconsistencies */}
      {inconsistencies.length > 0 && (
        <div className="card p-6">
          <h4 className="text-sm font-semibold text-white/60 mb-1">Profile Inconsistencies</h4>
          <p className="text-xs text-white/30 mb-4">
            These flags indicate areas where the client's responses or financial situation may conflict. Address these in the advisory conversation.
          </p>

          <div className="space-y-3">
            {inconsistencies.map((inc, i) => {
              const colors = SEVERITY_COLORS[inc.severity];
              return (
                <div key={i} className={`p-4 rounded-lg ${colors.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    <span className={`text-sm font-semibold ${colors.text}`}>
                      {inc.severity === 'critical' ? 'Critical' : inc.severity === 'warning' ? 'Warning' : 'Note'}
                    </span>
                  </div>
                  <p className={`text-xs ${colors.text} mb-1`}>{inc.description}</p>
                  <p className="text-xs text-white/50">{inc.recommendation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
