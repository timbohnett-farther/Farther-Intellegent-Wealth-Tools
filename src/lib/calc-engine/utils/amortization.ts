/**
 * Loan amortization schedule utilities using Decimal.js for precision.
 * All functions are pure — no side effects, no DB calls.
 */

import Decimal from 'decimal.js';

/**
 * A single row in an amortization schedule.
 */
export interface AmortizationRow {
  /** Period number (1-based) */
  period: number;
  /** Payment amount for this period */
  payment: Decimal;
  /** Portion of payment applied to principal */
  principal: Decimal;
  /** Portion of payment applied to interest */
  interest: Decimal;
  /** Remaining loan balance after this payment */
  balance: Decimal;
  /** Cumulative interest paid through this period */
  cumulativeInterest: Decimal;
  /** Cumulative principal paid through this period */
  cumulativePrincipal: Decimal;
}

/**
 * Summary statistics for an amortization schedule.
 */
export interface AmortizationSummary {
  /** Original loan amount */
  loanAmount: Decimal;
  /** Monthly payment */
  monthlyPayment: Decimal;
  /** Total amount paid over the life of the loan */
  totalPaid: Decimal;
  /** Total interest paid over the life of the loan */
  totalInterest: Decimal;
  /** Number of payments */
  totalPayments: number;
  /** Annual interest rate */
  annualRate: Decimal;
}

/**
 * Full result of an amortization calculation.
 */
export interface AmortizationResult {
  summary: AmortizationSummary;
  schedule: AmortizationRow[];
}

/**
 * Calculate the fixed monthly payment for a standard amortizing loan.
 *
 * PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
 *
 * @param principal - The loan principal (amount borrowed)
 * @param annualRate - The annual interest rate (e.g. 0.065 for 6.5%)
 * @param termMonths - The loan term in months (e.g. 360 for 30 years)
 * @returns Monthly payment as a Decimal
 */
export function calculateMonthlyPayment(
  principal: Decimal | number | string,
  annualRate: Decimal | number | string,
  termMonths: number,
): Decimal {
  const P = new Decimal(principal);
  const annRate = new Decimal(annualRate);

  if (P.isZero()) return new Decimal(0);
  if (termMonths <= 0) throw new Error('Term must be a positive number of months.');

  // Monthly rate
  const r = annRate.dividedBy(12);

  if (r.isZero()) {
    // Zero-interest loan: straight division
    return P.dividedBy(termMonths);
  }

  const onePlusR = r.plus(1);
  const onePlusRn = onePlusR.pow(termMonths);
  // PMT = P * [r * (1+r)^n] / [(1+r)^n - 1]
  const numerator = P.times(r.times(onePlusRn));
  const denominator = onePlusRn.minus(1);

  return numerator.dividedBy(denominator);
}

/**
 * Generate a full amortization schedule for a fixed-rate loan.
 *
 * @param principal - The loan principal
 * @param annualRate - The annual interest rate
 * @param termMonths - The loan term in months
 * @returns Full amortization result with summary and schedule
 */
export function amortizationSchedule(
  principal: Decimal | number | string,
  annualRate: Decimal | number | string,
  termMonths: number,
): AmortizationResult {
  const P = new Decimal(principal);
  const annRate = new Decimal(annualRate);
  const monthlyRate = annRate.dividedBy(12);
  const payment = calculateMonthlyPayment(P, annRate, termMonths);

  const schedule: AmortizationRow[] = [];
  let balance = P;
  let cumulativeInterest = new Decimal(0);
  let cumulativePrincipal = new Decimal(0);

  for (let period = 1; period <= termMonths; period++) {
    const interestPortion = balance.times(monthlyRate);
    let principalPortion = payment.minus(interestPortion);

    // Handle final period rounding: pay off remaining balance exactly
    if (period === termMonths || principalPortion.gte(balance)) {
      principalPortion = balance;
    }

    balance = balance.minus(principalPortion);
    cumulativeInterest = cumulativeInterest.plus(interestPortion);
    cumulativePrincipal = cumulativePrincipal.plus(principalPortion);

    // For the final period, the actual payment is principal + interest
    const actualPayment = period === termMonths
      ? principalPortion.plus(interestPortion)
      : payment;

    schedule.push({
      period,
      payment: actualPayment,
      principal: principalPortion,
      interest: interestPortion,
      balance: Decimal.max(balance, 0),
      cumulativeInterest,
      cumulativePrincipal,
    });
  }

  const totalPaid = schedule.reduce(
    (acc, row) => acc.plus(row.payment),
    new Decimal(0),
  );

  return {
    summary: {
      loanAmount: P,
      monthlyPayment: payment,
      totalPaid,
      totalInterest: cumulativeInterest,
      totalPayments: termMonths,
      annualRate: annRate,
    },
    schedule,
  };
}

/**
 * Calculate the remaining balance on an amortizing loan after a given number of payments.
 *
 * Balance_k = P * [(1+r)^n - (1+r)^k] / [(1+r)^n - 1]
 *
 * @param principal - The original loan principal
 * @param annualRate - The annual interest rate
 * @param termMonths - The total loan term in months
 * @param paymentsMade - The number of payments already made
 * @returns Remaining balance as a Decimal
 */
export function remainingBalance(
  principal: Decimal | number | string,
  annualRate: Decimal | number | string,
  termMonths: number,
  paymentsMade: number,
): Decimal {
  const P = new Decimal(principal);
  const annRate = new Decimal(annualRate);
  const r = annRate.dividedBy(12);

  if (paymentsMade >= termMonths) return new Decimal(0);
  if (r.isZero()) {
    // Zero interest: straight-line payoff
    const paymentPerPeriod = P.dividedBy(termMonths);
    return P.minus(paymentPerPeriod.times(paymentsMade));
  }

  const onePlusR = r.plus(1);
  const onePlusRn = onePlusR.pow(termMonths);
  const onePlusRk = onePlusR.pow(paymentsMade);

  // B_k = P * [(1+r)^n - (1+r)^k] / [(1+r)^n - 1]
  return P.times(onePlusRn.minus(onePlusRk)).dividedBy(onePlusRn.minus(1));
}

/**
 * Calculate the total interest paid over a range of periods.
 *
 * @param principal - The original loan principal
 * @param annualRate - The annual interest rate
 * @param termMonths - The total loan term in months
 * @param startPeriod - First period in range (1-based, inclusive)
 * @param endPeriod - Last period in range (inclusive)
 * @returns Total interest paid in the range as a Decimal
 */
export function interestInRange(
  principal: Decimal | number | string,
  annualRate: Decimal | number | string,
  termMonths: number,
  startPeriod: number,
  endPeriod: number,
): Decimal {
  const P = new Decimal(principal);
  const annRate = new Decimal(annualRate);
  const r = annRate.dividedBy(12);
  const payment = calculateMonthlyPayment(P, annRate, termMonths);

  const clampedStart = Math.max(1, startPeriod);
  const clampedEnd = Math.min(termMonths, endPeriod);

  if (clampedStart > clampedEnd) return new Decimal(0);

  let totalInterest = new Decimal(0);
  let balance = clampedStart > 1
    ? remainingBalance(P, annRate, termMonths, clampedStart - 1)
    : P;

  for (let period = clampedStart; period <= clampedEnd; period++) {
    const interestPortion = balance.times(r);
    const principalPortion = payment.minus(interestPortion);
    totalInterest = totalInterest.plus(interestPortion);
    balance = balance.minus(principalPortion);
  }

  return totalInterest;
}
