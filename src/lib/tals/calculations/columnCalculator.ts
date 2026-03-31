import { TalsInputs, TalsYearRow, TalsColumnResult, TalsColumnConfig, TalsColumnSummary } from '../types';
import { getProviderById } from '../providers';
import { calculateStrategyYear, CumulativeState } from './formulaEngine';

function buildSummary(
  rows: TalsYearRow[],
  holdFinalWealth: number,
  targetConcentration: number
): TalsColumnSummary {
  const last = rows[rows.length - 1];
  const totalTaxSavings = rows.reduce((sum, r) => sum + r.taxSavings, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.allInCost, 0);
  const netTaxAlpha = totalTaxSavings - totalCost;
  const years = rows.length;
  const annualizedNetAlpha = years > 0 ? netTaxAlpha / years : 0;

  // Find year when concentration drops below target
  let yearsToTarget: number | null = null;
  for (const row of rows) {
    if (row.concentratedPctRemaining <= targetConcentration) {
      yearsToTarget = row.year;
      break;
    }
  }

  return {
    totalTaxSavings,
    totalCost,
    netTaxAlpha,
    annualizedNetAlpha,
    finalAfterTaxWealth: last?.afterTaxWealth ?? 0,
    yearsToTarget,
    finalConcentration: last?.concentratedPctRemaining ?? 1,
    wealthDeltaVsHold: (last?.afterTaxWealth ?? 0) - holdFinalWealth,
  };
}

/**
 * Hold concentrated stock — no action taken.
 * Stock grows at market return, concentration stays at 100%.
 */
export function calculateHoldConcentrated(inputs: TalsInputs): TalsYearRow[] {
  const rows: TalsYearRow[] = [];
  let portfolioValue = inputs.portfolio.concentratedStockValue;

  for (let year = 1; year <= inputs.assumptions.horizon; year++) {
    const grossReturn = inputs.assumptions.marketReturn;
    portfolioValue = portfolioValue * (1 + grossReturn);

    rows.push({
      year,
      grossReturn,
      taxLossesGenerated: 0,
      cumulativeCNCL: 0,
      taxSavings: 0,
      allInCost: 0,
      netTaxAlpha: 0,
      concentratedPctRemaining: 1.0,
      portfolioValue,
      afterTaxWealth: portfolioValue,
    });
  }
  return rows;
}

/**
 * Sell immediately, pay tax, reinvest diversified.
 */
export function calculateSellUpfront(inputs: TalsInputs): TalsYearRow[] {
  const rows: TalsYearRow[] = [];
  const { concentratedStockValue, costBasis } = inputs.portfolio;
  const gain = Math.max(0, concentratedStockValue - costBasis);
  const taxHit = gain * inputs.tax.blendedCGRate;
  let portfolioValue = concentratedStockValue - taxHit;

  for (let year = 1; year <= inputs.assumptions.horizon; year++) {
    const grossReturn = inputs.assumptions.marketReturn;
    const netReturn = grossReturn - inputs.assumptions.riaFee;
    portfolioValue = portfolioValue * (1 + netReturn);
    const allInCost = inputs.assumptions.riaFee * (portfolioValue / (1 + netReturn));

    rows.push({
      year,
      grossReturn,
      taxLossesGenerated: 0,
      cumulativeCNCL: 0,
      taxSavings: 0,
      allInCost,
      netTaxAlpha: -allInCost,
      concentratedPctRemaining: 0,
      portfolioValue,
      afterTaxWealth: portfolioValue,
    });
  }
  return rows;
}

/**
 * Direct indexing (long-only TLH) — moderate tax-loss harvesting,
 * 12% Y1 decaying ~15%/yr, 30% lifetime cap, no leverage.
 */
export function calculateDirectIndexing(inputs: TalsInputs): TalsYearRow[] {
  const rows: TalsYearRow[] = [];
  let portfolioValue = inputs.portfolio.concentratedStockValue;
  let cumulativeCNCL = 0;
  let cumulativeTaxSavings = 0;

  for (let year = 1; year <= inputs.assumptions.horizon; year++) {
    const grossReturn = inputs.assumptions.marketReturn;

    // TLH rate: 12% Y1 decaying 15%/yr with 30% lifetime cap
    let yearTLH = 0.12 * Math.pow(0.85, year - 1);
    const maxRemaining = 0.30 - cumulativeCNCL;
    yearTLH = Math.max(0, Math.min(yearTLH, maxRemaining));

    const taxLossesGenerated = yearTLH * portfolioValue;
    cumulativeCNCL += yearTLH;
    const taxSavings = taxLossesGenerated * inputs.tax.blendedCGRate;
    cumulativeTaxSavings += taxSavings;

    const riaFee = inputs.assumptions.riaFee;
    const diMgmtFee = 0.002; // Typical DI platform fee
    const allInCost = (riaFee + diMgmtFee) * portfolioValue;

    const netReturn = grossReturn - riaFee - diMgmtFee;
    portfolioValue = portfolioValue * (1 + netReturn);

    // DI gradually diversifies — roughly 15% per year
    const prevConcentration = year === 1 ? 1.0 : rows[year - 2].concentratedPctRemaining;
    const concentratedPctRemaining = Math.max(0, prevConcentration * 0.85);

    rows.push({
      year,
      grossReturn,
      taxLossesGenerated,
      cumulativeCNCL,
      taxSavings,
      allInCost,
      netTaxAlpha: taxSavings - allInCost,
      concentratedPctRemaining,
      portfolioValue,
      afterTaxWealth: portfolioValue + cumulativeTaxSavings,
    });
  }
  return rows;
}

/**
 * TALS strategy — delegates to formulaEngine per year.
 */
export function calculateTalsStrategy(
  inputs: TalsInputs,
  config: TalsColumnConfig
): TalsYearRow[] {
  const provider = getProviderById(config.strategyId ?? '');
  if (!provider) return [];

  const rows: TalsYearRow[] = [];
  let state: CumulativeState = {
    cumulativeCNCL: 0,
    cumulativeTaxSavings: 0,
    concentratedPctRemaining: inputs.portfolio.concentratedStockValue / inputs.portfolio.value,
    portfolioValue: inputs.portfolio.value,
  };

  for (let year = 1; year <= inputs.assumptions.horizon; year++) {
    const result = calculateStrategyYear(
      provider,
      inputs,
      year,
      state,
      config.feeOverride
    );

    rows.push({
      year,
      grossReturn: result.grossReturn,
      taxLossesGenerated: result.taxLossesGenerated,
      cumulativeCNCL: result.cumulativeCNCL,
      taxSavings: result.taxSavings,
      allInCost: result.allInCost,
      netTaxAlpha: result.netTaxAlpha,
      concentratedPctRemaining: result.concentratedPctRemaining,
      portfolioValue: result.portfolioValue,
      afterTaxWealth: result.afterTaxWealth,
    });

    state = {
      cumulativeCNCL: result.cumulativeCNCL,
      cumulativeTaxSavings: state.cumulativeTaxSavings + result.taxSavings,
      concentratedPctRemaining: result.concentratedPctRemaining,
      portfolioValue: result.portfolioValue,
    };
  }
  return rows;
}

/**
 * Calculate a full column result for any column type.
 */
export function calculateColumn(
  inputs: TalsInputs,
  config: TalsColumnConfig,
  holdFinalWealth: number
): TalsColumnResult {
  let yearByYear: TalsYearRow[];

  switch (config.type) {
    case 'hold':
      yearByYear = calculateHoldConcentrated(inputs);
      break;
    case 'sell_upfront':
      yearByYear = calculateSellUpfront(inputs);
      break;
    case 'direct_indexing':
      yearByYear = calculateDirectIndexing(inputs);
      break;
    case 'tals':
      yearByYear = calculateTalsStrategy(inputs, config);
      break;
    default:
      yearByYear = [];
  }

  const strategy = config.type === 'tals' ? (getProviderById(config.strategyId ?? '') ?? null) : null;
  const summary = buildSummary(yearByYear, holdFinalWealth, inputs.assumptions.targetConcentration);

  return { config, strategy, yearByYear, summary };
}
