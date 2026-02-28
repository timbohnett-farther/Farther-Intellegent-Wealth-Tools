/**
 * Internal rate of return (IRR) calculation using Newton's method with Decimal.js.
 * All functions are pure — no side effects, no DB calls.
 */

import Decimal from 'decimal.js';

/**
 * Default maximum iterations for Newton's method convergence.
 */
const DEFAULT_MAX_ITERATIONS = 100;

/**
 * Default convergence tolerance (absolute NPV < tolerance).
 */
const DEFAULT_TOLERANCE = '1e-10';

/**
 * Default initial guess for IRR.
 */
const DEFAULT_INITIAL_GUESS = '0.1';

export interface IRROptions {
  /** Initial guess for the rate (default: 0.1 = 10%) */
  initialGuess?: Decimal | number | string;
  /** Maximum iterations before giving up (default: 100) */
  maxIterations?: number;
  /** Convergence tolerance (default: 1e-10) */
  tolerance?: Decimal | number | string;
}

/**
 * Compute NPV for a given rate and cash flow series.
 * NPV = sum of [ CF_t / (1 + r)^t ]  for t = 0 .. n
 */
function computeNPV(
  rate: Decimal,
  cashFlows: ReadonlyArray<Decimal>,
): Decimal {
  return cashFlows.reduce<Decimal>((acc, cf, t) => {
    const discountFactor = rate.plus(1).pow(t);
    return acc.plus(cf.dividedBy(discountFactor));
  }, new Decimal(0));
}

/**
 * Compute the derivative of NPV with respect to the rate.
 * dNPV/dr = sum of [ -t * CF_t / (1 + r)^(t+1) ]  for t = 1 .. n
 */
function computeNPVDerivative(
  rate: Decimal,
  cashFlows: ReadonlyArray<Decimal>,
): Decimal {
  return cashFlows.reduce<Decimal>((acc, cf, t) => {
    if (t === 0) return acc;
    const negT = new Decimal(-t);
    const discountFactor = rate.plus(1).pow(t + 1);
    return acc.plus(negT.times(cf).dividedBy(discountFactor));
  }, new Decimal(0));
}

/**
 * Calculate the internal rate of return (IRR) for a series of cash flows
 * using Newton's method (Newton-Raphson).
 *
 * The IRR is the discount rate that makes the net present value of all
 * cash flows equal to zero.
 *
 * Cash flows are ordered by period. The first element (index 0) is
 * typically a negative number (initial outlay).
 *
 * @param cashFlows - Array of cash flows starting at period 0
 * @param options - Optional configuration for the solver
 * @returns The IRR as a Decimal, or null if the method does not converge
 */
export function irr(
  cashFlows: ReadonlyArray<Decimal | number | string>,
  options?: IRROptions,
): Decimal | null {
  if (cashFlows.length < 2) {
    throw new Error('IRR requires at least two cash flows.');
  }

  const cfs = cashFlows.map((cf) => new Decimal(cf));
  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const tolerance = new Decimal(options?.tolerance ?? DEFAULT_TOLERANCE);
  let rate = new Decimal(options?.initialGuess ?? DEFAULT_INITIAL_GUESS);

  for (let i = 0; i < maxIterations; i++) {
    const npvValue = computeNPV(rate, cfs);

    // Check convergence
    if (npvValue.abs().lte(tolerance)) {
      return rate;
    }

    const derivative = computeNPVDerivative(rate, cfs);

    // Guard against zero derivative (flat region)
    if (derivative.abs().lte(new Decimal('1e-20'))) {
      return null;
    }

    // Newton step: r_new = r_old - f(r) / f'(r)
    const step = npvValue.dividedBy(derivative);
    rate = rate.minus(step);

    // Guard against rate going to -1 or below (singularity)
    if (rate.lte(-1)) {
      rate = new Decimal('-0.99');
    }
  }

  // Did not converge within maxIterations
  return null;
}

/**
 * Calculate the modified internal rate of return (MIRR).
 *
 * MIRR = (FV of positive CFs at reinvestment rate /
 *         PV of negative CFs at finance rate)^(1/n) - 1
 *
 * @param cashFlows - Array of cash flows starting at period 0
 * @param financeRate - Rate at which negative cash flows are financed
 * @param reinvestmentRate - Rate at which positive cash flows are reinvested
 * @returns MIRR as a Decimal
 */
export function mirr(
  cashFlows: ReadonlyArray<Decimal | number | string>,
  financeRate: Decimal | number | string,
  reinvestmentRate: Decimal | number | string,
): Decimal {
  if (cashFlows.length < 2) {
    throw new Error('MIRR requires at least two cash flows.');
  }

  const cfs = cashFlows.map((cf) => new Decimal(cf));
  const n = cfs.length - 1;
  const fRate = new Decimal(financeRate);
  const rRate = new Decimal(reinvestmentRate);

  // Future value of positive cash flows compounded at reinvestment rate
  let fvPositive = new Decimal(0);
  for (let t = 0; t <= n; t++) {
    if (cfs[t].gt(0)) {
      const periods = n - t;
      fvPositive = fvPositive.plus(cfs[t].times(rRate.plus(1).pow(periods)));
    }
  }

  // Present value of negative cash flows discounted at finance rate
  let pvNegative = new Decimal(0);
  for (let t = 0; t <= n; t++) {
    if (cfs[t].lt(0)) {
      pvNegative = pvNegative.plus(cfs[t].abs().dividedBy(fRate.plus(1).pow(t)));
    }
  }

  if (pvNegative.isZero()) {
    throw new Error('MIRR requires at least one negative cash flow.');
  }

  if (fvPositive.isZero()) {
    throw new Error('MIRR requires at least one positive cash flow.');
  }

  // MIRR = (FV+ / PV-)^(1/n) - 1
  return fvPositive
    .dividedBy(pvNegative)
    .pow(new Decimal(1).dividedBy(n))
    .minus(1);
}
