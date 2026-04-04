/**
 * Household Account Aggregation — Multi-Member Portfolio Management
 *
 * Manages household-level portfolio views with multiple members (primary,
 * spouse, dependents, trusts) and accounts (taxable, retirement, education).
 * Aggregates holdings, allocations, and tax lots across the entire household
 * for comprehensive planning and reporting.
 *
 * @module proposal-engine/client/household-manager
 */

import { randomUUID } from 'crypto';
import type { MoneyCents, AccountType, AssetClass } from '@/lib/proposal-engine/types';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Relationship of a household member to the primary account holder.
 */
export type HouseholdRelationship =
  | 'PRIMARY'
  | 'SPOUSE'
  | 'DEPENDENT'
  | 'TRUST_BENEFICIARY';

/**
 * A member of a household (person or trust).
 */
export interface HouseholdMember {
  /** UUID of the member. */
  memberId: string;
  /** Display name of the member. */
  name: string;
  /** Relationship to the primary account holder. */
  relationship: HouseholdRelationship;
  /** Array of account IDs owned by this member. */
  accounts: string[];
}

/**
 * Parameters for creating a new household.
 */
export interface CreateHouseholdParams {
  /** Display name of the household (e.g., "Smith Family"). */
  name: string;
  /** Array of household members. */
  members: HouseholdMember[];
  /** UUID of the primary contact member. */
  primaryContactId: string;
}

/**
 * A household entity with aggregated accounts and members.
 */
export interface Household {
  /** UUID of the household. */
  householdId: string;
  /** Display name of the household. */
  name: string;
  /** Array of household members. */
  members: HouseholdMember[];
  /** Array of all accounts across all members. */
  accounts: HouseholdAccount[];
  /** Total household AUM in cents. */
  totalAUM: MoneyCents;
  /** ISO 8601 timestamp when the household was created. */
  createdAt: string;
}

/**
 * An investment account within a household.
 */
export interface HouseholdAccount {
  /** UUID of the account. */
  accountId: string;
  /** UUID of the member who owns this account. */
  memberId: string;
  /** Display name of the account (e.g., "John IRA"). */
  accountName: string;
  /** Tax-registration type of the account. */
  accountType: AccountType;
  /** Current account value in cents. */
  value: MoneyCents;
  /** Custodian or brokerage institution. */
  institution: string;
}

/**
 * A single holding within a household account.
 */
export interface Holding {
  /** Ticker symbol or null for non-traded assets. */
  ticker: string | null;
  /** Display name of the holding. */
  name: string;
  /** Asset class classification. */
  assetClass: AssetClass;
  /** Number of shares/units. */
  quantity: number;
  /** Price per share in cents. */
  price: MoneyCents;
  /** Total market value in cents. */
  marketValue: MoneyCents;
  /** Cost basis in cents, or null if unavailable. */
  costBasis: MoneyCents | null;
  /** Account ID this holding belongs to. */
  accountId: string;
}

/**
 * Aggregated portfolio view for a household.
 */
export interface HouseholdPortfolio {
  /** UUID of the household. */
  householdId: string;
  /** Total household value in cents. */
  totalValue: MoneyCents;
  /** Array of all accounts in the household. */
  accounts: HouseholdAccount[];
  /** Consolidated holdings across all accounts. */
  consolidatedHoldings: Holding[];
  /** Household-level allocation summary. */
  allocationSummary: {
    /** Equity percentage (0-100). */
    equity: number;
    /** Fixed income percentage (0-100). */
    fixedIncome: number;
    /** Alternatives percentage (0-100). */
    alternatives: number;
    /** Cash percentage (0-100). */
    cash: number;
  };
  /** Value breakdown by member. */
  memberBreakdown: Array<{
    /** UUID of the member. */
    memberId: string;
    /** Member display name. */
    name: string;
    /** Total value for this member's accounts in cents. */
    value: MoneyCents;
    /** Percentage of household total (0-100). */
    pct: number;
  }>;
}

/**
 * Tax lot summary for household-level tax planning.
 */
export interface TaxLotSummary {
  /** Total cost basis across all taxable holdings in cents. */
  totalCostBasis: MoneyCents;
  /** Total market value across all taxable holdings in cents. */
  totalMarketValue: MoneyCents;
  /** Total unrealized gains in cents. */
  unrealizedGains: MoneyCents;
  /** Total unrealized losses in cents (as positive value). */
  unrealizedLosses: MoneyCents;
  /** Short-term unrealized gains in cents. */
  shortTermGains: MoneyCents;
  /** Long-term unrealized gains in cents. */
  longTermGains: MoneyCents;
  /** Losses available for tax-loss harvesting in cents. */
  harvestablelosses: MoneyCents;
}

// ── In-Memory Store (Production: Use Database) ──────────────────────────────

const householdStore = new Map<string, Household>();
const accountStore = new Map<string, HouseholdAccount>();
const holdingStore = new Map<string, Holding[]>(); // accountId -> holdings

// ── Household Creation ──────────────────────────────────────────────────────

/**
 * Creates a new household with members and accounts.
 *
 * Initializes a household entity in memory (production: persist to database).
 * Validates that primaryContactId corresponds to a member in the household.
 *
 * @param params - Household creation parameters
 * @returns Created household entity
 *
 * @example
 * ```typescript
 * const household = createHousehold({
 *   name: 'Smith Family',
 *   members: [
 *     {
 *       memberId: 'member-1',
 *       name: 'John Smith',
 *       relationship: 'PRIMARY',
 *       accounts: ['acct-1', 'acct-2'],
 *     },
 *     {
 *       memberId: 'member-2',
 *       name: 'Jane Smith',
 *       relationship: 'SPOUSE',
 *       accounts: ['acct-3'],
 *     },
 *   ],
 *   primaryContactId: 'member-1',
 * });
 * ```
 */
export function createHousehold(params: CreateHouseholdParams): Household {
  const { name, members, primaryContactId } = params;

  // Validate primary contact
  const primaryMember = members.find(m => m.memberId === primaryContactId);
  if (!primaryMember) {
    throw new Error(`Primary contact ${primaryContactId} not found in members`);
  }

  const householdId = randomUUID();
  const createdAt = new Date().toISOString();

  // Initialize empty accounts array (will be populated when accounts are added)
  const household: Household = {
    householdId,
    name,
    members,
    accounts: [],
    totalAUM: 0 as MoneyCents,
    createdAt,
  };

  householdStore.set(householdId, household);

  console.log(`[Household Manager] Created household ${householdId}: ${name}`);
  return household;
}

// ── Portfolio Aggregation ───────────────────────────────────────────────────

/**
 * Aggregates portfolio data across all household accounts.
 *
 * Consolidates holdings, calculates allocation breakdown, and provides
 * per-member value summaries. Used for household-level proposal generation
 * and financial planning.
 *
 * @param householdId - UUID of the household
 * @returns Aggregated household portfolio view
 *
 * @example
 * ```typescript
 * const portfolio = aggregateHouseholdPortfolio('household-123');
 * console.log(`Total AUM: $${portfolio.totalValue / 100}`);
 * console.log(`Equity: ${portfolio.allocationSummary.equity}%`);
 * ```
 */
export function aggregateHouseholdPortfolio(householdId: string): HouseholdPortfolio {
  const household = householdStore.get(householdId);
  if (!household) {
    throw new Error(`Household ${householdId} not found`);
  }

  // Gather all accounts for this household
  const accountIds = household.members.flatMap(m => m.accounts);
  const accounts = accountIds
    .map(id => accountStore.get(id))
    .filter(Boolean) as HouseholdAccount[];

  // Calculate total value
  const totalValue = accounts.reduce((sum, acct) => sum + (acct.value as number), 0) as MoneyCents;

  // Consolidate holdings across all accounts
  const consolidatedHoldings: Holding[] = [];
  for (const account of accounts) {
    const accountHoldings = holdingStore.get(account.accountId) ?? [];
    consolidatedHoldings.push(...accountHoldings);
  }

  // Calculate allocation summary
  const assetClassMap: Record<string, number> = {};
  for (const holding of consolidatedHoldings) {
    const className = holding.assetClass;
    assetClassMap[className] = (assetClassMap[className] ?? 0) + (holding.marketValue as number);
  }

  const equityClasses = [
    'EQUITY_US_LARGE', 'EQUITY_US_MID', 'EQUITY_US_SMALL',
    'EQUITY_INTL_DEVELOPED', 'EQUITY_INTL_EMERGING', 'EQUITY_SECTOR'
  ];
  const fixedIncomeClasses = [
    'FIXED_INCOME_GOVT', 'FIXED_INCOME_CORP', 'FIXED_INCOME_CORP_IG',
    'FIXED_INCOME_CORP_HY', 'FIXED_INCOME_MUNI', 'FIXED_INCOME_INTL', 'FIXED_INCOME_TIPS'
  ];
  const alternativesClasses = [
    'ALTERNATIVES_REAL_ESTATE', 'ALTERNATIVES_COMMODITIES', 'ALTERNATIVES_OTHER',
    'ALTERNATIVE_PE', 'ALTERNATIVE_HEDGE', 'ALTERNATIVE_PRIVATE_CREDIT',
    'REAL_ESTATE', 'COMMODITIES', 'GOLD'
  ];

  const equityValue = equityClasses.reduce((sum, cls) => sum + (assetClassMap[cls] ?? 0), 0);
  const fixedIncomeValue = fixedIncomeClasses.reduce((sum, cls) => sum + (assetClassMap[cls] ?? 0), 0);
  const alternativesValue = alternativesClasses.reduce((sum, cls) => sum + (assetClassMap[cls] ?? 0), 0);
  const cashValue = (assetClassMap['CASH'] ?? 0) + (assetClassMap['CASH_EQUIVALENT'] ?? 0);

  const allocationSummary = {
    equity: totalValue > 0 ? Math.round((equityValue / (totalValue as number)) * 100) : 0,
    fixedIncome: totalValue > 0 ? Math.round((fixedIncomeValue / (totalValue as number)) * 100) : 0,
    alternatives: totalValue > 0 ? Math.round((alternativesValue / (totalValue as number)) * 100) : 0,
    cash: totalValue > 0 ? Math.round((cashValue / (totalValue as number)) * 100) : 0,
  };

  // Member breakdown
  const memberBreakdown = household.members.map(member => {
    const memberAccounts = accounts.filter(a => a.memberId === member.memberId);
    const memberValue = memberAccounts.reduce((sum, a) => sum + (a.value as number), 0) as MoneyCents;
    const pct = totalValue > 0 ? Math.round(((memberValue as number) / (totalValue as number)) * 100) : 0;

    return {
      memberId: member.memberId,
      name: member.name,
      value: memberValue,
      pct,
    };
  });

  return {
    householdId,
    totalValue,
    accounts,
    consolidatedHoldings,
    allocationSummary,
    memberBreakdown,
  };
}

// ── Tax Lot Aggregation ─────────────────────────────────────────────────────

/**
 * Aggregates tax lot data across all taxable household accounts.
 *
 * Calculates cost basis, unrealized gains/losses, short-term vs. long-term
 * gains, and harvestable losses for tax planning and transition analysis.
 * Only includes holdings in taxable accounts (excludes IRAs, 401(k)s, etc.).
 *
 * @param householdId - UUID of the household
 * @returns Tax lot summary for household-level tax planning
 *
 * @example
 * ```typescript
 * const taxLots = getHouseholdTaxLots('household-123');
 * console.log(`Harvestable losses: $${taxLots.harvestablelosses / 100}`);
 * console.log(`Long-term gains: $${taxLots.longTermGains / 100}`);
 * ```
 */
export function getHouseholdTaxLots(householdId: string): TaxLotSummary {
  const household = householdStore.get(householdId);
  if (!household) {
    throw new Error(`Household ${householdId} not found`);
  }

  // Gather all accounts for this household
  const accountIds = household.members.flatMap(m => m.accounts);
  const accounts = accountIds
    .map(id => accountStore.get(id))
    .filter(Boolean) as HouseholdAccount[];

  // Filter to taxable accounts only
  const taxableAccounts = accounts.filter(a =>
    a.accountType === 'TAXABLE' || a.accountType === 'JOINT' || a.accountType === 'TRUST'
  );

  // Gather holdings from taxable accounts
  const taxableHoldings: Holding[] = [];
  for (const account of taxableAccounts) {
    const accountHoldings = holdingStore.get(account.accountId) ?? [];
    taxableHoldings.push(...accountHoldings);
  }

  // Calculate totals
  let totalCostBasis = 0;
  let totalMarketValue = 0;
  let unrealizedGains = 0;
  let unrealizedLosses = 0;
  let shortTermGains = 0;
  let longTermGains = 0;
  let harvestablelosses = 0;

  for (const holding of taxableHoldings) {
    const marketValue = holding.marketValue as number;
    const costBasis = (holding.costBasis ?? 0) as number;
    const gain = marketValue - costBasis;

    totalMarketValue += marketValue;
    totalCostBasis += costBasis;

    if (gain > 0) {
      unrealizedGains += gain;
      // Assume holdings with cost basis are long-term (simplified)
      longTermGains += gain;
    } else if (gain < 0) {
      unrealizedLosses += Math.abs(gain);
      harvestablelosses += Math.abs(gain);
    }
  }

  return {
    totalCostBasis: totalCostBasis as MoneyCents,
    totalMarketValue: totalMarketValue as MoneyCents,
    unrealizedGains: unrealizedGains as MoneyCents,
    unrealizedLosses: unrealizedLosses as MoneyCents,
    shortTermGains: shortTermGains as MoneyCents,
    longTermGains: longTermGains as MoneyCents,
    harvestablelosses: harvestablelosses as MoneyCents,
  };
}

// ── Helper: Add Account to Household ────────────────────────────────────────

/**
 * Adds an account to a household member.
 * (Internal helper for testing and setup — production uses database constraints)
 */
export function addAccountToHousehold(
  householdId: string,
  memberId: string,
  account: HouseholdAccount
): void {
  const household = householdStore.get(householdId);
  if (!household) {
    throw new Error(`Household ${householdId} not found`);
  }

  const member = household.members.find(m => m.memberId === memberId);
  if (!member) {
    throw new Error(`Member ${memberId} not found in household ${householdId}`);
  }

  // Add account to member's account list
  if (!member.accounts.includes(account.accountId)) {
    member.accounts.push(account.accountId);
  }

  // Store account
  accountStore.set(account.accountId, account);

  // Update household accounts array
  if (!household.accounts.find(a => a.accountId === account.accountId)) {
    household.accounts.push(account);
  }

  // Recalculate total AUM
  household.totalAUM = household.accounts.reduce(
    (sum, a) => sum + (a.value as number),
    0
  ) as MoneyCents;

  householdStore.set(householdId, household);
}

/**
 * Adds holdings to an account.
 * (Internal helper for testing and setup)
 */
export function addHoldingsToAccount(accountId: string, holdings: Holding[]): void {
  const existing = holdingStore.get(accountId) ?? [];
  holdingStore.set(accountId, [...existing, ...holdings]);
}
