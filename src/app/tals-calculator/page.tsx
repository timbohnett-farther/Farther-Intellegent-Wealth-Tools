'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import TalsInputPanel from '@/components/tals/TalsInputPanel';
import TalsSummarySection from '@/components/tals/sections/TalsSummarySection';
import TalsCostSection from '@/components/tals/sections/TalsCostSection';
import TalsTaxAlphaSection from '@/components/tals/sections/TalsTaxAlphaSection';
import TalsDiversificationSection from '@/components/tals/sections/TalsDiversificationSection';
import TalsWealthProjectionSection from '@/components/tals/sections/TalsWealthProjectionSection';
import TalsYearByYearSection from '@/components/tals/sections/TalsYearByYearSection';
import { TalsInputs } from '@/lib/tals/types';
import { DEFAULT_TALS_INPUTS, calculateTalsAll } from '@/lib/tals';
import { deriveTalsRates } from '@/lib/tals/calculations';

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'costs', label: 'Cost Analysis' },
  { id: 'taxalpha', label: 'Tax Alpha' },
  { id: 'diversification', label: 'Diversification' },
  { id: 'wealth', label: 'Wealth Projection' },
  { id: 'yearByYear', label: 'Year-by-Year' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function TalsCalculatorPage() {
  const [rawInputs, setRawInputs] = useState<TalsInputs>(DEFAULT_TALS_INPUTS);
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  const inputs = useMemo(() => deriveTalsRates(rawInputs), [rawInputs]);
  const results = useMemo(() => calculateTalsAll(rawInputs), [rawInputs]);

  const handleInputChange = useCallback((newInputs: TalsInputs) => {
    setRawInputs(newInputs);
  }, []);

  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="bg-surface-soft/[0.03] border-b border-border-subtle backdrop-blur-xl sticky top-0 z-50 no-print">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-text-faint hover:text-text-muted transition-colors"
              aria-label="Back to tools"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-text">TALS What-If Calculator</h1>
              <p className="text-xs text-text-muted">Tax-Aware Long-Short Strategy Comparison</p>
            </div>
          </div>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-accent-primary text-text text-sm font-medium rounded-lg hover:bg-accent-primary/80 transition-colors"
          >
            Export PDF
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row">
        {/* Left Input Panel */}
        <aside className="lg:w-[320px] lg:min-w-[320px] p-4 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto no-print">
          <TalsInputPanel inputs={rawInputs} onChange={handleInputChange} />
        </aside>

        {/* Right Output Dashboard */}
        <main className="flex-1 p-4 min-w-0">
          {/* Tabs */}
          <div className="mb-4 no-print overflow-x-auto">
            <div className="flex gap-1 border-b border-border-subtle min-w-max">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id ? 'tab-active' : 'tab-inactive'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Derived Rates Banner */}
          <div className="mb-4 card p-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-muted">
              <span>Fed LTCG: <strong className="text-text">{(inputs.tax.ltcgRate * 100).toFixed(0)}%</strong></span>
              <span>NIIT: <strong className="text-text">{(inputs.tax.niitRate * 100).toFixed(1)}%</strong></span>
              <span>State CG: <strong className="text-text">{(inputs.tax.stateCGRate * 100).toFixed(1)}%</strong></span>
              <span>Blended CG: <strong className="text-accent-primarySoft">{(inputs.tax.blendedCGRate * 100).toFixed(1)}%</strong></span>
              <span>Ordinary: <strong className="text-text">{(inputs.tax.ordinaryRate * 100).toFixed(0)}%</strong></span>
              <span>Unrealized Gain: <strong className="text-warning-500">{Math.max(0, ((inputs.portfolio.concentratedStockValue - inputs.portfolio.costBasis) / inputs.portfolio.concentratedStockValue) * 100).toFixed(0)}%</strong></span>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'summary' && <TalsSummarySection data={results} />}
            {activeTab === 'costs' && <TalsCostSection data={results.costAnalysis} />}
            {activeTab === 'taxalpha' && <TalsTaxAlphaSection columns={results.columns} />}
            {activeTab === 'diversification' && (
              <TalsDiversificationSection
                columns={results.columns}
                targetConcentration={inputs.assumptions.targetConcentration}
              />
            )}
            {activeTab === 'wealth' && (
              <TalsWealthProjectionSection
                columns={results.columns}
                portfolioValue={inputs.portfolio.value}
              />
            )}
            {activeTab === 'yearByYear' && <TalsYearByYearSection columns={results.columns} />}
          </div>

          {/* Disclosures */}
          <div className="mt-8 p-4 bg-surface-subtle rounded-lg text-[10px] text-text-faint space-y-1 leading-relaxed">
            <p>This tool is for educational and illustrative purposes only and does not constitute investment, tax, or legal advice.</p>
            <p>Tax-Aware Long-Short strategies involve leveraged investing which carries additional risk, including the possibility of losses exceeding the initial investment.</p>
            <p>Tax-loss harvesting estimates are projections based on historical patterns and current tax law. Actual results will vary based on market conditions and individual circumstances.</p>
            <p>Constructive Net Capital Loss (CNCL) projections assume consistent portfolio turnover and market conditions. Actual CNCL generation depends on market volatility and portfolio management.</p>
            <p>Provider fee schedules and minimum investment requirements are subject to change. Verify current terms with each provider before investing.</p>
            <p>Qualified Purchaser status requires $5M+ in investments. Consult your compliance officer to verify eligibility.</p>
            <p>All projections assume reinvestment of proceeds and include advisory fees as specified. Past performance is not indicative of future results.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
