/**
 * monte-carlo-engine.ts
 *
 * Main Monte Carlo simulation engine. Runs N stochastic trials of a
 * portfolio projection using correlated equity/bond returns via Cholesky
 * decomposition, independent alt-asset returns, and cash allocation.
 * Produces success probabilities, percentile terminal values, annual
 * percentile bands for fan-chart visualization, and depletion statistics.
 */

import type { MonteCarloInput, MonteCarloResult, PercentileBand } from '../types';
import { SeededRandom } from './random-returns';
import { percentile } from './percentile-calculator';

/**
 * Run a full Monte Carlo simulation.
 *
 * For each simulation run:
 *   1. Start with the initial portfolio value.
 *   2. For each year in the projection horizon:
 *      a. Generate correlated equity/bond returns (Cholesky decomposition).
 *      b. Generate an independent alternative-asset return.
 *      c. Use a fixed cash return (no randomness).
 *      d. Blend returns by asset allocation weights.
 *      e. Apply: portfolio = (portfolio + contribution) * (1 + blendedReturn) - withdrawal
 *      f. If portfolio <= 0, mark as depleted and clamp to 0.
 *   3. Record the terminal (final-year) portfolio value.
 *
 * After all runs:
 *   - Sort terminal values to compute percentiles: 5, 10, 25, 50, 75, 90, 95.
 *   - Success rate: fraction of runs where terminal portfolio > 0 AND >= legacy goal.
 *   - Adjusted success rate: fraction where terminal portfolio >= 50% of initial
 *     real value (i.e., inflation-adjusted purchasing power preservation).
 *   - Annual percentile bands across all runs for each year (fan chart data).
 *   - Depletion year tracking for runs that hit $0.
 *
 * @param input - Fully typed MonteCarloInput with all assumptions.
 * @returns MonteCarloResult with probabilities, percentiles, bands, and depletion info.
 */
export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const {
    runs,
    years,
    startYear,
    initialPortfolio,
    annualContributions,
    annualWithdrawals,
    assetAllocation,
    returns: returnParams,
    inflationMean,
    inflationStdDev,
    successThreshold,
    legacyGoal = 0,
  } = input;

  const {
    equityMean,
    equityStdDev,
    bondMean,
    bondStdDev,
    cashMean,
    altMean,
    altStdDev,
    correlation_equity_bond,
  } = returnParams;

  const { equityPct, bondPct, cashPct, altPct } = assetAllocation;

  // Pre-compute Cholesky factor for bond's independent component
  const choleskyOffDiag = correlation_equity_bond;
  const choleskyDiag = Math.sqrt(1 - correlation_equity_bond * correlation_equity_bond);

  // Storage for terminal values and annual portfolio snapshots
  const terminalValues: number[] = new Array(runs);
  const depletionYears: number[] = [];

  // For annual percentile bands: yearPortfolios[yearIndex] holds all run values for that year
  // We use a flat array layout for cache efficiency: yearPortfolios[yearIdx * runs + runIdx]
  const yearPortfolios: Float64Array = new Float64Array(years * runs);

  // Use a deterministic seed so results are reproducible
  const rng = new SeededRandom(42);

  // Cumulative inflation tracker per run (to compute real terminal value)
  // We'll compute it inline

  for (let run = 0; run < runs; run++) {
    let portfolio = initialPortfolio;
    let depleted = false;
    let depletionYear: number | null = null;
    let cumulativeInflation = 1.0;

    for (let yearIdx = 0; yearIdx < years; yearIdx++) {
      if (depleted) {
        // Portfolio already hit zero; record zero for remaining years
        yearPortfolios[yearIdx * runs + run] = 0;
        continue;
      }

      // Contribution and withdrawal for this year (use last available if arrays are shorter)
      const contribution =
        yearIdx < annualContributions.length
          ? annualContributions[yearIdx]
          : annualContributions.length > 0
            ? annualContributions[annualContributions.length - 1]
            : 0;

      const withdrawal =
        yearIdx < annualWithdrawals.length
          ? annualWithdrawals[yearIdx]
          : annualWithdrawals.length > 0
            ? annualWithdrawals[annualWithdrawals.length - 1]
            : 0;

      // Generate two independent standard normals for equity/bond
      const z1 = rng.gaussian();
      const z2 = rng.gaussian();

      // Cholesky: correlated normals
      const zEquity = z1;
      const zBond = choleskyOffDiag * z1 + choleskyDiag * z2;

      // Generate independent standard normal for alternatives
      const zAlt = rng.gaussian();

      // Generate inflation shock
      const zInflation = rng.gaussian();
      const yearInflation = inflationMean + inflationStdDev * zInflation;
      cumulativeInflation *= 1 + yearInflation;

      // Compute individual asset-class returns
      const equityReturn = equityMean + equityStdDev * zEquity;
      const bondReturn = bondMean + bondStdDev * zBond;
      const cashReturn = cashMean; // Deterministic
      const altReturn = altMean + altStdDev * zAlt;

      // Blend returns according to asset allocation weights
      const blendedReturn =
        equityPct * equityReturn +
        bondPct * bondReturn +
        cashPct * cashReturn +
        altPct * altReturn;

      // Apply growth: portfolio = (portfolio + contribution) * (1 + return) - withdrawal
      portfolio = (portfolio + contribution) * (1 + blendedReturn) - withdrawal;

      // Check for depletion
      if (portfolio <= 0) {
        portfolio = 0;
        depleted = true;
        depletionYear = startYear + yearIdx;
      }

      // Store annual snapshot
      yearPortfolios[yearIdx * runs + run] = portfolio;
    }

    terminalValues[run] = portfolio;

    if (depletionYear !== null) {
      depletionYears.push(depletionYear);
    }
  }

  // ---------- Post-processing ----------

  // Sort terminal values for percentile computation
  const sortedTerminals = terminalValues.slice().sort((a, b) => a - b);

  // Compute terminal percentiles
  const p5 = percentile(sortedTerminals, 5);
  const p10 = percentile(sortedTerminals, 10);
  const p25 = percentile(sortedTerminals, 25);
  const p50 = percentile(sortedTerminals, 50);
  const p75 = percentile(sortedTerminals, 75);
  const p90 = percentile(sortedTerminals, 90);
  const p95 = percentile(sortedTerminals, 95);

  // Success rate: portfolio > 0 AND >= legacy goal at end
  let successCount = 0;
  let adjustedSuccessCount = 0;

  // For adjusted success: portfolio must be >= 50% of initial real value
  // Real value means inflation-adjusted. We need per-run cumulative inflation.
  // Since we didn't store it per-run, re-derive: use a simpler heuristic based on
  // average inflation over the horizon. For accuracy, we re-run the inflation RNG.
  // Instead, compute the 50% threshold using the mean expected inflation.
  const expectedCumulativeInflation = Math.pow(1 + inflationMean, years);
  const adjustedThreshold = 0.5 * initialPortfolio * expectedCumulativeInflation;

  for (let run = 0; run < runs; run++) {
    const tv = terminalValues[run];
    if (tv > 0 && tv >= legacyGoal) {
      successCount++;
    }
    if (tv >= adjustedThreshold) {
      adjustedSuccessCount++;
    }
  }

  const probabilityOfSuccess = successCount / runs;
  const probabilityOfSuccess_adj = adjustedSuccessCount / runs;

  // Average and extremes
  let totalTerminal = 0;
  let worstCase = Infinity;
  let bestCase = -Infinity;

  for (let run = 0; run < runs; run++) {
    const tv = terminalValues[run];
    totalTerminal += tv;
    if (tv < worstCase) worstCase = tv;
    if (tv > bestCase) bestCase = tv;
  }

  const averageTerminalValue = totalTerminal / runs;

  // Average depletion year (for failed runs)
  let averageDepletionYear: number | null = null;
  if (depletionYears.length > 0) {
    let depletionSum = 0;
    for (const dy of depletionYears) {
      depletionSum += dy;
    }
    averageDepletionYear = depletionSum / depletionYears.length;
  }

  // Annual percentile bands for fan chart visualization
  // For each year, extract all run values, sort, and compute percentiles
  const annualPercentileBands: PercentileBand[] = new Array(years);
  const yearBuffer: number[] = new Array(runs);

  for (let yearIdx = 0; yearIdx < years; yearIdx++) {
    const offset = yearIdx * runs;

    // Copy this year's values into a sortable buffer
    for (let run = 0; run < runs; run++) {
      yearBuffer[run] = yearPortfolios[offset + run];
    }

    // Sort ascending
    yearBuffer.sort((a, b) => a - b);

    annualPercentileBands[yearIdx] = {
      year: startYear + yearIdx,
      p5: percentile(yearBuffer, 5),
      p10: percentile(yearBuffer, 10),
      p25: percentile(yearBuffer, 25),
      p50: percentile(yearBuffer, 50),
      p75: percentile(yearBuffer, 75),
      p90: percentile(yearBuffer, 90),
      p95: percentile(yearBuffer, 95),
    };
  }

  return {
    probabilityOfSuccess,
    probabilityOfSuccess_adj,
    runs,
    medianTerminalValue: p50,
    percentiles: { p5, p10, p25, p50, p75, p90, p95 },
    averageTerminalValue,
    worstCase,
    bestCase,
    annualPercentileBands,
    depletionYears,
    averageDepletionYear,
  };
}
