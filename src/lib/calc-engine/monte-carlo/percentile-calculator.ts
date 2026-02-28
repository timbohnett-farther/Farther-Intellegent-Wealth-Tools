/**
 * percentile-calculator.ts
 *
 * Utilities for calculating percentiles from sorted arrays of numeric values.
 * Uses linear interpolation between closest ranks for sub-integer indices.
 */

/**
 * Calculate a single percentile from a pre-sorted array of numbers.
 *
 * Uses the linear interpolation method (C = 1 variant):
 *   rank = (p / 100) * (n - 1)
 *   lower = floor(rank)
 *   upper = ceil(rank)
 *   result = sorted[lower] + (rank - lower) * (sorted[upper] - sorted[lower])
 *
 * @param sorted - Array of numbers sorted in ascending order. Must not be empty.
 * @param p      - Percentile to compute, in the range [0, 100].
 * @returns The interpolated value at the given percentile.
 * @throws Error if the array is empty or p is out of range.
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    throw new Error('Cannot compute percentile of an empty array');
  }

  if (p < 0 || p > 100) {
    throw new Error(`Percentile must be between 0 and 100, got ${p}`);
  }

  if (sorted.length === 1) {
    return sorted[0];
  }

  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);

  if (lower === upper) {
    return sorted[lower];
  }

  const fraction = rank - lower;
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}

/**
 * Calculate multiple percentiles at once from a pre-sorted array.
 *
 * @param sorted - Array of numbers sorted in ascending order. Must not be empty.
 * @param ps     - Array of percentile values to compute, each in range [0, 100].
 * @returns A record mapping each requested percentile to its computed value.
 */
export function percentiles(sorted: number[], ps: number[]): Record<number, number> {
  const result: Record<number, number> = {};

  for (const p of ps) {
    result[p] = percentile(sorted, p);
  }

  return result;
}
