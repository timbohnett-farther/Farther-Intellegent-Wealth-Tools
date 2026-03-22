import Decimal from 'decimal.js';
import type { ExpenseData, PlanAssumptions } from '../types';

/**
 * Project total expenses for a given year, with retirement spending adjustment.
 */
export function projectExpenses(
  expenses: ExpenseData[],
  year: number,
  baseYear: number,
  isRetired: boolean,
  assumptions: PlanAssumptions
): number {
  let total = new Decimal(0);

  for (const expense of expenses) {
    if (expense.startYear && year < expense.startYear) continue;
    if (expense.endYear && year > expense.endYear) continue;

    const yearsFromBase = year - baseYear;
    const growthRate = expense.growthRate ?? (expense.inflationAdjusted !== false ? assumptions.inflationRate : 0);
    let amount = new Decimal(expense.annualAmount)
      .mul(new Decimal(1).plus(growthRate).pow(yearsFromBase));

    // Apply retirement spending adjustment
    if (isRetired && expense.retirementPct !== undefined && expense.retirementPct !== null) {
      amount = amount.mul(expense.retirementPct);
    } else if (isRetired) {
      // Default: apply retirement spending percentage from assumptions
      amount = amount.mul(assumptions.retirementSpendingPct);
    }

    total = total.plus(amount);
  }

  return total.toDP(2).toNumber();
}

/**
 * Get pre-Medicare healthcare cost estimate.
 * Based on average annual premiums with healthcare-specific inflation.
 */
export function getPreMedicareHealthcareCost(
  clientAge: number,
  year: number,
  baseYear: number,
  healthcareInflation: number
): number {
  // Base annual cost by age group (2026 baseline estimates)
  let baseCost: number;
  if (clientAge < 30) baseCost = 4800;
  else if (clientAge < 40) baseCost = 5400;
  else if (clientAge < 50) baseCost = 7200;
  else if (clientAge < 55) baseCost = 9600;
  else if (clientAge < 60) baseCost = 12000;
  else baseCost = 15600; // 60-64

  const yearsFromBase = year - baseYear;
  return new Decimal(baseCost)
    .mul(new Decimal(1).plus(healthcareInflation).pow(yearsFromBase))
    .toDP(2)
    .toNumber();
}

/**
 * Project debt payments for a given year.
 * Returns total annual debt service.
 */
export function projectDebtPayments(
  accounts: Array<{
    accountType: string;
    monthlyPayment?: number;
    remainingTerm?: number;
    currentBalance: number;
  }>,
  year: number,
  baseYear: number
): number {
  const liabilityTypes = [
    'mortgage_primary', 'mortgage_investment', 'heloc', 'auto_loan',
    'student_loan_federal', 'student_loan_private', 'credit_card',
    'margin_loan', 'sbloc', 'personal_loan', 'business_loan', 'other_liability'
  ];

  let total = new Decimal(0);

  for (const account of accounts) {
    if (!liabilityTypes.includes(account.accountType)) continue;

    const yearsSinceBase = year - baseYear;
    const remainingTerm = account.remainingTerm ?? 30;

    // If debt is paid off by this year, skip
    if (yearsSinceBase >= remainingTerm) continue;

    const monthlyPayment = account.monthlyPayment ?? 0;
    total = total.plus(new Decimal(monthlyPayment).mul(12));
  }

  return total.toDP(2).toNumber();
}

/**
 * Calculate remaining liability balance through simple amortization.
 */
export function amortizeLiabilities(
  accounts: Array<{
    accountType: string;
    currentBalance: number;
    interestRate?: number;
    monthlyPayment?: number;
    remainingTerm?: number;
  }>,
  year: number,
  baseYear: number
): number {
  const liabilityTypes = [
    'mortgage_primary', 'mortgage_investment', 'heloc', 'auto_loan',
    'student_loan_federal', 'student_loan_private', 'credit_card',
    'margin_loan', 'sbloc', 'personal_loan', 'business_loan', 'other_liability'
  ];

  let totalLiabilities = new Decimal(0);

  for (const account of accounts) {
    if (!liabilityTypes.includes(account.accountType)) continue;

    const yearsSinceBase = year - baseYear;
    const rate = account.interestRate ?? 0.05;
    const monthlyRate = new Decimal(rate).div(12);
    const monthlyPayment = new Decimal(account.monthlyPayment ?? 0);
    let balance = new Decimal(account.currentBalance);

    // Simulate month-by-month for accuracy
    const totalMonths = yearsSinceBase * 12;
    for (let m = 0; m < totalMonths && balance.gt(0); m++) {
      const interest = balance.mul(monthlyRate);
      const principal = monthlyPayment.minus(interest);
      balance = Decimal.max(0, balance.minus(principal));
    }

    totalLiabilities = totalLiabilities.plus(balance);
  }

  return totalLiabilities.toDP(2).toNumber();
}
