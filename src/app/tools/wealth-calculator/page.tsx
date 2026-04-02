'use client';

import { useState, useMemo } from 'react';
import { RiSparklingLine, RiLineChartLine, RiAlertLine, RiTimeLine } from '@remixicon/react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface InvestmentTypeConfig {
  label: string;
  annualReturn: number;
  dividendYield: number;
  priceReturn: number;
  volatility: string;
}

interface CorrectionScenario {
  label: string;
  decline: number;
  recoveryYears: number;
}

interface YearData {
  year: number;
  portfolioValue: number;
  principalContributed: number;
  cumulativeDividends: number;
  capitalAppreciation: number;
  benefitCreated: number;
  milestoneBasis: number;
}

interface Milestone {
  icon: string;
  label: string;
  description: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INVESTMENT_TYPES: Record<string, InvestmentTypeConfig> = {
  conservative: {
    label: 'Conservative (Bonds & CDs)',
    annualReturn: 0.045,
    dividendYield: 0.030,
    priceReturn: 0.015,
    volatility: 'Low',
  },
  balanced: {
    label: 'Balanced (60/40)',
    annualReturn: 0.075,
    dividendYield: 0.020,
    priceReturn: 0.055,
    volatility: 'Moderate',
  },
  diversified: {
    label: 'Diversified Portfolio (70/30)',
    annualReturn: 0.085,
    dividendYield: 0.018,
    priceReturn: 0.067,
    volatility: 'Moderate-High',
  },
  growth: {
    label: 'Growth (100% Equities)',
    annualReturn: 0.104,
    dividendYield: 0.014,
    priceReturn: 0.090,
    volatility: 'High',
  },
  aggressive: {
    label: 'Aggressive Growth',
    annualReturn: 0.115,
    dividendYield: 0.008,
    priceReturn: 0.107,
    volatility: 'Very High',
  },
  realestate: {
    label: 'Real Estate (REITs)',
    annualReturn: 0.090,
    dividendYield: 0.035,
    priceReturn: 0.055,
    volatility: 'Moderate-High',
  },
  dividend: {
    label: 'Dividend-Focused Equity',
    annualReturn: 0.080,
    dividendYield: 0.038,
    priceReturn: 0.042,
    volatility: 'Moderate',
  },
};

const CORRECTION_SCENARIOS: Record<string, CorrectionScenario> = {
  dotcom: { label: 'Dot-Com Crash', decline: -0.491, recoveryYears: 7.0 },
  crisis2008: { label: '2008 Financial Crisis', decline: -0.568, recoveryYears: 5.5 },
  covid: { label: 'COVID-19 Crash', decline: -0.339, recoveryYears: 0.4 },
  bear2022: { label: '2022 Bear Market', decline: -0.254, recoveryYears: 2.0 },
  average: { label: 'Average Correction (10%+)', decline: -0.15, recoveryYears: 0.33 },
  severe: { label: 'Severe Bear Market', decline: -0.35, recoveryYears: 3.0 },
};

const MILESTONE_MAP: Array<{ min: number; max: number; icon: string; label: string; description: string }> = [
  { min: 0, max: 0, icon: '🌱', label: 'Not Yet Above Principal', description: 'Your growth has not yet exceeded the dollars you invested.' },
  { min: 1, max: 2500, icon: '☕', label: 'Daily Coffee Ritual', description: 'The market-created gain covers a year of coffee.' },
  { min: 2501, max: 7500, icon: '✈️', label: 'Family Getaway', description: 'Your gains could fund a meaningful vacation.' },
  { min: 7501, max: 20000, icon: '🚗', label: 'Reliable Car Upgrade', description: 'Your gains alone could buy a quality used or entry-level new vehicle.' },
  { min: 20001, max: 50000, icon: '🎓', label: 'Education Fund Boost', description: 'The market-created value could meaningfully fund tuition or a 529 boost.' },
  { min: 50001, max: 100000, icon: '🏡', label: 'Home Down Payment', description: 'The gains alone could cover a substantial down payment.' },
  { min: 100001, max: 250000, icon: '🛥️', label: 'Lifestyle Freedom Fund', description: 'The growth created a level of optionality that changes decisions.' },
  { min: 250001, max: 500000, icon: '🏠', label: 'Vacation Property Equity', description: 'The gains alone could represent major property purchasing power.' },
  { min: 500001, max: 1000000, icon: '🌍', label: 'Work-Optional Flexibility', description: 'Your growth alone now represents life-changing financial freedom.' },
  { min: 1000001, max: 2500000, icon: '🕊️', label: 'Early Retirement Engine', description: 'The market-created portion could materially fund retirement itself.' },
  { min: 2500001, max: 5000000, icon: '✈️', label: 'Legacy-Level Optionality', description: 'The gains have reached a level that can reshape family opportunity.' },
  { min: 5000001, max: Infinity, icon: '🏛️', label: 'Generational Impact', description: 'This is no longer just growth — it is enduring excess capital.' },
];

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

function calculateFutureValue(
  pv: number,
  pmt: number,
  annualRate: number,
  years: number,
  periods: number = 12
): number {
  const r = annualRate / periods;
  const n = years * periods;

  const pvFuture = pv * Math.pow(1 + r, n);
  const pmtFuture = pmt * ((Math.pow(1 + r, n) - 1) / r);

  return pvFuture + pmtFuture;
}

function calculateYearSeries(
  startingInvestment: number,
  monthlyContribution: number,
  investmentType: InvestmentTypeConfig,
  timeHorizon: number
): YearData[] {
  const series: YearData[] = [];
  const r = investmentType.annualReturn / 12;
  const d = investmentType.dividendYield;

  for (let year = 0; year <= timeHorizon; year++) {
    const n = year * 12;

    // Calculate portfolio value
    const pvFuture = startingInvestment * Math.pow(1 + r, n);
    const pmtFuture = monthlyContribution > 0
      ? monthlyContribution * ((Math.pow(1 + r, n) - 1) / r)
      : 0;
    const portfolioValue = pvFuture + pmtFuture;

    // Calculate principal contributed
    const principalContributed = startingInvestment + (monthlyContribution * 12 * year);

    // Estimate cumulative dividends
    const cumulativeDividends = year > 0
      ? portfolioValue * (d / investmentType.annualReturn) * 0.85
      : 0;

    // Calculate benefit created
    const benefitCreated = portfolioValue - principalContributed;
    const milestoneBasis = Math.max(0, benefitCreated);

    // Capital appreciation
    const capitalAppreciation = benefitCreated - cumulativeDividends;

    series.push({
      year,
      portfolioValue,
      principalContributed,
      cumulativeDividends,
      capitalAppreciation,
      benefitCreated,
      milestoneBasis,
    });
  }

  return series;
}

function applyCorrectionToSeries(
  series: YearData[],
  correctionYear: number,
  scenario: CorrectionScenario,
  investmentType: InvestmentTypeConfig
): YearData[] {
  const correctedSeries = [...series];

  if (correctionYear >= series.length) return correctedSeries;

  // Apply decline
  const preCorrection = correctedSeries[correctionYear].portfolioValue;
  const postCorrection = preCorrection * (1 + scenario.decline);
  const recoveryEnd = Math.min(correctionYear + Math.ceil(scenario.recoveryYears), series.length - 1);

  for (let i = correctionYear; i < series.length; i++) {
    if (i === correctionYear) {
      // Apply crash
      correctedSeries[i] = {
        ...correctedSeries[i],
        portfolioValue: postCorrection,
        benefitCreated: postCorrection - correctedSeries[i].principalContributed,
        milestoneBasis: Math.max(0, postCorrection - correctedSeries[i].principalContributed),
      };
    } else if (i <= recoveryEnd) {
      // Recovery period
      const recoveryProgress = (i - correctionYear) / scenario.recoveryYears;
      const targetValue = series[i].portfolioValue;
      const recoveredValue = postCorrection + (targetValue - postCorrection) * Math.min(1, recoveryProgress);

      correctedSeries[i] = {
        ...correctedSeries[i],
        portfolioValue: recoveredValue,
        benefitCreated: recoveredValue - correctedSeries[i].principalContributed,
        milestoneBasis: Math.max(0, recoveredValue - correctedSeries[i].principalContributed),
      };
    } else {
      // Post-recovery normal growth
      const yearsAfterRecovery = i - recoveryEnd;
      const baseValue = correctedSeries[recoveryEnd].portfolioValue;
      const growthFactor = Math.pow(1 + investmentType.annualReturn, yearsAfterRecovery);
      const newValue = baseValue * growthFactor;

      correctedSeries[i] = {
        ...correctedSeries[i],
        portfolioValue: newValue,
        benefitCreated: newValue - correctedSeries[i].principalContributed,
        milestoneBasis: Math.max(0, newValue - correctedSeries[i].principalContributed),
      };
    }
  }

  return correctedSeries;
}

function getMilestoneForBenefit(benefitValue: number): Milestone {
  for (const milestone of MILESTONE_MAP) {
    if (benefitValue >= milestone.min && benefitValue <= milestone.max) {
      return {
        icon: milestone.icon,
        label: milestone.label,
        description: milestone.description,
      };
    }
  }
  return MILESTONE_MAP[MILESTONE_MAP.length - 1];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMultiple(value: number): string {
  return value.toFixed(2) + 'x';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WealthCalculatorPage() {
  // State
  const [startingInvestment, setStartingInvestment] = useState(500000);
  const [monthlyContribution, setMonthlyContribution] = useState(2000);
  const [investmentType, setInvestmentType] = useState<keyof typeof INVESTMENT_TYPES>('diversified');
  const [timeHorizon, setTimeHorizon] = useState(20);
  const [includeCorrection, setIncludeCorrection] = useState(false);
  const [correctionScenario, setCorrectionScenario] = useState<keyof typeof CORRECTION_SCENARIOS>('crisis2008');
  const [correctionTiming, setCorrectionTiming] = useState(5);

  // Computed values
  const baseSeries = useMemo(() => {
    return calculateYearSeries(
      startingInvestment,
      monthlyContribution,
      INVESTMENT_TYPES[investmentType],
      timeHorizon
    );
  }, [startingInvestment, monthlyContribution, investmentType, timeHorizon]);

  const correctedSeries = useMemo(() => {
    if (!includeCorrection) return null;
    return applyCorrectionToSeries(
      baseSeries,
      correctionTiming,
      CORRECTION_SCENARIOS[correctionScenario],
      INVESTMENT_TYPES[investmentType]
    );
  }, [baseSeries, includeCorrection, correctionTiming, correctionScenario, investmentType]);

  const activeSeries = correctedSeries || baseSeries;
  const finalYear = activeSeries[activeSeries.length - 1];

  // Milestone years
  const milestoneYears = [1, 3, 5, 10, 15, 20, 25, 30, timeHorizon].filter(
    (y, i, arr) => y <= timeHorizon && arr.indexOf(y) === i
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <RiSparklingLine className="size-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              What Could Your Money Create Over Time?
            </h1>
          </div>
          <p className="mx-auto max-w-3xl text-lg text-slate-600 dark:text-slate-400">
            See the difference between what you contribute and what time, market growth,
            and reinvested dividends create for you.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">
                Calculator Inputs
              </h2>

              <div className="space-y-6">
                {/* Starting Investment */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Starting Investment
                  </label>
                  <input
                    type="number"
                    value={startingInvestment}
                    onChange={(e) => setStartingInvestment(Number(e.target.value))}
                    step={1000}
                    min={0}
                    max={50000000}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    The amount you invest today
                  </p>
                </div>

                {/* Monthly Contribution */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Monthly Contribution
                  </label>
                  <input
                    type="number"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                    step={100}
                    min={0}
                    max={100000}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    The amount you add each month
                  </p>
                </div>

                {/* Investment Type */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Investment Type
                  </label>
                  <select
                    value={investmentType}
                    onChange={(e) => setInvestmentType(e.target.value as keyof typeof INVESTMENT_TYPES)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {Object.entries(INVESTMENT_TYPES).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label} ({(config.annualReturn * 100).toFixed(1)}% annually)
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Choose the return profile that best fits your portfolio style
                  </p>
                </div>

                {/* Time Horizon */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Time Horizon: {timeHorizon} years
                  </label>
                  <input
                    type="range"
                    value={timeHorizon}
                    onChange={(e) => setTimeHorizon(Number(e.target.value))}
                    min={1}
                    max={40}
                    step={1}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    How long will the money stay invested?
                  </p>
                </div>

                {/* Market Correction Toggle */}
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeCorrection}
                      onChange={(e) => setIncludeCorrection(e.target.checked)}
                      className="size-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Include Market Correction?
                    </span>
                  </label>
                  <p className="ml-7 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Stress test the path by inserting a historical correction
                  </p>
                </div>

                {/* Correction Scenario (conditional) */}
                {includeCorrection && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Correction Scenario
                      </label>
                      <select
                        value={correctionScenario}
                        onChange={(e) => setCorrectionScenario(e.target.value as keyof typeof CORRECTION_SCENARIOS)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {Object.entries(CORRECTION_SCENARIOS).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.label} ({(config.decline * 100).toFixed(1)}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Correction Timing: Year {correctionTiming}
                      </label>
                      <input
                        type="range"
                        value={correctionTiming}
                        onChange={(e) => setCorrectionTiming(Number(e.target.value))}
                        min={1}
                        max={timeHorizon}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {/* Hero Metrics */}
            <div className="mb-8 rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-8 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-800">
              <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-white">
                Your Projected Results
              </h2>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Your Projected Portfolio
                  </div>
                  <div className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(finalYear.portfolioValue)}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    What You Put In
                  </div>
                  <div className="mt-1 text-3xl font-bold text-slate-600 dark:text-slate-400">
                    {formatCurrency(finalYear.principalContributed)}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Value Created by Time & Markets
                  </div>
                  <div className="mt-1 text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(finalYear.benefitCreated)}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Dividends Reinvested
                  </div>
                  <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(finalYear.cumulativeDividends)}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Portfolio Multiple
                  </div>
                  <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                    {formatMultiple(finalYear.portfolioValue / finalYear.principalContributed)}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-white/50 p-4 dark:bg-slate-950/50">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  You contributed <strong>{formatCurrency(finalYear.principalContributed)}</strong>,
                  but time and markets created an additional{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(finalYear.benefitCreated)}
                  </strong>.
                  Your milestone timeline below shows what the growth alone became worth in real life.
                </p>
              </div>
            </div>

            {/* Correction Insight (conditional) */}
            {includeCorrection && correctedSeries && (
              <div className="mb-8 rounded-xl border border-orange-200 bg-orange-50 p-6 dark:border-orange-900/50 dark:bg-orange-950/20">
                <div className="flex items-start gap-3">
                  <RiAlertLine className="size-5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
                  <div>
                    <h3 className="mb-2 font-semibold text-orange-900 dark:text-orange-300">
                      Impact of {CORRECTION_SCENARIOS[correctionScenario].label}
                    </h3>
                    <div className="space-y-2 text-sm text-orange-800 dark:text-orange-300">
                      <p>
                        <strong>Without correction:</strong> {formatCurrency(baseSeries[baseSeries.length - 1].portfolioValue)}
                      </p>
                      <p>
                        <strong>With correction:</strong> {formatCurrency(finalYear.portfolioValue)}
                      </p>
                      <p>
                        <strong>Compounding lost to correction:</strong>{' '}
                        {formatCurrency(baseSeries[baseSeries.length - 1].portfolioValue - finalYear.portfolioValue)}{' '}
                        ({(((baseSeries[baseSeries.length - 1].portfolioValue - finalYear.portfolioValue) / baseSeries[baseSeries.length - 1].portfolioValue) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Milestone Timeline */}
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center gap-2">
                <RiTimeLine className="size-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  What Time & Growth Created
                </h2>
              </div>

              <p className="mb-8 text-sm text-slate-600 dark:text-slate-400">
                These milestones reflect only the value created above your invested principal —
                the reward from patience, compounding, and market returns.
              </p>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {milestoneYears.map((year) => {
                  const yearData = activeSeries[year];
                  const milestone = getMilestoneForBenefit(yearData.milestoneBasis);
                  const isFinal = year === timeHorizon;

                  return (
                    <div
                      key={year}
                      className={`rounded-lg border p-4 ${
                        isFinal
                          ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Year {year}
                        </span>
                        <span className="text-2xl">{milestone.icon}</span>
                      </div>
                      <div className="mb-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(yearData.milestoneBasis)}
                      </div>
                      <div className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {milestone.label}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {milestone.description}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                        Created above principal
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-8 text-center dark:border-blue-900/50 dark:bg-blue-950/20">
              <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
                See How a Personalized Strategy Can Grow the Part You Don't Contribute
              </h3>
              <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
                Talk with an advisor about compounding, dividend strategy, and downside planning.
              </p>
              <button className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                Schedule a Consultation
              </button>
            </div>

            {/* Disclosures */}
            <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                Important Disclosures
              </h4>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <p>
                  <strong>Educational Purpose:</strong> This calculator is for educational and illustrative purposes only.
                  Results are hypothetical, are based on selected assumptions, and do not represent actual investment results.
                  Investment returns, dividend yields, and market declines are not guaranteed. Actual outcomes will vary and
                  may be materially better or worse than shown.
                </p>
                <p>
                  <strong>Milestone Methodology:</strong> The milestone timeline labeled "What Time & Growth Created" reflects
                  only the modeled value above principal contributed. It excludes the investor's starting principal and ongoing
                  deposits when assigning real-world milestone comparisons.
                </p>
                <p>
                  <strong>Return Assumptions:</strong> Investment type assumptions are based on broad historical market data
                  and simplified return profiles, including reinvested dividend assumptions where applicable, and are not
                  recommendations of any security, portfolio, or strategy.
                </p>
                <p>
                  <strong>Market Corrections:</strong> Historical correction scenarios are simplified educational illustrations
                  based on prior market declines. They do not predict future market behavior, recovery timing, or actual
                  portfolio performance.
                </p>
                <p>
                  <strong>Taxes, Fees, Inflation:</strong> Results are shown in nominal dollars and do not account for inflation,
                  taxes, advisory fees, fund expenses, or transaction costs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
