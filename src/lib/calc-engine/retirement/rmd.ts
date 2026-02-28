/**
 * Required Minimum Distribution (RMD) calculation.
 *
 * Implements SECURE 2.0 Act rules for RMD start ages, inherited IRA
 * 10-year rule for non-spouse beneficiaries, spouse rollover / own-life-
 * expectancy option, and joint life table usage when the sole beneficiary
 * spouse is more than 10 years younger.
 *
 * All monetary math uses Decimal.js for precision.
 * Pure function — no side effects, no database calls.
 */

import Decimal from 'decimal.js';
import type { RMDInput, RMDResult } from '../types';

/**
 * Determine the RMD start age under SECURE 2.0:
 *   - Born 1950 or earlier: 72
 *   - Born 1951-1959: 73
 *   - Born 1960 or later: 75
 */
function getRMDStartAge(birthYear: number): number {
  if (birthYear <= 1950) return 72;
  if (birthYear <= 1959) return 73;
  return 75;
}

/**
 * Build the lookup key for the joint life table.
 * Convention: "ownerAge,beneficiaryAge" with the younger listed second.
 */
function jointTableKey(ownerAge: number, beneficiaryAge: number): string {
  return `${ownerAge},${beneficiaryAge}`;
}

/**
 * Calculate the Required Minimum Distribution for a given year.
 *
 * @param input - RMD calculation inputs
 * @returns RMD result including amount, distribution period, and method
 */
export function calculateRMD(input: RMDInput): RMDResult {
  const {
    accountBalance,
    ownerAge,
    accountType,
    isInherited,
    beneficiaryType,
    beneficiaryAge,
    isSpouseBeneficiary,
    rmdTable,
    jointTable,
    yearOfDeath,
    secure2Act,
    birthYear,
  } = input;

  const balance = new Decimal(accountBalance);

  // ------------------------------------------------------------------
  // 1.  Determine RMD start age
  // ------------------------------------------------------------------
  const rmdStartAge = birthYear != null && secure2Act
    ? getRMDStartAge(birthYear)
    : 73; // default SECURE 2.0 baseline

  // ------------------------------------------------------------------
  // 2.  Inherited IRA handling
  // ------------------------------------------------------------------
  if (isInherited) {
    // Spouse beneficiary — may elect own-life-expectancy method
    if (isSpouseBeneficiary && beneficiaryAge != null) {
      // Spouse uses the Uniform Lifetime Table keyed by their own age
      const spousePeriod = rmdTable[beneficiaryAge];
      if (spousePeriod != null && spousePeriod > 0) {
        const rmdAmount = balance.dividedBy(new Decimal(spousePeriod));
        return {
          rmdRequired: true,
          distributionPeriod: spousePeriod,
          rmdAmount: rmdAmount.toDecimalPlaces(2).toNumber(),
          rmdStartAge: ownerAge, // inherited — already required
          method: 'inherited_spouse_own_life_expectancy',
        };
      }
    }

    // Non-spouse (or spouse who doesn't elect own-life) — 10-year rule
    // Under the 10-year rule the entire balance must be distributed by
    // the end of the 10th year following the year of death.  Annual RMDs
    // may still be required in years 1-9 under IRS proposed regulations
    // (for when the original owner had already begun RMDs).  We model
    // the annual RMD as balance / remaining years.
    if (yearOfDeath != null) {
      const currentYear = birthYear != null ? birthYear + ownerAge : yearOfDeath + 1;
      const yearsElapsed = currentYear - yearOfDeath;
      const remainingYears = Math.max(1, 10 - yearsElapsed);
      const rmdAmount = balance.dividedBy(new Decimal(remainingYears));
      return {
        rmdRequired: true,
        distributionPeriod: remainingYears,
        rmdAmount: rmdAmount.toDecimalPlaces(2).toNumber(),
        rmdStartAge: ownerAge,
        method: 'inherited_non_spouse_10_year_rule',
      };
    }

    // Inherited but no year-of-death supplied — fall through to
    // standard table as a safe default.
  }

  // ------------------------------------------------------------------
  // 3.  Not yet at RMD age — no distribution required
  // ------------------------------------------------------------------
  if (ownerAge < rmdStartAge) {
    return {
      rmdRequired: false,
      distributionPeriod: 0,
      rmdAmount: 0,
      rmdStartAge,
      method: 'not_yet_required',
    };
  }

  // ------------------------------------------------------------------
  // 4.  Determine which table to use
  // ------------------------------------------------------------------
  // Use the Joint Life and Last Survivor table when:
  //   (a) spouse is the sole beneficiary, AND
  //   (b) spouse is more than 10 years younger than the owner
  const useJointTable =
    isSpouseBeneficiary === true &&
    beneficiaryAge != null &&
    (ownerAge - beneficiaryAge) > 10 &&
    jointTable != null;

  let distributionPeriod: number;
  let method: string;

  if (useJointTable) {
    const key = jointTableKey(ownerAge, beneficiaryAge!);
    const jointPeriod = jointTable![key];
    if (jointPeriod != null && jointPeriod > 0) {
      distributionPeriod = jointPeriod;
      method = 'joint_life_table';
    } else {
      // Fallback to uniform table if joint lookup misses
      distributionPeriod = rmdTable[ownerAge] ?? 1;
      method = 'uniform_lifetime_table_fallback';
    }
  } else {
    // Standard Uniform Lifetime Table
    distributionPeriod = rmdTable[ownerAge] ?? 1;
    method = 'uniform_lifetime_table';
  }

  // ------------------------------------------------------------------
  // 5.  Calculate the RMD amount
  // ------------------------------------------------------------------
  const period = new Decimal(Math.max(distributionPeriod, 1));
  const rmdAmount = balance.dividedBy(period);

  return {
    rmdRequired: true,
    distributionPeriod,
    rmdAmount: rmdAmount.toDecimalPlaces(2).toNumber(),
    rmdStartAge,
    method,
  };
}
