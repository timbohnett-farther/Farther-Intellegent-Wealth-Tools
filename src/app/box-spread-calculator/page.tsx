'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import InputPanel from '@/components/InputPanel';
import ExecutiveSummarySection from '@/components/sections/ExecutiveSummarySection';
import LoanStructureSection from '@/components/sections/LoanStructureSection';
import CostComparisonSection from '@/components/sections/CostComparisonSection';
import TaxEfficiencySection from '@/components/sections/TaxEfficiencySection';
import StressTestSection from '@/components/sections/StressTestSection';
import OpportunityCostSection from '@/components/sections/OpportunityCostSection';
import LiquidationSection from '@/components/sections/LiquidationSection';
import CashFlowSection from '@/components/sections/CashFlowSection';
import MonteCarloSection from '@/components/sections/MonteCarloSection';
import { CalculatorInputs } from '@/lib/types';
import { calculateAll } from '@/lib/calculations';
import {
  getMarginalOrdinaryRate,
  getLTCGRate,
  getNIITRate,
  getBlended1256Rate,
} from '@/lib/data/taxBrackets';
import { getStateCGRate } from '@/lib/data/stateTaxRates';

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'structure', label: 'Loan Structure' },
  { id: 'costs', label: 'Costs' },
  { id: 'tax', label: 'Tax' },
  { id: 'risk', label: 'Risk' },
  { id: 'opportunity', label: 'Opportunity' },
  { id: 'liquidation', label: 'Liquidation' },
  { id: 'cashflow', label: 'Cash Flow' },
  { id: 'montecarlo', label: 'Monte Carlo' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function deriveInputs(inputs: CalculatorInputs): CalculatorInputs {
  const derived = JSON.parse(JSON.stringify(inputs)) as CalculatorInputs;
  const { taxableIncome, filingStatus, state } = derived.tax;

  derived.tax.ltcgRate = getLTCGRate(taxableIncome, filingStatus);
  derived.tax.stcgRate = getMarginalOrdinaryRate(taxableIncome, filingStatus);
  derived.tax.niitRate = getNIITRate(taxableIncome, filingStatus);
  derived.tax.stateCGRate = getStateCGRate(state);
  derived.tax.blended1256Rate = getBlended1256Rate(
    derived.tax.ltcgRate,
    derived.tax.stcgRate,
    derived.tax.niitRate
  );

  const portfolioValue = derived.loan.portfolioValue;
  const costBasis = derived.portfolio.costBasis;
  derived.portfolio.unrealizedGainPct =
    portfolioValue > 0 ? Math.max(0, (portfolioValue - costBasis) / portfolioValue) : 0;

  if (derived.loan.marginType === 'portfolio_margin') {
    derived.portfolio.initialMarginPct = 0.85;
    derived.portfolio.maintenanceMarginPct = 0.15;
  } else {
    switch (derived.loan.portfolioComposition) {
      case 'equities':
        derived.portfolio.initialMarginPct = 0.50;
        derived.portfolio.maintenanceMarginPct = 0.35;
        break;
      case 'etfs':
        derived.portfolio.initialMarginPct = 0.40;
        derived.portfolio.maintenanceMarginPct = 0.30;
        break;
      default:
        derived.portfolio.initialMarginPct = 0.50;
        derived.portfolio.maintenanceMarginPct = 0.30;
    }
  }

  return derived;
}

const DEFAULT_INPUTS: CalculatorInputs = {
  loan: {
    portfolioValue: 10000000,
    loanAmount: 2000000,
    termYears: 3,
    boxRate: 0.042,
    managerFee: 0.0035,
    marginType: 'reg_t',
    portfolioComposition: 'mixed',
  },
  tax: {
    filingStatus: 'mfj',
    taxableIncome: 800000,
    state: 'CA',
    ltcgRate: 0.20,
    stcgRate: 0.37,
    niitRate: 0.038,
    stateCGRate: 0.133,
    annualCGRealized: 100000,
    blended1256Rate: 0.306,
  },
  portfolio: {
    costBasis: 5000000,
    unrealizedGainPct: 0.50,
    expectedReturn: 0.08,
    volatility: 0.15,
    initialMarginPct: 0.50,
    maintenanceMarginPct: 0.30,
  },
  comparison: {
    marginRate: 0.10,
    sblocRate: 0.065,
    helocRate: 0.08,
  },
};

export default function BoxSpreadCalculatorPage() {
  const [rawInputs, setRawInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [mcKey, setMcKey] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const inputs = useMemo(() => deriveInputs(rawInputs), [rawInputs]);

  const results = useMemo(() => {
    return calculateAll(inputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, mcKey]);

  const handleInputChange = useCallback((newInputs: CalculatorInputs) => {
    setRawInputs(newInputs);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setMcKey(k => k + 1);
    }, 1000);
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
              <h1 className="text-lg font-bold text-text">Box Spread Lending Calculator</h1>
              <p className="text-xs text-text-muted">Portfolio-Based Liquidity Planning</p>
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
          <InputPanel inputs={rawInputs} onChange={handleInputChange} />
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
                    activeTab === tab.id
                      ? 'tab-active'
                      : 'tab-inactive'
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
              <span>LTV: <strong className="text-text">{((inputs.loan.loanAmount / inputs.loan.portfolioValue) * 100).toFixed(1)}%</strong></span>
              <span>All-In Rate: <strong className="text-accent-primarySoft">{((inputs.loan.boxRate + inputs.loan.managerFee) * 100).toFixed(2)}%</strong></span>
              <span>Fed LTCG: <strong>{(inputs.tax.ltcgRate * 100).toFixed(0)}%</strong></span>
              <span>Fed STCG: <strong>{(inputs.tax.stcgRate * 100).toFixed(0)}%</strong></span>
              <span>NIIT: <strong>{(inputs.tax.niitRate * 100).toFixed(1)}%</strong></span>
              <span>State CG: <strong>{(inputs.tax.stateCGRate * 100).toFixed(1)}%</strong></span>
              <span>Blended 1256: <strong className="text-success-700">{(inputs.tax.blended1256Rate * 100).toFixed(1)}%</strong></span>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'summary' && <ExecutiveSummarySection data={results.executiveSummary} />}
            {activeTab === 'structure' && <LoanStructureSection data={results.loanStructure} config={inputs.loan} />}
            {activeTab === 'costs' && <CostComparisonSection data={results.costComparison} config={inputs.loan} />}
            {activeTab === 'tax' && <TaxEfficiencySection data={results.taxAnalysis} />}
            {activeTab === 'risk' && <StressTestSection data={results.stressTest} />}
            {activeTab === 'opportunity' && <OpportunityCostSection data={results.opportunityCost} />}
            {activeTab === 'liquidation' && <LiquidationSection data={results.liquidationComparison} />}
            {activeTab === 'cashflow' && <CashFlowSection data={results.cashFlowSchedule} />}
            {activeTab === 'montecarlo' && <MonteCarloSection data={results.monteCarlo} />}
          </div>

          {/* Disclosures */}
          <div className="mt-8 p-4 bg-surface-subtle rounded-lg text-[10px] text-text-faint space-y-1 leading-relaxed">
            <p>This tool is for educational and illustrative purposes only and does not constitute investment, tax, or legal advice.</p>
            <p>Box spread lending involves risk, including the possibility of margin calls if portfolio values decline significantly.</p>
            <p>Past market performance is not indicative of future results. Monte Carlo simulations are hypothetical and based on assumptions that may not reflect actual market conditions.</p>
            <p>Tax treatment of box spreads under Section 1256 is based on current IRS guidance and may be subject to change. Consult a qualified tax professional.</p>
            <p>Options trading requires approval from the account custodian. Not all accounts or account types are eligible.</p>
            <p>Actual borrowing rates, margin requirements, and fees may differ from the illustrative values shown.</p>
            <p>All projections assume reinvestment of proceeds and do not account for advisory fees unless specifically included.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
