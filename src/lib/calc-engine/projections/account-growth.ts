import Decimal from 'decimal.js';
import type { AccountData, PlanAssumptions } from '../types';

/**
 * Sum account balances by tax bucket.
 */
export function sumAccountsByBucket(
  accounts: AccountData[],
  bucket: string
): number {
  return accounts
    .filter(a => a.taxBucket === bucket)
    .reduce((sum, a) => new Decimal(sum).plus(a.currentBalance).toNumber(), 0);
}

/**
 * Sum liability balances.
 */
export function sumLiabilities(accounts: AccountData[]): number {
  const liabilityTypes = [
    'mortgage_primary', 'mortgage_investment', 'heloc', 'auto_loan',
    'student_loan_federal', 'student_loan_private', 'credit_card',
    'margin_loan', 'sbloc', 'personal_loan', 'business_loan', 'other_liability'
  ];
  return accounts
    .filter(a => liabilityTypes.includes(a.accountType))
    .reduce((sum, a) => new Decimal(sum).plus(a.currentBalance).toNumber(), 0);
}

/**
 * Sum real estate values.
 */
export function sumRealEstate(accounts: AccountData[]): number {
  const reTypes = ['real_estate_primary', 'real_estate_vacation', 'real_estate_investment'];
  return accounts
    .filter(a => reTypes.includes(a.accountType))
    .reduce((sum, a) => new Decimal(sum).plus(a.currentBalance).toNumber(), 0);
}

/**
 * Calculate blended return for a portfolio bucket based on asset allocation.
 */
export function blendedReturn(
  assumptions: PlanAssumptions,
  bucket: string,
  isRetired: boolean
): number {
  // Use more conservative allocation in retirement
  let equityPct: number;
  let bondPct: number;
  let cashPct: number;
  let altPct: number;

  if (bucket === 'tax_free') {
    // Roth accounts: more aggressive since tax-free growth
    equityPct = isRetired ? 0.60 : 0.80;
    bondPct = isRetired ? 0.30 : 0.15;
    cashPct = isRetired ? 0.05 : 0.00;
    altPct = isRetired ? 0.05 : 0.05;
  } else if (bucket === 'tax_deferred') {
    // Traditional: bond-heavy for tax efficiency
    equityPct = isRetired ? 0.40 : 0.60;
    bondPct = isRetired ? 0.45 : 0.30;
    cashPct = isRetired ? 0.10 : 0.05;
    altPct = isRetired ? 0.05 : 0.05;
  } else {
    // Taxable: balanced
    equityPct = isRetired ? 0.50 : 0.70;
    bondPct = isRetired ? 0.30 : 0.20;
    cashPct = isRetired ? 0.15 : 0.05;
    altPct = isRetired ? 0.05 : 0.05;
  }

  return new Decimal(assumptions.equityReturn).mul(equityPct)
    .plus(new Decimal(assumptions.bondReturn).mul(bondPct))
    .plus(new Decimal(assumptions.cashReturn).mul(cashPct))
    .plus(new Decimal(assumptions.altReturn).mul(altPct))
    .toDP(6)
    .toNumber();
}

/**
 * Derive overall asset allocation from accounts.
 */
export function deriveAssetAllocation(
  accounts: AccountData[],
  assumptions: PlanAssumptions
): { equityPct: number; bondPct: number; cashPct: number; altPct: number } {
  let totalBalance = new Decimal(0);
  let equityTotal = new Decimal(0);
  let bondTotal = new Decimal(0);
  let cashTotal = new Decimal(0);
  let altTotal = new Decimal(0);

  const investableTypes = ['taxable', 'tax_deferred', 'tax_free'];

  for (const account of accounts) {
    if (!investableTypes.includes(account.taxBucket)) continue;
    const balance = new Decimal(account.currentBalance);
    if (balance.lte(0)) continue;

    totalBalance = totalBalance.plus(balance);
    equityTotal = equityTotal.plus(balance.mul(account.equityPct ?? 0.60));
    bondTotal = bondTotal.plus(balance.mul(account.bondPct ?? 0.30));
    cashTotal = cashTotal.plus(balance.mul(account.cashPct ?? 0.05));
    altTotal = altTotal.plus(balance.mul(account.altPct ?? 0.05));
  }

  if (totalBalance.eq(0)) {
    return { equityPct: 0.60, bondPct: 0.30, cashPct: 0.05, altPct: 0.05 };
  }

  return {
    equityPct: equityTotal.div(totalBalance).toDP(4).toNumber(),
    bondPct: bondTotal.div(totalBalance).toDP(4).toNumber(),
    cashPct: cashTotal.div(totalBalance).toDP(4).toNumber(),
    altPct: altTotal.div(totalBalance).toDP(4).toNumber(),
  };
}

/**
 * Calculate annual contributions based on age and net cash flow.
 */
export function calculateContributions(
  assumptions: PlanAssumptions,
  clientAge: number,
  netSurplus: number
): { taxable: number; taxDeferred: number; taxFree: number; total: number } {
  if (netSurplus <= 0) {
    return { taxable: 0, taxDeferred: 0, taxFree: 0, total: 0 };
  }

  // Prioritize tax-advantaged accounts
  const maxTaxDeferred = 24500 + (clientAge >= 50 ? (clientAge >= 60 && clientAge <= 63 ? 11250 : 8000) : 0);
  const maxTaxFree = 7500 + (clientAge >= 50 ? 1100 : 0);

  const taxDeferred = Math.min(netSurplus * 0.5, maxTaxDeferred);
  const remaining1 = Math.max(0, netSurplus - taxDeferred);
  const taxFree = Math.min(remaining1 * 0.3, maxTaxFree);
  const remaining2 = Math.max(0, remaining1 - taxFree);
  const taxable = remaining2;

  return {
    taxable: new Decimal(taxable).toDP(2).toNumber(),
    taxDeferred: new Decimal(taxDeferred).toDP(2).toNumber(),
    taxFree: new Decimal(taxFree).toDP(2).toNumber(),
    total: new Decimal(taxable).plus(taxDeferred).plus(taxFree).toDP(2).toNumber(),
  };
}
