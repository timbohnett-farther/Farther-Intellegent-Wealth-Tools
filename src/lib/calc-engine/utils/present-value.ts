/**
 * Present value calculation utilities using Decimal.js for precision.
 * All functions are pure — no side effects, no DB calls.
 */

import Decimal from 'decimal.js';

/**
 * Calculate the present value of a single future cash flow.
 *
 * PV = FV / (1 + r)^n
 *
 * @param futureValue - The future cash flow amount
 * @param discountRate - The periodic discount rate (e.g. 0.05 for 5%)
 * @param periods - Number of compounding periods
 * @returns Present value as a Decimal
 */
export function presentValue(
  futureValue: Decimal | number | string,
  discountRate: Decimal | number | string,
  periods: number,
): Decimal {
  const fv = new Decimal(futureValue);
  const r = new Decimal(discountRate);
  const n = new Decimal(periods);

  if (r.eq(-1) && periods > 0) {
    throw new Error('Discount rate of -100% with positive periods results in division by zero.');
  }

  // PV = FV / (1 + r)^n
  const denominator = r.plus(1).pow(n);
  return fv.dividedBy(denominator);
}

/**
 * Calculate the present value of an ordinary annuity (payments at end of each period).
 *
 * PV = PMT * [(1 - (1 + r)^-n) / r]
 *
 * @param payment - The periodic payment amount
 * @param discountRate - The periodic discount rate
 * @param periods - Number of periods
 * @returns Present value of the annuity as a Decimal
 */
export function presentValueAnnuity(
  payment: Decimal | number | string,
  discountRate: Decimal | number | string,
  periods: number,
): Decimal {
  const pmt = new Decimal(payment);
  const r = new Decimal(discountRate);
  const n = new Decimal(periods);

  if (r.isZero()) {
    // When rate is 0, PV = PMT * n
    return pmt.times(n);
  }

  // PV = PMT * [(1 - (1 + r)^-n) / r]
  const onePlusR = r.plus(1);
  const factor = new Decimal(1).minus(onePlusR.pow(n.neg())).dividedBy(r);
  return pmt.times(factor);
}

/**
 * Calculate the present value of an annuity due (payments at beginning of each period).
 *
 * PV_due = PV_ordinary * (1 + r)
 *
 * @param payment - The periodic payment amount
 * @param discountRate - The periodic discount rate
 * @param periods - Number of periods
 * @returns Present value of the annuity due as a Decimal
 */
export function presentValueAnnuityDue(
  payment: Decimal | number | string,
  discountRate: Decimal | number | string,
  periods: number,
): Decimal {
  const r = new Decimal(discountRate);
  const pvOrdinary = presentValueAnnuity(payment, discountRate, periods);
  return pvOrdinary.times(r.plus(1));
}

/**
 * Calculate the present value of a growing annuity.
 *
 * PV = PMT / (r - g) * [1 - ((1 + g) / (1 + r))^n]
 *
 * @param firstPayment - The first payment amount
 * @param discountRate - The periodic discount rate
 * @param growthRate - The growth rate of payments each period
 * @param periods - Number of periods
 * @returns Present value of the growing annuity as a Decimal
 */
export function presentValueGrowingAnnuity(
  firstPayment: Decimal | number | string,
  discountRate: Decimal | number | string,
  growthRate: Decimal | number | string,
  periods: number,
): Decimal {
  const pmt = new Decimal(firstPayment);
  const r = new Decimal(discountRate);
  const g = new Decimal(growthRate);
  const n = new Decimal(periods);

  if (r.eq(g)) {
    // Special case: PV = PMT * n / (1 + r)
    return pmt.times(n).dividedBy(r.plus(1));
  }

  const ratio = g.plus(1).dividedBy(r.plus(1));
  const factor = new Decimal(1).minus(ratio.pow(n)).dividedBy(r.minus(g));
  return pmt.times(factor);
}

/**
 * Calculate the present value of a perpetuity.
 *
 * PV = PMT / r
 *
 * @param payment - The constant periodic payment
 * @param discountRate - The discount rate (must be > 0)
 * @returns Present value of the perpetuity as a Decimal
 */
export function presentValuePerpetuity(
  payment: Decimal | number | string,
  discountRate: Decimal | number | string,
): Decimal {
  const pmt = new Decimal(payment);
  const r = new Decimal(discountRate);

  if (r.lte(0)) {
    throw new Error('Discount rate must be positive for a perpetuity.');
  }

  return pmt.dividedBy(r);
}

/**
 * Calculate the present value of a growing perpetuity.
 *
 * PV = PMT / (r - g)    where r > g
 *
 * @param firstPayment - The first payment amount
 * @param discountRate - The discount rate
 * @param growthRate - The growth rate (must be less than discount rate)
 * @returns Present value as a Decimal
 */
export function presentValueGrowingPerpetuity(
  firstPayment: Decimal | number | string,
  discountRate: Decimal | number | string,
  growthRate: Decimal | number | string,
): Decimal {
  const pmt = new Decimal(firstPayment);
  const r = new Decimal(discountRate);
  const g = new Decimal(growthRate);

  if (r.lte(g)) {
    throw new Error('Discount rate must exceed growth rate for a growing perpetuity.');
  }

  return pmt.dividedBy(r.minus(g));
}
