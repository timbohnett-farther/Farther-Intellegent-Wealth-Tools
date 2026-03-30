'use client';

import React from 'react';
import type { RiskProfile } from '@/lib/risk-profile/types';

interface ComplianceNotesProps {
  profile: RiskProfile;
}

export default function ComplianceNotes({ profile }: ComplianceNotesProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-text-muted">Compliance Documentation</h4>
        <button
          onClick={() => {
            navigator.clipboard.writeText(profile.complianceNotes);
          }}
          className="text-xs text-accent-primarySoft hover:text-accent-primarySoft flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          Copy
        </button>
      </div>

      <div className="p-4 bg-transparent rounded-lg text-xs text-text-muted leading-relaxed whitespace-pre-wrap font-mono">
        {profile.complianceNotes}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-text-faint">
        <span>Generated {profile.completedAt}</span>
        <span>{profile.questionCount} questions answered</span>
      </div>

      {/* Regulatory tags */}
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-success-100 text-success-700">FINRA 2111</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-primary/15 text-accent-primarySoft">Reg BI</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-primary/15 text-accent-primarySoft">CFA Framework</span>
      </div>

      {/* Disclosures */}
      <div className="mt-4 p-3 bg-surface-subtle rounded-lg text-[10px] text-text-faint space-y-1 leading-relaxed">
        <p>This risk profile assessment satisfies FINRA Rule 2111 suitability data collection requirements and SEC Regulation Best Interest care obligation documentation.</p>
        <p>Risk tolerance was assessed using psychometric questions. Risk capacity was computed from financial data and questionnaire responses. Both willingness and ability dimensions are evaluated per CFA Institute Investment Risk Profiling framework.</p>
        <p>Model portfolios use index proxies and historical data. Past performance does not guarantee future results. Backtested results are hypothetical and subject to model limitations.</p>
        <p>This document should be reviewed and co-signed by the advisor and client. Material changes in circumstances should trigger reassessment.</p>
      </div>
    </div>
  );
}
