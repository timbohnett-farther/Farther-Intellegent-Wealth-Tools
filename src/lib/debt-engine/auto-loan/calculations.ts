/**
 * Auto Loan Calculation Module
 *
 * Provides analysis for auto loans including current equity/LTV status,
 * payoff vs. invest decision analysis, and lease-versus-buy comparison.
 *
 * @module debt-engine/auto-loan/calculations
 */

import Decimal from 'decimal.js';
import type { AutoLoanInput, AutoLoanResult } from '../types';

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
 * Calculate total remaining interest on a fully-amortizing loan given
 * remaining monthly payment, number of months, and current balance.
 *
 * Total interest = (monthlyPayment * remainingMonths) - currentBalance
 */
function totalRemainingInterest(
  monthlyPayment: Decimal,
  remainingMonths: Decimal,
  currentBalance: Decimal,
): Decimal {
  return monthlyPayment.mul(remainingMonths).minus(currentBalance);
}

/**
 * Compute effective APR from remaining payment stream.
 *
 * Uses the relationship: effective rate ~ 2 * totalInterest / (balance * (term + 1) / 12)
 * This is the N-ratio approximation for short-duration consumer loans.
 * Falls back to stated rate derivation when the approximation is degenerate.
 */
function effectiveAPR(
  monthlyPayment: Decimal,
  remainingMonths: Decimal,
  currentBalance: Decimal,
): Decimal {
  if (currentBalance.lte(0) || remainingMonths.lte(0)) return new Decimal(0);

  const totalPaid = monthlyPayment.mul(remainingMonths);
  const totalInterest = totalPaid.minus(currentBalance);
  if (totalInterest.lte(0)) return new Decimal(0);

  const avgBalance = currentBalance.div(2);
  const years = remainingMonths.div(12);

  if (avgBalance.mul(years).lte(0)) return new Decimal(0);

  return totalInterest.div(avgBalance.mul(years));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze an auto loan for current status, payoff decision, and
 * optional lease-vs-buy comparison.
 *
 * **Current status** reports equity, LTV, underwater flag, remaining
 * interest, and effective APR.
 *
 * **Payoff analysis** compares paying off the loan now (saving remaining
 * interest) against investing the lump sum at the expected investment
 * return over the remaining term. Recommends PAY_OFF when the loan rate
 * exceeds the investment return, INVEST_INSTEAD when the investment
 * return is significantly higher, and NEUTRAL when the difference is
 * marginal.
 *
 * **Lease vs. buy** (when leaseOption is provided) computes total
 * outflows for each path, net costs accounting for residual vehicle
 * value, and converts the lease money factor to an equivalent APR.
 *
 * @param input - Auto loan analysis inputs.
 * @returns Complete auto loan analysis result.
 */
export function analyzeAutoLoan(input: AutoLoanInput): AutoLoanResult {
  const vehicleValue = new Decimal(input.vehicleValue);
  const loanBalance = new Decimal(input.loanBalance);
  const interestRate = new Decimal(input.interestRate);
  const remainingMonths = new Decimal(input.remainingMonths);
  const monthlyPayment = new Decimal(input.monthlyPayment);
  const lumpSum = new Decimal(input.lumpSumAvailable);
  const investmentReturn = new Decimal(input.investmentReturn);

  // -----------------------------------------------------------------------
  // Current status
  // -----------------------------------------------------------------------
  const equity = vehicleValue.minus(loanBalance);
  const ltv = vehicleValue.gt(0)
    ? loanBalance.div(vehicleValue)
    : new Decimal(1);
  const isUnderwaterFlag = equity.lt(0);
  const totalInterestRemaining = totalRemainingInterest(
    monthlyPayment,
    remainingMonths,
    loanBalance,
  );
  const effectiveRate = effectiveAPR(monthlyPayment, remainingMonths, loanBalance);

  const currentStatus = {
    equity: toNum(equity),
    ltv: toNum(ltv),
    isUnderwaterFlag,
    totalInterestRemaining: toNum(Decimal.max(new Decimal(0), totalInterestRemaining)),
    effectiveAPR: toNum(effectiveRate),
  };

  // -----------------------------------------------------------------------
  // Payoff analysis
  // -----------------------------------------------------------------------
  const interestSavedByPayoff = Decimal.max(new Decimal(0), totalInterestRemaining);

  // Opportunity cost: lumpSum invested at investmentReturn for remaining years
  const remainingYears = remainingMonths.div(12);
  const opportunityCostOfPayoff = lumpSum.mul(investmentReturn).mul(remainingYears);

  const netAdvantage = interestSavedByPayoff.minus(opportunityCostOfPayoff);

  // Decision thresholds
  // Threshold for "significantly higher" investment return: 1.5pp above loan rate
  const threshold = new Decimal('0.015');
  let payoffRecommendation: 'PAY_OFF' | 'INVEST_INSTEAD' | 'NEUTRAL';

  if (interestRate.gt(investmentReturn)) {
    payoffRecommendation = 'PAY_OFF';
  } else if (investmentReturn.minus(interestRate).gt(threshold)) {
    payoffRecommendation = 'INVEST_INSTEAD';
  } else {
    payoffRecommendation = 'NEUTRAL';
  }

  const payoffAnalysis = {
    totalInterestSavedByPayoff: toNum(interestSavedByPayoff),
    opportunityCostOfPayoff: toNum(opportunityCostOfPayoff),
    netAdvantage: toNum(netAdvantage),
    recommendation: payoffRecommendation,
  };

  // -----------------------------------------------------------------------
  // Lease vs. Buy analysis (optional)
  // -----------------------------------------------------------------------
  let leaseVsBuyAnalysis: AutoLoanResult['leaseVsBuyAnalysis'];

  if (input.leaseOption) {
    const lease = input.leaseOption;
    const monthlyLease = new Decimal(lease.monthlyLease);
    const leaseTerm = new Decimal(lease.leaseTerm);
    const residualValue = new Decimal(lease.residualValue);
    const acquisitionFee = new Decimal(lease.acquisitionFee);
    const moneyFactor = new Decimal(lease.moneyFactor);

    // Total lease outflow = (monthlyLease * leaseTerm) + acquisitionFee
    const totalLeaseOutflow = monthlyLease.mul(leaseTerm).plus(acquisitionFee);

    // Total buy outflow = monthlyPayment * remainingMonths
    const totalBuyOutflow = monthlyPayment.mul(remainingMonths);

    // Vehicle value retained at end of loan ownership (depreciated)
    // Approximate: residualValue is a proxy for what the car is worth at end
    const vehicleValueRetained = residualValue;

    // Net costs
    // Lease: you pay totalLeaseOutflow and have no asset at the end
    const netLeaseCost = totalLeaseOutflow;
    // Buy: you pay totalBuyOutflow but retain the vehicle
    const netBuyCost = totalBuyOutflow.minus(vehicleValueRetained);

    // Money factor to APR conversion
    const moneyFactorAsAPR = moneyFactor.mul(2400);

    // Recommendation
    let leaseRecommendation: 'LEASE' | 'BUY' | 'DEPENDS';
    if (netLeaseCost.lt(netBuyCost)) {
      leaseRecommendation = 'LEASE';
    } else if (netBuyCost.lt(netLeaseCost)) {
      leaseRecommendation = 'BUY';
    } else {
      leaseRecommendation = 'DEPENDS';
    }

    // Tax note for business use
    const taxNote =
      'If the vehicle is used for business, lease payments may be fully deductible as a business expense. ' +
      'For purchased vehicles, only depreciation and interest are deductible. Consult your tax advisor.';

    leaseVsBuyAnalysis = {
      totalLeaseOutflow: toNum(totalLeaseOutflow),
      totalBuyOutflow: toNum(totalBuyOutflow),
      vehicleValueRetained: toNum(vehicleValueRetained),
      netLeaseCost: toNum(netLeaseCost),
      netBuyCost: toNum(netBuyCost),
      moneyFactorAsAPR: toNum(moneyFactorAsAPR),
      recommendation: leaseRecommendation,
      taxNote,
    };
  }

  // -----------------------------------------------------------------------
  // Assemble result
  // -----------------------------------------------------------------------
  const result: AutoLoanResult = {
    currentStatus,
    payoffAnalysis,
  };

  if (leaseVsBuyAnalysis) {
    result.leaseVsBuyAnalysis = leaseVsBuyAnalysis;
  }

  return result;
}
