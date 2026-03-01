/**
 * Securities-Backed Lending & Margin Loan Calculation Module
 *
 * Provides analysis for SBLOC (Securities-Backed Lines of Credit) and
 * traditional margin loans. Covers borrowing power, margin call risk,
 * cost comparison, and rate stress testing.
 *
 * @module debt-engine/securities-lending/calculations
 */

import Decimal from 'decimal.js';
import type {
  SBLOCInput,
  SBLOCResult,
  MarginCallAnalysis,
  MarginLoanInput,
  MarginLoanResult,
  LTVRating,
} from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Standard SBLOC advance rate range (50-70%). We use 0.60 as default. */
const DEFAULT_ADVANCE_RATE = new Decimal('0.60');

/** Maintenance margin rate for SBLOC (typically 65%). */
const SBLOC_MAINTENANCE_MARGIN = new Decimal('0.65');

/** Regulation T initial margin requirement (50%). */
const REG_T_INITIAL_MARGIN = new Decimal('0.50');

/** FINRA minimum maintenance margin (25%). */
const FINRA_MAINTENANCE_MARGIN = new Decimal('0.25');

/** Assumed average annual portfolio growth. */
const DEFAULT_PORTFOLIO_GROWTH = new Decimal('0.08');

/** Z-score for 95% confidence. */
const Z_95 = new Decimal('1.645');

/** Trading days per year. */
const TRADING_DAYS_PER_YEAR = new Decimal('252');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Round a Decimal to 2 decimal places and return as a plain number.
 */
function toNum(d: Decimal): number {
  return d.toDecimalPlaces(2).toNumber();
}

/**
 * Simplified cumulative normal distribution approximation (Abramowitz & Stegun).
 * Returns P(Z <= z) for the standard normal distribution.
 */
function normCdf(z: Decimal): Decimal {
  const a1 = new Decimal('0.254829592');
  const a2 = new Decimal('-0.284496736');
  const a3 = new Decimal('1.421413741');
  const a4 = new Decimal('-1.453152027');
  const a5 = new Decimal('1.061405429');
  const p = new Decimal('0.3275911');

  const sign = z.lt(0) ? new Decimal(-1) : new Decimal(1);
  const absZ = z.abs();
  const t = new Decimal(1).div(new Decimal(1).plus(p.mul(absZ)));
  const t2 = t.mul(t);
  const t3 = t2.mul(t);
  const t4 = t3.mul(t);
  const t5 = t4.mul(t);

  const poly = a1.mul(t).plus(a2.mul(t2)).plus(a3.mul(t3)).plus(a4.mul(t4)).plus(a5.mul(t5));
  const expPart = Decimal.exp(absZ.mul(absZ).neg().div(2));
  const cdf = new Decimal(1).minus(poly.mul(expPart));

  // Adjust for negative z
  return new Decimal(0.5).plus(sign.mul(cdf.minus(new Decimal(0.5))));
}

/**
 * Estimate probability of a portfolio drop exceeding a given threshold
 * over a specified time horizon using log-normal model.
 *
 * @param dropPct     Required portfolio drop (e.g. 0.30 = 30%)
 * @param volatility  Annual portfolio volatility (e.g. 0.18 = 18%)
 * @param yearsAhead  Time horizon in fractional years
 * @returns           Probability of drop (0-1)
 */
function estimateDropProbability(
  dropPct: Decimal,
  volatility: Decimal,
  yearsAhead: Decimal,
): Decimal {
  if (dropPct.lte(0)) return new Decimal(1);
  if (volatility.lte(0)) return new Decimal(0);

  // Expected log return: (mu - sigma^2/2) * T
  const mu = new Decimal('0.08'); // long-run equity return assumption
  const drift = mu.minus(volatility.mul(volatility).div(2)).mul(yearsAhead);
  const diffusion = volatility.mul(yearsAhead.sqrt());

  // We need P(return < -dropPct) => P(ln(S/S0) < ln(1 - dropPct))
  const threshold = Decimal.ln(new Decimal(1).minus(dropPct));
  const zScore = threshold.minus(drift).div(diffusion);

  return normCdf(zScore);
}

/**
 * Determine LTV risk rating.
 */
function rateLTV(ltv: Decimal): LTVRating {
  if (ltv.lt(new Decimal('0.30'))) return 'CONSERVATIVE';
  if (ltv.lte(new Decimal('0.50'))) return 'MODERATE';
  return 'AGGRESSIVE';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze a Securities-Backed Line of Credit (SBLOC) proposal.
 *
 * Computes borrowing power, LTV rating, margin call risk, cost comparison
 * against liquidation and mortgage alternatives, rate stress testing, and
 * generates risk warnings plus a tax strategy recommendation.
 *
 * @param input - SBLOC analysis inputs including portfolio, loan, tax, and
 *                alternative funding details.
 * @returns Complete SBLOC analysis result.
 */
export function analyzeSecuritiesBackedLending(input: SBLOCInput): SBLOCResult {
  const { portfolio, proposedLoan, taxProfile, alternativeFunding } = input;

  const portfolioValue = new Decimal(portfolio.totalValue);
  const eligibleCollateral = new Decimal(portfolio.eligibleCollateral);
  const loanAmount = new Decimal(proposedLoan.amount);
  const loanRate = new Decimal(proposedLoan.rate);
  const loanTermMonths = new Decimal(proposedLoan.termMonths);

  // -----------------------------------------------------------------------
  // Borrowing power & LTV
  // -----------------------------------------------------------------------
  const maxBorrowingPower = eligibleCollateral.mul(DEFAULT_ADVANCE_RATE);
  const ltv = portfolioValue.gt(0) ? loanAmount.div(portfolioValue) : new Decimal(0);
  const ltvRating = rateLTV(ltv);

  // -----------------------------------------------------------------------
  // Margin call analysis
  // -----------------------------------------------------------------------
  const maintenanceRate = SBLOC_MAINTENANCE_MARGIN;
  const threshold = loanAmount.div(maintenanceRate);
  const buffer = portfolioValue.minus(threshold);
  const dropToCall = portfolioValue.gt(0)
    ? new Decimal(1).minus(threshold.div(portfolioValue))
    : new Decimal(0);

  // Maintenance call amount: how much cash you'd need if called now
  const maintenanceCallAmount = Decimal.max(
    new Decimal(0),
    loanAmount.minus(portfolioValue.mul(maintenanceRate)),
  );

  // Probability estimates (assume ~18% volatility for diversified portfolio)
  const defaultVol = new Decimal('0.18');
  const prob6m = estimateDropProbability(dropToCall, defaultVol, new Decimal('0.5'));
  const prob12m = estimateDropProbability(dropToCall, defaultVol, new Decimal('1.0'));
  // Bear market: assume ~40% drop over ~1.5 years
  const probBear = dropToCall.lt(new Decimal('0.40')) ? new Decimal('0.65') : new Decimal('0.25');

  const remedyOptions: string[] = [
    'Deposit additional securities as collateral',
    'Pay down a portion of the outstanding loan balance',
    'Sell portfolio positions to reduce the loan-to-value ratio',
  ];

  const marginCallAnalysis: MarginCallAnalysis = {
    marginCallThreshold: toNum(threshold),
    bufferAmount: toNum(buffer),
    portfolioDropToCall: toNum(dropToCall),
    probabilityOfCall: {
      next6Months: toNum(prob6m),
      next12Months: toNum(prob12m),
      nextBearMarket: toNum(probBear),
    },
    maintenanceCallAmount: toNum(maintenanceCallAmount),
    remedyOptions,
  };

  // -----------------------------------------------------------------------
  // Cost analysis
  // -----------------------------------------------------------------------
  const annualInterestCost = loanAmount.mul(loanRate);

  // After-tax cost: deductible only if business/investment purpose
  const purposeLower = proposedLoan.purpose.toLowerCase();
  const isDeductibleUse =
    purposeLower.includes('business') || purposeLower.includes('invest');
  const combinedMarginalRate = new Decimal(taxProfile.federalMarginalRate).plus(
    new Decimal(taxProfile.stateMarginalRate),
  );
  const afterTaxInterestCost = isDeductibleUse
    ? annualInterestCost.mul(new Decimal(1).minus(combinedMarginalRate))
    : annualInterestCost;

  // vs Liquidating: capital gains tax avoided
  const gain = new Decimal(alternativeFunding.liquidateGain);
  const capitalGainsRate = new Decimal('0.238'); // 20% LTCG + 3.8% NIIT
  const capitalGainsTaxAvoided = gain.mul(capitalGainsRate);

  // Opportunity cost of liquidating: growth lost over loan term
  const loanTermYears = loanTermMonths.div(12);
  const portfolioGrowthLost = loanAmount.mul(
    new Decimal(1).plus(DEFAULT_PORTFOLIO_GROWTH).pow(loanTermYears).minus(1),
  );

  const netAdvantageSBLOC = capitalGainsTaxAvoided
    .plus(portfolioGrowthLost)
    .minus(annualInterestCost.mul(loanTermYears));

  // vs Mortgage
  const mortgageRate = new Decimal(alternativeFunding.mortgageRate);
  const mortgageAnnualInterest = loanAmount.mul(mortgageRate);
  const sblocAnnualInterest = annualInterestCost;
  const netDifferenceMortgage = mortgageAnnualInterest.minus(sblocAnnualInterest);

  const speedAdvantage =
    'SBLOC funding is typically available within days versus 30-60 days for a mortgage';

  // -----------------------------------------------------------------------
  // Rate stress test (+1%, +2%, +3%)
  // -----------------------------------------------------------------------
  const shocks = [
    { bps: 1, label: '+1%' },
    { bps: 2, label: '+2%' },
    { bps: 3, label: '+3%' },
  ];

  const rateStressTest = shocks.map(({ bps, label }) => {
    const shockedRate = loanRate.plus(new Decimal(bps).div(100));
    const monthlyRate = shockedRate.div(12);
    let newMonthlyPayment: Decimal;

    if (proposedLoan.interestOnly) {
      newMonthlyPayment = loanAmount.mul(monthlyRate);
    } else {
      // Standard amortization formula
      if (monthlyRate.gt(0)) {
        const factor = monthlyRate
          .plus(1)
          .pow(loanTermMonths.toNumber());
        newMonthlyPayment = loanAmount
          .mul(monthlyRate.mul(factor))
          .div(factor.minus(1));
      } else {
        newMonthlyPayment = loanAmount.div(loanTermMonths);
      }
    }

    const newAnnualCost = loanAmount.mul(shockedRate);
    const annualCostIncrease = newAnnualCost.minus(annualInterestCost);
    const recommendation =
      annualCostIncrease.gt(annualInterestCost.mul(new Decimal('0.50')))
        ? 'Consider a rate cap or converting a portion to fixed rate'
        : 'Manageable increase within risk tolerance';

    return {
      rateScenario: label,
      newMonthlyPayment: toNum(newMonthlyPayment),
      annualCostIncrease: toNum(annualCostIncrease),
      recommendation,
    };
  });

  // -----------------------------------------------------------------------
  // Risk warnings
  // -----------------------------------------------------------------------
  const riskWarnings: string[] = [];
  if (ltv.gt(new Decimal('0.50'))) {
    riskWarnings.push('LTV exceeds 50% -- aggressive leverage increases margin call risk');
  }
  if (buffer.lt(portfolioValue.mul(new Decimal('0.15')))) {
    riskWarnings.push('Margin call buffer is less than 15% of portfolio value');
  }
  if (loanRate.gte(new Decimal('0.07'))) {
    riskWarnings.push('SBLOC rate is high; verify competitive pricing with lender');
  }
  if (prob12m.gt(new Decimal('0.15'))) {
    riskWarnings.push('Probability of margin call within 12 months exceeds 15%');
  }
  if (loanTermMonths.gt(60)) {
    riskWarnings.push(
      'Long-duration SBLOC carries elevated interest-rate and market risk',
    );
  }

  // -----------------------------------------------------------------------
  // Recommendation & tax strategy
  // -----------------------------------------------------------------------
  let recommendation: string;
  if (ltvRating === 'CONSERVATIVE' && netAdvantageSBLOC.gt(0)) {
    recommendation =
      'SBLOC is a strong fit: low leverage, tax-efficient, and preserves portfolio growth.';
  } else if (ltvRating === 'MODERATE') {
    recommendation =
      'SBLOC is reasonable but monitor LTV closely. Consider partial cash funding to reduce exposure.';
  } else {
    recommendation =
      'SBLOC at this leverage is risky. Consider alternative funding or reduce the loan amount.';
  }

  const taxStrategy = isDeductibleUse
    ? `Interest may be deductible as ${purposeLower.includes('business') ? 'business' : 'investment'} interest. ` +
      `Estimated annual tax savings: $${toNum(annualInterestCost.mul(combinedMarginalRate))}. ` +
      'Ensure proper documentation of fund usage for deductibility.'
    : 'Interest on this SBLOC is not tax-deductible for the stated purpose. ' +
      'Consider restructuring the use of funds for investment or business purposes to unlock deductibility.';

  // -----------------------------------------------------------------------
  // Monthly payment for base cost scenario
  // -----------------------------------------------------------------------
  const baseMonthlyRate = loanRate.div(12);
  let baseMonthlyPayment: Decimal;
  if (proposedLoan.interestOnly) {
    baseMonthlyPayment = loanAmount.mul(baseMonthlyRate);
  } else {
    if (baseMonthlyRate.gt(0)) {
      const factor = baseMonthlyRate.plus(1).pow(loanTermMonths.toNumber());
      baseMonthlyPayment = loanAmount.mul(baseMonthlyRate.mul(factor)).div(factor.minus(1));
    } else {
      baseMonthlyPayment = loanAmount.div(loanTermMonths);
    }
  }

  return {
    maxBorrowingPower: toNum(maxBorrowingPower),
    loanToValue: toNum(ltv),
    ltvRating,
    marginCallAnalysis,
    costAnalysis: {
      annualInterestCost: toNum(annualInterestCost),
      afterTaxInterestCost: toNum(afterTaxInterestCost),
      vsLiquidatingPortfolio: {
        capitalGainsTaxAvoided: toNum(capitalGainsTaxAvoided),
        portfolioGrowthLost: toNum(portfolioGrowthLost),
        netAdvantageOfSBLOC: toNum(netAdvantageSBLOC),
      },
      vsMortgage: {
        mortgageInterest: toNum(mortgageAnnualInterest),
        sblocInterest: toNum(sblocAnnualInterest),
        netDifference: toNum(netDifferenceMortgage),
        speedAdvantage,
      },
    },
    recommendation,
    riskWarnings,
    taxStrategy,
    rateStressTest,
  };
}

/**
 * Analyze a traditional margin loan proposal.
 *
 * Computes Reg T initial margin, FINRA maintenance, equity buffer, margin
 * call proximity, daily VaR at 95% confidence, margin call probability
 * over the stated holding period, annual interest cost, and red flags.
 *
 * @param input - Margin loan analysis inputs.
 * @returns Complete margin loan analysis result.
 */
export function analyzeMarginLoan(input: MarginLoanInput): MarginLoanResult {
  const portfolioValue = new Decimal(input.portfolioValue);
  const marginableValue = new Decimal(input.marginableValue);
  const proposedBorrow = new Decimal(input.proposedBorrow);
  const marginRate = new Decimal(input.marginRate);
  const portfolioVol = new Decimal(input.portfolioVolatility);

  // -----------------------------------------------------------------------
  // Margin requirements
  // -----------------------------------------------------------------------
  const initialMarginRequired = marginableValue.mul(REG_T_INITIAL_MARGIN);
  const maintenanceMarginLevel = FINRA_MAINTENANCE_MARGIN;

  // -----------------------------------------------------------------------
  // Equity & buffer
  // -----------------------------------------------------------------------
  const currentEquity = portfolioValue.minus(proposedBorrow);

  // Margin call when: (portfolioValue_new - loan) / portfolioValue_new < maintenance
  // => portfolioValue_new < loan / (1 - maintenance)
  const callThreshold = proposedBorrow.div(
    new Decimal(1).minus(FINRA_MAINTENANCE_MARGIN),
  );
  const bufferToMarginCall = portfolioValue.minus(callThreshold);
  const portfolioDropToCall = portfolioValue.gt(0)
    ? new Decimal(1).minus(callThreshold.div(portfolioValue))
    : new Decimal(0);

  // -----------------------------------------------------------------------
  // Daily VaR at 95% confidence
  // -----------------------------------------------------------------------
  const dailyVol = portfolioVol.mul(
    new Decimal(1).div(TRADING_DAYS_PER_YEAR).sqrt(),
  );
  const dailyVaR = portfolioValue.mul(dailyVol).mul(Z_95);

  // -----------------------------------------------------------------------
  // Margin call probability over holding period
  // -----------------------------------------------------------------------
  const holdingPeriodYears = (() => {
    switch (input.holdingPeriod) {
      case 'DAYS':
        return new Decimal('0.02'); // ~1 week
      case 'WEEKS':
        return new Decimal('0.08'); // ~1 month
      case 'MONTHS':
        return new Decimal('0.5'); // ~6 months
    }
  })();

  const marginCallProbability = portfolioDropToCall.gt(0)
    ? estimateDropProbability(portfolioDropToCall, portfolioVol, holdingPeriodYears)
    : new Decimal(1);

  // -----------------------------------------------------------------------
  // Annual interest cost
  // -----------------------------------------------------------------------
  const annualInterestCost = proposedBorrow.mul(marginRate);

  // -----------------------------------------------------------------------
  // Red flags
  // -----------------------------------------------------------------------
  const redFlags: string[] = [];
  const currentLTV = portfolioValue.gt(0)
    ? proposedBorrow.div(portfolioValue)
    : new Decimal(1);

  if (currentLTV.gt(new Decimal('0.50'))) {
    redFlags.push('LTV exceeds 50%');
  }
  if (portfolioVol.gt(new Decimal('0.25'))) {
    redFlags.push('High portfolio volatility (>25% annualized)');
  }
  if (proposedBorrow.gt(initialMarginRequired)) {
    redFlags.push('Proposed borrow exceeds Reg T initial margin limit');
  }
  if (portfolioDropToCall.lt(new Decimal('0.15'))) {
    redFlags.push('Less than 15% portfolio drop triggers margin call');
  }
  if (marginRate.gt(new Decimal('0.08'))) {
    redFlags.push('Margin rate exceeds 8% -- consider negotiating or alternative funding');
  }
  if (marginCallProbability.gt(new Decimal('0.20'))) {
    redFlags.push(
      'Margin call probability exceeds 20% over the stated holding period',
    );
  }

  // -----------------------------------------------------------------------
  // Recommendation
  // -----------------------------------------------------------------------
  let recommendation: string;
  if (redFlags.length === 0 && currentLTV.lt(new Decimal('0.30'))) {
    recommendation =
      'Margin loan appears well-collateralized with adequate buffer. Proceed with monitoring.';
  } else if (redFlags.length <= 2) {
    recommendation =
      'Margin loan carries moderate risk. Maintain a cash reserve to meet potential margin calls.';
  } else {
    recommendation =
      'Multiple risk factors identified. Reduce borrow amount or consider alternative financing.';
  }

  return {
    initialMarginRequired: toNum(initialMarginRequired),
    maintenanceMarginLevel: toNum(maintenanceMarginLevel),
    currentEquity: toNum(currentEquity),
    bufferToMarginCall: toNum(bufferToMarginCall),
    portfolioDropToCall: toNum(portfolioDropToCall),
    dailyVaR: toNum(dailyVaR),
    marginCallProbability: toNum(marginCallProbability),
    annualInterestCost: toNum(annualInterestCost),
    recommendation,
    redFlags,
  };
}
