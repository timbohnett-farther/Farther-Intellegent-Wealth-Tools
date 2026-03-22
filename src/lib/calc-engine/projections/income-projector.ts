import Decimal from 'decimal.js';
import type { IncomeSourceData, PlanAssumptions } from '../types';

/**
 * Project income from a set of income sources for a given year.
 * Groups results by income category.
 */
export interface ProjectedIncome {
  salary: number;
  selfEmployment: number;
  pension: number;
  rental: number;
  annuity: number;
  businessDistributions: number;
  trust: number;
  other: number;
  total: number;
}

const EMPLOYMENT_TYPES = ['employment_salary', 'employment_bonus', 'employment_commission'];
const SE_TYPES = ['self_employment', 'business_owner_distribution', 'partnership_k1'];
const PENSION_TYPES = ['pension_defined_benefit', 'pension_defined_contribution'];
const RENTAL_TYPES = ['rental_real_estate', 'rental_other'];
const ANNUITY_TYPES = ['annuity_fixed', 'annuity_variable', 'annuity_indexed'];
const BUSINESS_TYPES = ['business_owner_distribution'];
const TRUST_TYPES = ['trust_distribution', 'estate_distribution'];

function categorize(type: string): keyof Omit<ProjectedIncome, 'total'> {
  if (EMPLOYMENT_TYPES.includes(type)) return 'salary';
  if (SE_TYPES.includes(type)) return 'selfEmployment';
  if (PENSION_TYPES.includes(type)) return 'pension';
  if (RENTAL_TYPES.includes(type)) return 'rental';
  if (ANNUITY_TYPES.includes(type)) return 'annuity';
  if (BUSINESS_TYPES.includes(type)) return 'businessDistributions';
  if (TRUST_TYPES.includes(type)) return 'trust';
  return 'other';
}

export function projectIncome(
  sources: IncomeSourceData[],
  year: number,
  baseYear: number,
  assumptions: PlanAssumptions
): ProjectedIncome {
  const result: ProjectedIncome = {
    salary: 0,
    selfEmployment: 0,
    pension: 0,
    rental: 0,
    annuity: 0,
    businessDistributions: 0,
    trust: 0,
    other: 0,
    total: 0,
  };

  for (const source of sources) {
    // Check if this income source is active in this year
    if (source.startYear && year < source.startYear) continue;
    if (source.endYear && year > source.endYear) continue;

    const yearsFromBase = year - baseYear;
    const growthRate = source.growthRate ?? (source.inflationAdjusted !== false ? assumptions.inflationRate : 0);
    const amount = new Decimal(source.annualAmount)
      .mul(new Decimal(1).plus(growthRate).pow(yearsFromBase))
      .toDP(2)
      .toNumber();

    const category = categorize(source.type);
    result[category] += amount;
  }

  result.total = result.salary + result.selfEmployment + result.pension +
    result.rental + result.annuity + result.businessDistributions +
    result.trust + result.other;

  return result;
}

/**
 * Project a specific category of income sources for a year.
 */
export function projectIncomeByCategory(
  sources: IncomeSourceData[],
  year: number,
  baseYear: number,
  category: string,
  assumptions: PlanAssumptions
): number {
  let total = new Decimal(0);
  for (const source of sources) {
    if (source.startYear && year < source.startYear) continue;
    if (source.endYear && year > source.endYear) continue;

    const isMatch = source.type.startsWith(category) ||
      (category === 'employment' && EMPLOYMENT_TYPES.includes(source.type)) ||
      (category === 'self_employment' && SE_TYPES.includes(source.type)) ||
      (category === 'pension' && PENSION_TYPES.includes(source.type)) ||
      (category === 'rental' && RENTAL_TYPES.includes(source.type)) ||
      (category === 'annuity' && ANNUITY_TYPES.includes(source.type)) ||
      (category === 'business' && BUSINESS_TYPES.includes(source.type));

    if (!isMatch) continue;

    const yearsFromBase = year - baseYear;
    const growthRate = source.growthRate ?? (source.inflationAdjusted !== false ? assumptions.inflationRate : 0);
    total = total.plus(
      new Decimal(source.annualAmount)
        .mul(new Decimal(1).plus(growthRate).pow(yearsFromBase))
    );
  }
  return total.toDP(2).toNumber();
}
