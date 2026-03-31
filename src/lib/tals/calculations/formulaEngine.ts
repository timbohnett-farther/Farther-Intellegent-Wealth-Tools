import { ProviderStrategy, TalsInputs } from '../types';

export interface CumulativeState {
  cumulativeCNCL: number;
  cumulativeTaxSavings: number;
  concentratedPctRemaining: number;
  portfolioValue: number;
}

export interface YearCalcResult {
  grossReturn: number;
  taxLossesGenerated: number;
  cumulativeCNCL: number;
  taxSavings: number;
  allInCost: number;
  netTaxAlpha: number;
  concentratedPctRemaining: number;
  portfolioValue: number;
  afterTaxWealth: number;
}

/**
 * Calculate a single year for a TALS strategy, switching on formulaTrack.
 *
 * Track A (AQR, Quantinno): High alpha, non-decaying CNCL, CG tax character
 * Track B (Frec, Cache): Moderate alpha, non-decaying CNCL, CG tax character
 * Track C (Parametric, NB, Aperio): Conservative alpha, non-decaying CNCL
 * Track D (Goldman TACS): Long-only, decaying CNCL with lifetime cap
 * Track E (AQR Delphi+): Like Track A but ordinary income tax offset
 */
export function calculateStrategyYear(
  provider: ProviderStrategy,
  inputs: TalsInputs,
  year: number,
  prev: CumulativeState,
  feeOverride?: number
): YearCalcResult {
  const { marketReturn, riaFee } = inputs.assumptions;
  const { blendedCGRate, ordinaryRate } = inputs.tax;
  const mgmtFee = feeOverride ?? provider.fees.mgmtFee;

  // Gross return of the TALS sleeve
  const rM = marketReturn;
  const gL = provider.longRatio;
  const gS = provider.shortRatio;
  const aL = provider.alpha.longAlpha;
  const aS = provider.alpha.shortAlpha;
  const grossReturn = rM + gL * aL + gS * aS;

  // CNCL (constructive net capital losses) for the year
  let yearCNCL: number;
  if (provider.cncl.decaying) {
    // Track D: decaying CNCL
    yearCNCL = provider.cncl.cnclBase * Math.pow(1 - provider.cncl.decayRate, year - 1);
    // Apply lifetime cap
    const maxRemaining = provider.cncl.lifetimeCap - prev.cumulativeCNCL;
    yearCNCL = Math.max(0, Math.min(yearCNCL, maxRemaining));
  } else {
    // Tracks A/B/C/E: non-decaying with mild annual decay (0.5%/yr)
    yearCNCL = provider.cncl.cnclBase * provider.grossMultiplier * Math.pow(0.995, year - 1);
  }

  const taxLossesGenerated = yearCNCL * prev.portfolioValue;
  const cumulativeCNCL = prev.cumulativeCNCL + yearCNCL;

  // Tax savings depend on character
  let taxRate: number;
  if (provider.formulaTrack === 'E') {
    // Track E: ordinary income offset
    taxRate = ordinaryRate;
  } else {
    taxRate = blendedCGRate;
  }
  const taxSavings = taxLossesGenerated * taxRate;

  // All-in cost
  const allInCost =
    (mgmtFee +
      provider.fees.postTaxFinancingCost +
      provider.fees.txnCosts +
      riaFee) *
    prev.portfolioValue;

  // Net tax alpha = tax savings - all-in cost
  const netTaxAlpha = taxSavings - allInCost;

  // Concentrated position reduction via diversification
  // TALS strategies reduce concentrated exposure through leverage rebalancing
  const diversificationRate = Math.min(0.20, (gL - 1.0) * 0.15 + 0.05);
  const concentratedPctRemaining = Math.max(
    0,
    prev.concentratedPctRemaining * (1 - diversificationRate)
  );

  // Portfolio grows at gross return minus costs
  const netReturnRate = grossReturn - mgmtFee - provider.fees.postTaxFinancingCost - provider.fees.txnCosts - riaFee;
  const portfolioValue = prev.portfolioValue * (1 + netReturnRate);

  // After-tax wealth = portfolio value + cumulative tax savings
  const afterTaxWealth = portfolioValue + prev.cumulativeTaxSavings + taxSavings;

  return {
    grossReturn,
    taxLossesGenerated,
    cumulativeCNCL,
    taxSavings,
    allInCost,
    netTaxAlpha,
    concentratedPctRemaining,
    portfolioValue,
    afterTaxWealth,
  };
}
