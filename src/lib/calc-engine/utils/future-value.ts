/**
 * Future value calculation utilities using Decimal.js for precision.
 * All functions are pure — no side effects, no DB calls.
 */

import Decimal from 'decimal.js';

/**
 * Calculate the future value of a single present cash flow.
 *
 * FV = PV * (1 + r)^n
 *
 * @param presentValueAmount - The present value / initial investment
 * @param rate - The periodic growth or interest rate (e.g. 0.07 for 7%)
 * @param periods - Number of compounding periods
 * @returns Future value as a Decimal
 */
export function futureValue(
  presentValueAmount: Decimal | number | string,
  rate: Decimal | number | string,
  periods: number,
): Decimal {
  const pv = new Decimal(presentValueAmount);
  const r = new Decimal(rate);
  const n = new Decimal(periods);

  return pv.times(r.plus(1).pow(n));
}

/**
 * Calculate the future value of an ordinary annuity (payments at end of each period).
 *
 * FV = PMT * [((1 + r)^n - 1) / r]
 *
 * @param payment - The periodic payment amount
 * @param rate - The periodic interest rate
 * @param periods - Number of periods
 * @returns Future value of the annuity as a Decimal
 */
export function futureValueAnnuity(
  payment: Decimal | number | string,
  rate: Decimal | number | string,
  periods: number,
): Decimal {
  const pmt = new Decimal(payment);
  const r = new Decimal(rate);
  const n = new Decimal(periods);

  if (r.isZero()) {
    return pmt.times(n);
  }

  // FV = PMT * [((1 + r)^n - 1) / r]
  const factor = r.plus(1).pow(n).minus(1).dividedBy(r);
  return pmt.times(factor);
}

/**
 * Calculate the future value of an annuity due (payments at beginning of each period).
 *
 * FV_due = FV_ordinary * (1 + r)
 *
 * @param payment - The periodic payment amount
 * @param rate - The periodic interest rate
 * @param periods - Number of periods
 * @returns Future value of the annuity due as a Decimal
 */
export function futureValueAnnuityDue(
  payment: Decimal | number | string,
  rate: Decimal | number | string,
  periods: number,
): Decimal {
  const r = new Decimal(rate);
  const fvOrdinary = futureValueAnnuity(payment, rate, periods);
  return fvOrdinary.times(r.plus(1));
}

/**
 * Calculate the future value of a lump sum plus regular periodic contributions.
 *
 * FV = PV * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
 *
 * @param initialAmount - The starting lump sum
 * @param periodicContribution - The amount contributed each period
 * @param rate - The periodic growth rate
 * @param periods - Number of periods
 * @returns Combined future value as a Decimal
 */
export function futureValueWithContributions(
  initialAmount: Decimal | number | string,
  periodicContribution: Decimal | number | string,
  rate: Decimal | number | string,
  periods: number,
): Decimal {
  const fvLumpSum = futureValue(initialAmount, rate, periods);
  const fvContributions = futureValueAnnuity(periodicContribution, rate, periods);
  return fvLumpSum.plus(fvContributions);
}

/**
 * Calculate the future value of a growing annuity.
 *
 * FV = PMT * [((1 + r)^n - (1 + g)^n) / (r - g)]
 *
 * @param firstPayment - The first payment amount
 * @param rate - The periodic interest rate
 * @param growthRate - The growth rate of payments each period
 * @param periods - Number of periods
 * @returns Future value of the growing annuity as a Decimal
 */
export function futureValueGrowingAnnuity(
  firstPayment: Decimal | number | string,
  rate: Decimal | number | string,
  growthRate: Decimal | number | string,
  periods: number,
): Decimal {
  const pmt = new Decimal(firstPayment);
  const r = new Decimal(rate);
  const g = new Decimal(growthRate);
  const n = new Decimal(periods);

  if (r.eq(g)) {
    // Special case: FV = PMT * n * (1 + r)^(n-1)
    return pmt.times(n).times(r.plus(1).pow(n.minus(1)));
  }

  const factor = r.plus(1).pow(n).minus(g.plus(1).pow(n)).dividedBy(r.minus(g));
  return pmt.times(factor);
}

/**
 * Calculate the real (inflation-adjusted) future value.
 *
 * FV_real = FV_nominal / (1 + inflation)^n
 *
 * @param nominalFV - The nominal future value
 * @param inflationRate - The annual inflation rate
 * @param periods - Number of periods
 * @returns Inflation-adjusted future value as a Decimal
 */
export function realFutureValue(
  nominalFV: Decimal | number | string,
  inflationRate: Decimal | number | string,
  periods: number,
): Decimal {
  const fv = new Decimal(nominalFV);
  const inf = new Decimal(inflationRate);
  const n = new Decimal(periods);

  return fv.dividedBy(inf.plus(1).pow(n));
}

/**
 * Rule of 72: estimate the number of years to double an investment.
 *
 * @param annualRate - The annual rate of return (e.g. 0.07 for 7%)
 * @returns Approximate years to double
 */
export function yearsToDouble(annualRate: Decimal | number | string): Decimal {
  const r = new Decimal(annualRate);

  if (r.lte(0)) {
    throw new Error('Rate must be positive to calculate years to double.');
  }

  // Rule of 72 using the percentage form
  return new Decimal(72).dividedBy(r.times(100));
}
