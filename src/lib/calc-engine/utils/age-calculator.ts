/**
 * Age calculation utilities.
 * All functions are pure — no side effects, no DB calls.
 */

/**
 * Calculate age as of a given reference date from a birth year.
 * Assumes the person has already had their birthday in the reference year
 * unless a full birth date is supplied for more precise calculation.
 */
export function ageFromBirthYear(birthYear: number, referenceYear: number): number {
  return referenceYear - birthYear;
}

/**
 * Calculate exact age as of a reference date from a full birth date.
 * Returns whole years completed.
 */
export function ageFromBirthDate(birthDate: Date, referenceDate: Date = new Date()): number {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Determine whether the person is age 65 or older in a given year.
 */
export function isOver65(birthYear: number, referenceYear: number): boolean {
  return ageFromBirthYear(birthYear, referenceYear) >= 65;
}

/**
 * Determine whether the person is age 50 or older in a given year (catch-up eligible).
 */
export function isOver50(birthYear: number, referenceYear: number): boolean {
  return ageFromBirthYear(birthYear, referenceYear) >= 50;
}

/**
 * Determine whether the person is age 55 or older in a given year (HSA catch-up eligible).
 */
export function isOver55(birthYear: number, referenceYear: number): boolean {
  return ageFromBirthYear(birthYear, referenceYear) >= 55;
}

/**
 * Determine whether the person is between 60 and 63 inclusive (super catch-up eligible).
 */
export function isSuperCatchUpEligible(birthYear: number, referenceYear: number): boolean {
  const age = ageFromBirthYear(birthYear, referenceYear);
  return age >= 60 && age <= 63;
}

/**
 * Determine whether the person has reached RMD start age.
 * Under SECURE 2.0 Act, RMD start age is:
 *   - Born 1951-1959: age 73
 *   - Born 1960 or later: age 75
 */
export function rmdStartAge(birthYear: number): number {
  if (birthYear <= 1950) {
    return 72;
  }
  if (birthYear <= 1959) {
    return 73;
  }
  return 75;
}

/**
 * Check whether an individual must take RMDs in a given year.
 */
export function mustTakeRMD(birthYear: number, referenceYear: number): boolean {
  const age = ageFromBirthYear(birthYear, referenceYear);
  return age >= rmdStartAge(birthYear);
}

/**
 * Full Retirement Age (FRA) for Social Security based on birth year.
 * Returns fractional years (e.g., 66.1667 for 66 and 2 months).
 */
export function fullRetirementAge(birthYear: number): number {
  if (birthYear <= 1937) return 65;
  if (birthYear === 1938) return 65 + 2 / 12;
  if (birthYear === 1939) return 65 + 4 / 12;
  if (birthYear === 1940) return 65 + 6 / 12;
  if (birthYear === 1941) return 65 + 8 / 12;
  if (birthYear === 1942) return 65 + 10 / 12;
  if (birthYear >= 1943 && birthYear <= 1954) return 66;
  if (birthYear === 1955) return 66 + 2 / 12;
  if (birthYear === 1956) return 66 + 4 / 12;
  if (birthYear === 1957) return 66 + 6 / 12;
  if (birthYear === 1958) return 66 + 8 / 12;
  if (birthYear === 1959) return 66 + 10 / 12;
  return 67; // 1960 and later
}

/**
 * Calculate the year the person turns a specific age.
 */
export function yearAtAge(birthYear: number, targetAge: number): number {
  return birthYear + targetAge;
}

/**
 * Calculate years until a target age from the current reference year.
 * Returns 0 if already at or past the target age.
 */
export function yearsUntilAge(
  birthYear: number,
  targetAge: number,
  referenceYear: number,
): number {
  const currentAge = ageFromBirthYear(birthYear, referenceYear);
  return Math.max(0, targetAge - currentAge);
}

/**
 * Determine Medicare eligibility (age 65+).
 */
export function isMedicareEligible(birthYear: number, referenceYear: number): boolean {
  return isOver65(birthYear, referenceYear);
}

/**
 * Determine Social Security early claim eligibility (age 62+).
 */
export function canClaimSS(birthYear: number, referenceYear: number): boolean {
  return ageFromBirthYear(birthYear, referenceYear) >= 62;
}
