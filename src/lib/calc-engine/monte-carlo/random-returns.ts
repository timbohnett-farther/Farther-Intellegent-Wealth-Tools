/**
 * random-returns.ts
 *
 * Gaussian random number generation and correlated return generation
 * using the Box-Muller transform and Cholesky decomposition.
 */

/**
 * Seed-able pseudo-random number generator using a linear congruential generator (LCG).
 * Parameters chosen from Numerical Recipes (a = 1664525, c = 1013904223, m = 2^32).
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Ensure the seed is a 32-bit integer
    this.state = seed >>> 0;
  }

  /**
   * Returns a pseudo-random number in the range [0, 1).
   */
  next(): number {
    // Linear congruential generator
    this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  /**
   * Returns a Gaussian-distributed random number (mean 0, std dev 1)
   * using the Box-Muller transform.
   */
  gaussian(): number {
    let u1: number;
    let u2: number;

    // Ensure u1 is not zero to avoid log(0)
    do {
      u1 = this.next();
    } while (u1 === 0);

    u2 = this.next();

    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }
}

/**
 * Box-Muller transform for generating a standard Gaussian random number
 * (mean = 0, standard deviation = 1).
 *
 * Uses Math.random() as the underlying uniform source.
 * For reproducible results, use SeededRandom.gaussian() instead.
 */
export function gaussianRandom(): number {
  let u1: number;
  let u2: number;

  // Ensure u1 is not zero to avoid log(0)
  do {
    u1 = Math.random();
  } while (u1 === 0);

  u2 = Math.random();

  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Generates correlated equity and bond returns using Cholesky decomposition
 * of the 2x2 correlation matrix.
 *
 * For a correlation matrix:
 *   | 1    rho |
 *   | rho  1   |
 *
 * The Cholesky lower-triangular matrix L is:
 *   | 1          0                  |
 *   | rho        sqrt(1 - rho^2)   |
 *
 * Given independent standard normals z1, z2:
 *   correlated_1 = z1
 *   correlated_2 = rho * z1 + sqrt(1 - rho^2) * z2
 *
 * Then each return = mean + stdDev * correlated_z
 *
 * @param equityMean   - Expected annual equity return (e.g. 0.07 for 7%)
 * @param equityStdDev - Annual equity return standard deviation (e.g. 0.15)
 * @param bondMean     - Expected annual bond return (e.g. 0.03 for 3%)
 * @param bondStdDev   - Annual bond return standard deviation (e.g. 0.05)
 * @param correlation  - Correlation between equity and bond returns (e.g. 0.2)
 * @returns Object with equityReturn and bondReturn for the simulated year
 */
export function generateCorrelatedReturns(
  equityMean: number,
  equityStdDev: number,
  bondMean: number,
  bondStdDev: number,
  correlation: number
): { equityReturn: number; bondReturn: number } {
  const z1 = gaussianRandom();
  const z2 = gaussianRandom();

  // Cholesky decomposition for 2-asset case
  const correlatedZ1 = z1;
  const correlatedZ2 = correlation * z1 + Math.sqrt(1 - correlation * correlation) * z2;

  const equityReturn = equityMean + equityStdDev * correlatedZ1;
  const bondReturn = bondMean + bondStdDev * correlatedZ2;

  return { equityReturn, bondReturn };
}
