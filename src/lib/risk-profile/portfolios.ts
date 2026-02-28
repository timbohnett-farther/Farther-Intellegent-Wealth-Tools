// ═══════════════════════════════════════════════════════════════════════
// Farther Focus — Model Portfolios & Historical Backtesting Data
// Defines 7 risk-band portfolios with allocations, expected metrics,
// historical annual returns (1994-2025), and crash scenarios.
// ═══════════════════════════════════════════════════════════════════════

import type {
  RiskBand,
  ModelPortfolio,
  ModelAllocation,
  BacktestResult,
  BacktestMetrics,
  CrashScenario,
} from './types';

// ── Model Portfolio Allocations ──────────────────────────────────────
// Each band's allocation sums to 100.
// Fields: usEquity, intlEquity, emEquity, govBonds, corpBonds,
//         highYield, reits, commodities, alternatives, crypto, cash

export const MODEL_PORTFOLIOS: Record<RiskBand, ModelPortfolio> = {
  1: {
    band: 1,
    label: 'Capital Preservation',
    allocation: {
      usEquity: 0,
      intlEquity: 0,
      emEquity: 0,
      govBonds: 40,
      corpBonds: 10,
      highYield: 0,
      reits: 0,
      commodities: 0,
      alternatives: 0,
      crypto: 0,
      cash: 50,
    },
    expectedReturn: 3.2,
    expectedVolatility: 3,
    maxDrawdown: -5,
    sharpeRatio: 0.73,
  },
  2: {
    band: 2,
    label: 'Conservative Income',
    allocation: {
      usEquity: 10,
      intlEquity: 5,
      emEquity: 0,
      govBonds: 30,
      corpBonds: 15,
      highYield: 5,
      reits: 5,
      commodities: 0,
      alternatives: 0,
      crypto: 0,
      cash: 30,
    },
    expectedReturn: 4.5,
    expectedVolatility: 5,
    maxDrawdown: -12,
    sharpeRatio: 0.70,
  },
  3: {
    band: 3,
    label: 'Moderate Conservative',
    allocation: {
      usEquity: 20,
      intlEquity: 10,
      emEquity: 0,
      govBonds: 20,
      corpBonds: 15,
      highYield: 5,
      reits: 5,
      commodities: 5,
      alternatives: 0,
      crypto: 0,
      cash: 20,
    },
    expectedReturn: 5.8,
    expectedVolatility: 8,
    maxDrawdown: -20,
    sharpeRatio: 0.60,
  },
  4: {
    band: 4,
    label: 'Moderate Growth',
    allocation: {
      usEquity: 30,
      intlEquity: 15,
      emEquity: 5,
      govBonds: 15,
      corpBonds: 10,
      highYield: 5,
      reits: 5,
      commodities: 5,
      alternatives: 5,
      crypto: 0,
      cash: 5,
    },
    expectedReturn: 7.0,
    expectedVolatility: 11,
    maxDrawdown: -30,
    sharpeRatio: 0.55,
  },
  5: {
    band: 5,
    label: 'Balanced Growth',
    allocation: {
      usEquity: 35,
      intlEquity: 15,
      emEquity: 5,
      govBonds: 10,
      corpBonds: 10,
      highYield: 5,
      reits: 5,
      commodities: 5,
      alternatives: 5,
      crypto: 2,
      cash: 3,
    },
    expectedReturn: 8.0,
    expectedVolatility: 13,
    maxDrawdown: -38,
    sharpeRatio: 0.52,
  },
  6: {
    band: 6,
    label: 'Aggressive Growth',
    allocation: {
      usEquity: 40,
      intlEquity: 15,
      emEquity: 10,
      govBonds: 5,
      corpBonds: 5,
      highYield: 5,
      reits: 5,
      commodities: 5,
      alternatives: 5,
      crypto: 3,
      cash: 2,
    },
    expectedReturn: 9.2,
    expectedVolatility: 16,
    maxDrawdown: -45,
    sharpeRatio: 0.49,
  },
  7: {
    band: 7,
    label: 'Maximum Growth',
    allocation: {
      usEquity: 40,
      intlEquity: 15,
      emEquity: 10,
      govBonds: 0,
      corpBonds: 0,
      highYield: 5,
      reits: 5,
      commodities: 5,
      alternatives: 10,
      crypto: 5,
      cash: 5,
    },
    expectedReturn: 10.5,
    expectedVolatility: 20,
    maxDrawdown: -55,
    sharpeRatio: 0.46,
  },
};

// ── Annual Returns (1994-2025) ───────────────────────────────────────
// Realistic returns scaled by equity/bond/alternative exposure per band.
// Lower bands are smoother; higher bands are more volatile.

const ANNUAL_RETURNS_BY_BAND: Record<RiskBand, { year: number; return: number }[]> = {
  1: [
    { year: 1994, return: 1.8 },
    { year: 1995, return: 4.5 },
    { year: 1996, return: 3.8 },
    { year: 1997, return: 4.2 },
    { year: 1998, return: 4.8 },
    { year: 1999, return: 3.5 },
    { year: 2000, return: 4.1 },
    { year: 2001, return: 3.9 },
    { year: 2002, return: 3.2 },
    { year: 2003, return: 2.8 },
    { year: 2004, return: 2.4 },
    { year: 2005, return: 2.6 },
    { year: 2006, return: 3.4 },
    { year: 2007, return: 4.0 },
    { year: 2008, return: 1.2 },
    { year: 2009, return: 2.5 },
    { year: 2010, return: 2.8 },
    { year: 2011, return: 3.5 },
    { year: 2012, return: 2.2 },
    { year: 2013, return: 1.8 },
    { year: 2014, return: 3.0 },
    { year: 2015, return: 1.5 },
    { year: 2016, return: 2.0 },
    { year: 2017, return: 2.5 },
    { year: 2018, return: 2.8 },
    { year: 2019, return: 4.2 },
    { year: 2020, return: 3.8 },
    { year: 2021, return: 1.0 },
    { year: 2022, return: -1.5 },
    { year: 2023, return: 4.5 },
    { year: 2024, return: 4.0 },
    { year: 2025, return: 3.5 },
  ],
  2: [
    { year: 1994, return: 0.5 },
    { year: 1995, return: 9.8 },
    { year: 1996, return: 6.5 },
    { year: 1997, return: 8.2 },
    { year: 1998, return: 6.1 },
    { year: 1999, return: 5.8 },
    { year: 2000, return: 1.2 },
    { year: 2001, return: 0.5 },
    { year: 2002, return: -3.2 },
    { year: 2003, return: 10.5 },
    { year: 2004, return: 5.8 },
    { year: 2005, return: 3.5 },
    { year: 2006, return: 6.8 },
    { year: 2007, return: 4.5 },
    { year: 2008, return: -10.5 },
    { year: 2009, return: 12.8 },
    { year: 2010, return: 7.2 },
    { year: 2011, return: 3.1 },
    { year: 2012, return: 6.8 },
    { year: 2013, return: 7.5 },
    { year: 2014, return: 5.2 },
    { year: 2015, return: 1.0 },
    { year: 2016, return: 4.8 },
    { year: 2017, return: 7.5 },
    { year: 2018, return: -2.5 },
    { year: 2019, return: 11.2 },
    { year: 2020, return: 7.5 },
    { year: 2021, return: 8.2 },
    { year: 2022, return: -9.5 },
    { year: 2023, return: 9.2 },
    { year: 2024, return: 7.8 },
    { year: 2025, return: 5.5 },
  ],
  3: [
    { year: 1994, return: 0.2 },
    { year: 1995, return: 12.5 },
    { year: 1996, return: 8.8 },
    { year: 1997, return: 11.5 },
    { year: 1998, return: 7.2 },
    { year: 1999, return: 9.5 },
    { year: 2000, return: -1.8 },
    { year: 2001, return: -3.5 },
    { year: 2002, return: -8.2 },
    { year: 2003, return: 14.8 },
    { year: 2004, return: 7.2 },
    { year: 2005, return: 4.8 },
    { year: 2006, return: 9.2 },
    { year: 2007, return: 4.5 },
    { year: 2008, return: -18.5 },
    { year: 2009, return: 17.8 },
    { year: 2010, return: 9.5 },
    { year: 2011, return: 2.2 },
    { year: 2012, return: 8.8 },
    { year: 2013, return: 12.5 },
    { year: 2014, return: 6.5 },
    { year: 2015, return: 1.2 },
    { year: 2016, return: 6.2 },
    { year: 2017, return: 11.2 },
    { year: 2018, return: -4.2 },
    { year: 2019, return: 15.2 },
    { year: 2020, return: 8.8 },
    { year: 2021, return: 12.5 },
    { year: 2022, return: -13.2 },
    { year: 2023, return: 12.2 },
    { year: 2024, return: 10.5 },
    { year: 2025, return: 7.2 },
  ],
  4: [
    { year: 1994, return: 2.1 },
    { year: 1995, return: 15.3 },
    { year: 1996, return: 10.2 },
    { year: 1997, return: 14.5 },
    { year: 1998, return: 8.3 },
    { year: 1999, return: 12.1 },
    { year: 2000, return: -4.2 },
    { year: 2001, return: -6.8 },
    { year: 2002, return: -12.5 },
    { year: 2003, return: 18.2 },
    { year: 2004, return: 8.1 },
    { year: 2005, return: 5.4 },
    { year: 2006, return: 10.8 },
    { year: 2007, return: 4.2 },
    { year: 2008, return: -28.5 },
    { year: 2009, return: 22.3 },
    { year: 2010, return: 11.4 },
    { year: 2011, return: 1.2 },
    { year: 2012, return: 10.5 },
    { year: 2013, return: 15.8 },
    { year: 2014, return: 7.2 },
    { year: 2015, return: 0.8 },
    { year: 2016, return: 7.5 },
    { year: 2017, return: 14.2 },
    { year: 2018, return: -5.8 },
    { year: 2019, return: 18.5 },
    { year: 2020, return: 10.2 },
    { year: 2021, return: 15.8 },
    { year: 2022, return: -16.2 },
    { year: 2023, return: 14.5 },
    { year: 2024, return: 12.3 },
    { year: 2025, return: 8.1 },
  ],
  5: [
    { year: 1994, return: 2.8 },
    { year: 1995, return: 18.2 },
    { year: 1996, return: 12.5 },
    { year: 1997, return: 17.2 },
    { year: 1998, return: 9.5 },
    { year: 1999, return: 15.8 },
    { year: 2000, return: -6.5 },
    { year: 2001, return: -9.2 },
    { year: 2002, return: -16.8 },
    { year: 2003, return: 22.5 },
    { year: 2004, return: 9.5 },
    { year: 2005, return: 6.2 },
    { year: 2006, return: 12.8 },
    { year: 2007, return: 4.8 },
    { year: 2008, return: -35.2 },
    { year: 2009, return: 26.8 },
    { year: 2010, return: 13.5 },
    { year: 2011, return: 0.5 },
    { year: 2012, return: 12.2 },
    { year: 2013, return: 18.5 },
    { year: 2014, return: 8.2 },
    { year: 2015, return: 0.2 },
    { year: 2016, return: 8.8 },
    { year: 2017, return: 16.5 },
    { year: 2018, return: -7.2 },
    { year: 2019, return: 21.5 },
    { year: 2020, return: 11.8 },
    { year: 2021, return: 18.2 },
    { year: 2022, return: -19.5 },
    { year: 2023, return: 16.8 },
    { year: 2024, return: 14.5 },
    { year: 2025, return: 9.2 },
  ],
  6: [
    { year: 1994, return: 3.5 },
    { year: 1995, return: 22.5 },
    { year: 1996, return: 14.8 },
    { year: 1997, return: 20.5 },
    { year: 1998, return: 10.2 },
    { year: 1999, return: 21.8 },
    { year: 2000, return: -10.5 },
    { year: 2001, return: -13.2 },
    { year: 2002, return: -22.5 },
    { year: 2003, return: 28.5 },
    { year: 2004, return: 11.2 },
    { year: 2005, return: 7.5 },
    { year: 2006, return: 15.2 },
    { year: 2007, return: 5.2 },
    { year: 2008, return: -42.5 },
    { year: 2009, return: 32.8 },
    { year: 2010, return: 15.8 },
    { year: 2011, return: -1.5 },
    { year: 2012, return: 14.5 },
    { year: 2013, return: 22.8 },
    { year: 2014, return: 9.5 },
    { year: 2015, return: -1.2 },
    { year: 2016, return: 10.5 },
    { year: 2017, return: 19.8 },
    { year: 2018, return: -9.5 },
    { year: 2019, return: 25.8 },
    { year: 2020, return: 14.5 },
    { year: 2021, return: 22.5 },
    { year: 2022, return: -24.8 },
    { year: 2023, return: 20.5 },
    { year: 2024, return: 17.8 },
    { year: 2025, return: 10.5 },
  ],
  7: [
    { year: 1994, return: 4.2 },
    { year: 1995, return: 26.8 },
    { year: 1996, return: 17.5 },
    { year: 1997, return: 24.2 },
    { year: 1998, return: 11.5 },
    { year: 1999, return: 32.5 },
    { year: 2000, return: -15.8 },
    { year: 2001, return: -18.5 },
    { year: 2002, return: -30.2 },
    { year: 2003, return: 35.8 },
    { year: 2004, return: 13.5 },
    { year: 2005, return: 8.8 },
    { year: 2006, return: 18.5 },
    { year: 2007, return: 5.8 },
    { year: 2008, return: -52.5 },
    { year: 2009, return: 42.5 },
    { year: 2010, return: 18.8 },
    { year: 2011, return: -3.8 },
    { year: 2012, return: 16.8 },
    { year: 2013, return: 28.5 },
    { year: 2014, return: 10.8 },
    { year: 2015, return: -3.5 },
    { year: 2016, return: 12.8 },
    { year: 2017, return: 24.5 },
    { year: 2018, return: -12.8 },
    { year: 2019, return: 30.8 },
    { year: 2020, return: 18.5 },
    { year: 2021, return: 28.5 },
    { year: 2022, return: -32.5 },
    { year: 2023, return: 25.8 },
    { year: 2024, return: 22.5 },
    { year: 2025, return: 12.8 },
  ],
};

// ── Helper: compute BacktestMetrics from annual returns ──────────────

function computeBacktestMetrics(
  annualReturns: { year: number; return: number }[],
  maxDrawdown: number,
): BacktestMetrics {
  const returns = annualReturns.map((r) => r.return);
  const n = returns.length;

  // CAGR: geometric mean of (1 + r/100) converted back to %
  const cumulativeGrowth = returns.reduce(
    (product, r) => product * (1 + r / 100),
    1,
  );
  const cagr = (Math.pow(cumulativeGrowth, 1 / n) - 1) * 100;

  // Volatility: standard deviation of annual returns
  const mean = returns.reduce((s, r) => s + r, 0) / n;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
  const volatility = Math.sqrt(variance);

  // Worst single year
  const worstYear = Math.min(...returns);

  // 3-year rolling returns
  const rolling3: number[] = [];
  for (let i = 0; i <= n - 3; i++) {
    const cumulative3 =
      (1 + returns[i] / 100) *
      (1 + returns[i + 1] / 100) *
      (1 + returns[i + 2] / 100);
    const annualized3 = (Math.pow(cumulative3, 1 / 3) - 1) * 100;
    rolling3.push(annualized3);
  }
  const worst3Year = rolling3.length > 0 ? Math.min(...rolling3) : worstYear;
  const best3Year = rolling3.length > 0 ? Math.max(...rolling3) : mean;

  // Percent of negative years
  const negativeCount = returns.filter((r) => r < 0).length;
  const percentNegativeYears = (negativeCount / n) * 100;

  // Recovery months: estimated from max drawdown severity
  // Rough heuristic: deeper drawdowns take longer to recover
  const recoveryMonths = Math.round(Math.abs(maxDrawdown) * 0.8);

  return {
    cagr: Math.round(cagr * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    maxDrawdown,
    worstYear: Math.round(worstYear * 100) / 100,
    worst3Year: Math.round(worst3Year * 100) / 100,
    best3Year: Math.round(best3Year * 100) / 100,
    percentNegativeYears: Math.round(percentNegativeYears * 100) / 100,
    recoveryMonths,
  };
}

// ── Crash Scenarios ──────────────────────────────────────────────────
// Losses are scaled by equity exposure per band.

function buildCrashScenarios(band: RiskBand): CrashScenario[] {
  // Total equity percentage for scaling
  const alloc = MODEL_PORTFOLIOS[band].allocation;
  const equityPct =
    (alloc.usEquity + alloc.intlEquity + alloc.emEquity) / 100;

  // Base losses for a 100% equity portfolio
  const dotComBaseEquityLoss = -45; // Dot-com cumulative equity loss
  const gfcBaseEquityLoss = -55; // GFC peak-to-trough equity loss
  const covidBaseEquityLoss = -34; // COVID rapid drawdown

  // Bond portion partially offsets during crashes
  const bondPct =
    (alloc.govBonds + alloc.corpBonds + alloc.highYield) / 100;
  const bondCrashReturn2000 = 0.08; // Bonds did well in 2000-2002
  const bondCrashReturn2008 = -0.02; // Bonds mixed in 2008 (gov up, corp down)
  const bondCrashReturnCovid = 0.03; // Flight to safety

  const cashPct = alloc.cash / 100;
  const altPct = (alloc.reits + alloc.commodities + alloc.alternatives + alloc.crypto) / 100;

  // Dot-Com Bust (2000-2002)
  const dotComLoss =
    dotComBaseEquityLoss * equityPct +
    bondCrashReturn2000 * bondPct * 100 +
    (-15) * altPct; // Alts also declined
  const dotComRecovery = Math.round(12 + equityPct * 48); // 12-60 months

  // Global Financial Crisis (2008-2009)
  const gfcLoss =
    gfcBaseEquityLoss * equityPct +
    bondCrashReturn2008 * bondPct * 100 +
    (-30) * altPct; // REITs/commodities crashed hard
  const gfcRecovery = Math.round(6 + equityPct * 42); // 6-48 months

  // COVID Crash (Feb-Mar 2020)
  const covidLoss =
    covidBaseEquityLoss * equityPct +
    bondCrashReturnCovid * bondPct * 100 +
    (-20) * altPct; // Sharp but brief
  const covidRecovery = Math.round(2 + equityPct * 6); // 2-8 months

  return [
    {
      name: 'Dot-Com Bust (2000-2002)',
      period: '2000-2002',
      loss: Math.round(dotComLoss * 10) / 10,
      recoveryMonths: dotComRecovery,
    },
    {
      name: 'Global Financial Crisis (2008-2009)',
      period: '2008-2009',
      loss: Math.round(gfcLoss * 10) / 10,
      recoveryMonths: gfcRecovery,
    },
    {
      name: 'COVID Crash (Feb-Mar 2020)',
      period: 'Feb-Mar 2020',
      loss: Math.round(covidLoss * 10) / 10,
      recoveryMonths: covidRecovery,
    },
  ];
}

// ── Backtest Results ─────────────────────────────────────────────────

function buildBacktestResults(): Record<RiskBand, BacktestResult> {
  const bands: RiskBand[] = [1, 2, 3, 4, 5, 6, 7];
  const results = {} as Record<RiskBand, BacktestResult>;

  for (const band of bands) {
    const annualReturns = ANNUAL_RETURNS_BY_BAND[band];
    const maxDrawdown = MODEL_PORTFOLIOS[band].maxDrawdown;
    const metrics = computeBacktestMetrics(annualReturns, maxDrawdown);
    const crashScenarios = buildCrashScenarios(band);

    results[band] = {
      band,
      metrics,
      crashScenarios,
      annualReturns,
    };
  }

  return results;
}

export const BACKTEST_RESULTS: Record<RiskBand, BacktestResult> =
  buildBacktestResults();
