/**
 * Net present value calculation utilities using Decimal.js for precision.
 * All functions are pure — no side effects, no DB calls.
 */

import Decimal from 'decimal.js';

/**
 * Calculate the net present value of a series of cash flows.
 *
 * NPV = sum of [ CF_t / (1 + r)^t ]  for t = 0, 1, 2, ...
 *
 * The first element (index 0) is treated as the cash flow at time 0
 * (typically the initial investment, expressed as a negative number).
 *
 * @param discountRate - The periodic discount rate (e.g. 0.08 for 8%)
 * @param cashFlows - Array of cash flows starting at period 0
 * @returns Net present value as a Decimal
 */
export function npv(
  discountRate: Decimal | number | string,
  cashFlows: ReadonlyArray<Decimal | number | string>,
): Decimal {
  const r = new Decimal(discountRate);

  return cashFlows.reduce<Decimal>((acc, cf, t) => {
    const cfDecimal = new Decimal(cf);
    const discountFactor = r.plus(1).pow(t);
    return acc.plus(cfDecimal.dividedBy(discountFactor));
  }, new Decimal(0));
}

/**
 * Calculate NPV where the first cash flow (initial investment) is separate.
 * Cash flows array begins at period 1.
 *
 * NPV = initialInvestment + sum of [ CF_t / (1 + r)^t ]  for t = 1, 2, ...
 *
 * @param discountRate - The periodic discount rate
 * @param initialInvestment - Cash flow at time 0 (usually negative)
 * @param cashFlows - Array of future cash flows starting at period 1
 * @returns Net present value as a Decimal
 */
export function npvWithInitial(
  discountRate: Decimal | number | string,
  initialInvestment: Decimal | number | string,
  cashFlows: ReadonlyArray<Decimal | number | string>,
): Decimal {
  const r = new Decimal(discountRate);
  const initial = new Decimal(initialInvestment);

  const pvFutureCFs = cashFlows.reduce<Decimal>((acc, cf, i) => {
    const t = i + 1;
    const cfDecimal = new Decimal(cf);
    const discountFactor = r.plus(1).pow(t);
    return acc.plus(cfDecimal.dividedBy(discountFactor));
  }, new Decimal(0));

  return initial.plus(pvFutureCFs);
}

/**
 * Calculate the profitability index (PI) of an investment.
 *
 * PI = PV of future cash flows / |Initial investment|
 *
 * A PI > 1 indicates a value-creating investment.
 *
 * @param discountRate - The periodic discount rate
 * @param initialInvestment - Cash outflow at time 0 (positive number = cost)
 * @param cashFlows - Array of future cash flows starting at period 1
 * @returns Profitability index as a Decimal
 */
export function profitabilityIndex(
  discountRate: Decimal | number | string,
  initialInvestment: Decimal | number | string,
  cashFlows: ReadonlyArray<Decimal | number | string>,
): Decimal {
  const r = new Decimal(discountRate);
  const cost = new Decimal(initialInvestment).abs();

  if (cost.isZero()) {
    throw new Error('Initial investment cannot be zero for profitability index calculation.');
  }

  const pvFutureCFs = cashFlows.reduce<Decimal>((acc, cf, i) => {
    const t = i + 1;
    const cfDecimal = new Decimal(cf);
    const discountFactor = r.plus(1).pow(t);
    return acc.plus(cfDecimal.dividedBy(discountFactor));
  }, new Decimal(0));

  return pvFutureCFs.dividedBy(cost);
}
