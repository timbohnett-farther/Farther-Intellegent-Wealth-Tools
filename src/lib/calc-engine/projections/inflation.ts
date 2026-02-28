import Decimal from 'decimal.js';

/**
 * Adjust a value for inflation over a number of years.
 */
export function adjustForInflation(
  amount: number,
  inflationRate: number,
  years: number
): number {
  return new Decimal(amount)
    .mul(new Decimal(1).plus(inflationRate).pow(years))
    .toDP(2)
    .toNumber();
}

/**
 * Convert a future nominal value to today's real dollars.
 */
export function toRealDollars(
  futureAmount: number,
  inflationRate: number,
  years: number
): number {
  return new Decimal(futureAmount)
    .div(new Decimal(1).plus(inflationRate).pow(years))
    .toDP(2)
    .toNumber();
}

/**
 * Get inflation-adjusted tax brackets for a future year.
 * Brackets are adjusted upward by inflation from a base year.
 */
export function inflationAdjustBrackets<T extends { minIncome: number; maxIncome: number | null }>(
  brackets: T[],
  inflationRate: number,
  yearsFromBase: number
): T[] {
  const factor = new Decimal(1).plus(inflationRate).pow(yearsFromBase);
  return brackets.map(b => ({
    ...b,
    minIncome: new Decimal(b.minIncome).mul(factor).round().toNumber(),
    maxIncome: b.maxIncome !== null
      ? new Decimal(b.maxIncome).mul(factor).round().toNumber()
      : null,
  }));
}
