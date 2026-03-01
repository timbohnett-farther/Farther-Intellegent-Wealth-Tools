/**
 * Farther Unified Platform — Household Store
 *
 * In-memory store for Stage 1. Provides CRUD operations for
 * households and all sub-entities. Seeded with 5 demo households
 * representing different wealth tiers and family structures.
 *
 * Stage 2 will swap this for Prisma queries against Cloud SQL.
 *
 * @module household/store
 */

import type {
  Household,
  HouseholdId,
  HouseholdMember,
  HouseholdAccount,
  HouseholdIncome,
  HouseholdExpense,
  HouseholdGoal,
  HouseholdDebt,
  HouseholdRealEstate,
  HouseholdTaxProfile,
  HouseholdEstatePlan,
  Household360View,
  HouseholdSearchParams,
  HouseholdSearchResult,
  HouseholdDashboardStats,
  HouseholdStatus,
  WealthTier,
  MemberId,
  AccountId,
} from './types';

import {
  householdId,
  memberId,
  accountId,
  createHousehold as createHouseholdFromTypes,
  recomputeHouseholdMetrics,
  buildHousehold360View,
  emptyDashboardStats,
} from './types';

// =============================================================================
// Deep Clone Helper
// =============================================================================

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// =============================================================================
// Private Store
// =============================================================================

const households: Map<string, Household> = new Map();

// =============================================================================
// ID Generation
// =============================================================================

let idCounter = 1000;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// =============================================================================
// Household CRUD
// =============================================================================

export interface CreateHouseholdInput {
  firmId: string;
  advisorId: string;
  name: string;
  status?: HouseholdStatus;
  wealthTier?: WealthTier;
  primaryState?: string;
}

/**
 * Creates a new household in the store.
 */
export function createHousehold(data: CreateHouseholdInput): Household {
  const id = householdId(nextId('hh'));
  const household = createHouseholdFromTypes({
    id,
    firmId: data.firmId,
    advisorId: data.advisorId,
    name: data.name,
    status: data.status,
    wealthTier: data.wealthTier,
  });

  households.set(id, clone(household));
  return clone(household);
}

/**
 * Retrieves a household by ID. Returns null if not found.
 */
export function getHousehold(id: HouseholdId): Household | null {
  const hh = households.get(id);
  return hh ? clone(hh) : null;
}

/**
 * Updates a household with partial data. Returns the updated household.
 * Throws if the household does not exist.
 */
export function updateHousehold(
  id: HouseholdId,
  updates: Partial<Omit<Household, 'id' | 'createdAt'>>,
): Household {
  const existing = households.get(id);
  if (!existing) {
    throw new Error(`Household "${id}" not found.`);
  }

  const updated: Household = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
  };

  households.set(id, clone(updated));
  return clone(updated);
}

/**
 * Deletes a household from the store.
 */
export function deleteHousehold(id: HouseholdId): boolean {
  return households.delete(id);
}

/**
 * Lists households with search/filter/pagination support.
 */
export function listHouseholds(
  params: Partial<HouseholdSearchParams> = {},
): HouseholdSearchResult {
  let results = Array.from(households.values());

  // Filter by firmId
  if (params.firmId) {
    results = results.filter((h) => h.firmId === params.firmId);
  }

  // Filter by advisorId
  if (params.advisorId) {
    results = results.filter((h) => h.advisorId === params.advisorId);
  }

  // Filter by status (array OR)
  if (params.status && params.status.length > 0) {
    results = results.filter((h) => params.status!.includes(h.status));
  }

  // Filter by wealthTier (array OR)
  if (params.wealthTier && params.wealthTier.length > 0) {
    results = results.filter((h) => params.wealthTier!.includes(h.wealthTier));
  }

  // Free-text search across name and member names
  if (params.query) {
    const q = params.query.toLowerCase();
    results = results.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.members.some(
          (m) =>
            m.firstName.toLowerCase().includes(q) ||
            m.lastName.toLowerCase().includes(q) ||
            (m.email && m.email.toLowerCase().includes(q)),
        ),
    );
  }

  // Filter by tags (AND)
  if (params.tags && params.tags.length > 0) {
    results = results.filter((h) =>
      params.tags!.every((tag) => h.tags.includes(tag)),
    );
  }

  // Filter by net worth range
  if (params.minNetWorth !== undefined) {
    results = results.filter((h) => h.netWorth >= params.minNetWorth!);
  }
  if (params.maxNetWorth !== undefined) {
    results = results.filter((h) => h.netWorth <= params.maxNetWorth!);
  }

  // Sorting
  const sortBy = params.sortBy ?? 'name';
  const sortOrder = params.sortOrder ?? 'asc';
  results.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortBy) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'netWorth':
        aVal = a.netWorth;
        bVal = b.netWorth;
        break;
      case 'totalAum':
        aVal = a.totalAum;
        bVal = b.totalAum;
        break;
      case 'createdAt':
        aVal = a.createdAt;
        bVal = b.createdAt;
        break;
      case 'updatedAt':
        aVal = a.updatedAt;
        bVal = b.updatedAt;
        break;
      case 'lastReviewedAt':
        aVal = a.lastReviewedAt ?? '';
        bVal = b.lastReviewedAt ?? '';
        break;
      default:
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const total = results.length;
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const items = results.slice(offset, offset + limit);

  return {
    households: clone(items),
    total,
    limit,
    offset,
  };
}

// =============================================================================
// Sub-Entity CRUD — Members
// =============================================================================

export function addMember(
  hhId: HouseholdId,
  member: Omit<HouseholdMember, 'id' | 'householdId'>,
): HouseholdMember {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);

  const newMember: HouseholdMember = {
    ...member,
    id: memberId(nextId('mem')),
    householdId: hhId,
  };

  hh.members.push(newMember);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return clone(newMember);
}

export function updateMember(
  hhId: HouseholdId,
  memId: string,
  updates: Partial<Omit<HouseholdMember, 'id' | 'householdId'>>,
): HouseholdMember {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);

  const idx = hh.members.findIndex((m) => m.id === memId);
  if (idx === -1) throw new Error(`Member "${memId}" not found.`);

  hh.members[idx] = { ...hh.members[idx], ...updates };
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return clone(hh.members[idx]);
}

export function removeMember(hhId: HouseholdId, memId: string): boolean {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);

  const idx = hh.members.findIndex((m) => m.id === memId);
  if (idx === -1) return false;

  hh.members.splice(idx, 1);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return true;
}

// =============================================================================
// Sub-Entity CRUD — Accounts
// =============================================================================

export function addAccount(
  hhId: HouseholdId,
  account: Omit<HouseholdAccount, 'id' | 'householdId'>,
): HouseholdAccount {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);

  const newAccount: HouseholdAccount = {
    ...account,
    id: accountId(nextId('acc')),
    householdId: hhId,
  };

  hh.accounts.push(newAccount);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  const recalc = recomputeHouseholdMetrics(hh);
  Object.assign(hh, { totalAssets: recalc.totalAssets, totalLiabilities: recalc.totalLiabilities, netWorth: recalc.netWorth, totalAum: recalc.totalAum });
  return clone(newAccount);
}

export function updateAccount(
  hhId: HouseholdId,
  accId: string,
  updates: Partial<Omit<HouseholdAccount, 'id' | 'householdId'>>,
): HouseholdAccount {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);

  const idx = hh.accounts.findIndex((a) => a.id === accId);
  if (idx === -1) throw new Error(`Account "${accId}" not found.`);

  hh.accounts[idx] = { ...hh.accounts[idx], ...updates };
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  const recalc = recomputeHouseholdMetrics(hh);
  Object.assign(hh, { totalAssets: recalc.totalAssets, totalLiabilities: recalc.totalLiabilities, netWorth: recalc.netWorth, totalAum: recalc.totalAum });
  return clone(hh.accounts[idx]);
}

export function removeAccount(hhId: HouseholdId, accId: string): boolean {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);

  const idx = hh.accounts.findIndex((a) => a.id === accId);
  if (idx === -1) return false;

  hh.accounts.splice(idx, 1);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  const recalc = recomputeHouseholdMetrics(hh);
  Object.assign(hh, { totalAssets: recalc.totalAssets, totalLiabilities: recalc.totalLiabilities, netWorth: recalc.netWorth, totalAum: recalc.totalAum });
  return true;
}

// =============================================================================
// Sub-Entity CRUD — Goals
// =============================================================================

export function addGoal(
  hhId: HouseholdId,
  goal: Omit<HouseholdGoal, 'id' | 'householdId'>,
): HouseholdGoal {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);

  const newGoal: HouseholdGoal = {
    ...goal,
    id: nextId('goal'),
    householdId: hhId,
  };

  hh.goals.push(newGoal);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return clone(newGoal);
}

export function updateGoal(
  hhId: HouseholdId,
  goalId: string,
  updates: Partial<Omit<HouseholdGoal, 'id' | 'householdId'>>,
): HouseholdGoal {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);

  const idx = hh.goals.findIndex((g) => g.id === goalId);
  if (idx === -1) throw new Error(`Goal "${goalId}" not found.`);

  hh.goals[idx] = { ...hh.goals[idx], ...updates };
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return clone(hh.goals[idx]);
}

export function removeGoal(hhId: HouseholdId, goalId: string): boolean {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);

  const idx = hh.goals.findIndex((g) => g.id === goalId);
  if (idx === -1) return false;

  hh.goals.splice(idx, 1);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return true;
}

// =============================================================================
// Sub-Entity CRUD — Debts
// =============================================================================

export function addDebt(
  hhId: HouseholdId,
  debt: Omit<HouseholdDebt, 'id' | 'householdId'>,
): HouseholdDebt {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);

  const newDebt: HouseholdDebt = { ...debt, id: nextId('debt'), householdId: hhId };
  hh.debts.push(newDebt);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  const recalc = recomputeHouseholdMetrics(hh);
  Object.assign(hh, { totalAssets: recalc.totalAssets, totalLiabilities: recalc.totalLiabilities, netWorth: recalc.netWorth, totalAum: recalc.totalAum });
  return clone(newDebt);
}

export function updateDebt(
  hhId: HouseholdId,
  debtId: string,
  updates: Partial<Omit<HouseholdDebt, 'id' | 'householdId'>>,
): HouseholdDebt {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  const idx = hh.debts.findIndex((d) => d.id === debtId);
  if (idx === -1) throw new Error(`Debt "${debtId}" not found.`);
  hh.debts[idx] = { ...hh.debts[idx], ...updates };
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  const recalc = recomputeHouseholdMetrics(hh);
  Object.assign(hh, { totalAssets: recalc.totalAssets, totalLiabilities: recalc.totalLiabilities, netWorth: recalc.netWorth, totalAum: recalc.totalAum });
  return clone(hh.debts[idx]);
}

export function removeDebt(hhId: HouseholdId, debtId: string): boolean {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  const idx = hh.debts.findIndex((d) => d.id === debtId);
  if (idx === -1) return false;
  hh.debts.splice(idx, 1);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  const recalc = recomputeHouseholdMetrics(hh);
  Object.assign(hh, { totalAssets: recalc.totalAssets, totalLiabilities: recalc.totalLiabilities, netWorth: recalc.netWorth, totalAum: recalc.totalAum });
  return true;
}

// =============================================================================
// Sub-Entity CRUD — Income
// =============================================================================

export function addIncome(
  hhId: HouseholdId,
  income: Omit<HouseholdIncome, 'id' | 'householdId'>,
): HouseholdIncome {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  const newIncome: HouseholdIncome = { ...income, id: nextId('inc'), householdId: hhId };
  hh.income.push(newIncome);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return clone(newIncome);
}

export function updateIncome(
  hhId: HouseholdId,
  incomeId: string,
  updates: Partial<Omit<HouseholdIncome, 'id' | 'householdId'>>,
): HouseholdIncome {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  const idx = hh.income.findIndex((i) => i.id === incomeId);
  if (idx === -1) throw new Error(`Income "${incomeId}" not found.`);
  hh.income[idx] = { ...hh.income[idx], ...updates };
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return clone(hh.income[idx]);
}

export function removeIncome(hhId: HouseholdId, incomeId: string): boolean {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  const idx = hh.income.findIndex((i) => i.id === incomeId);
  if (idx === -1) return false;
  hh.income.splice(idx, 1);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return true;
}

// =============================================================================
// Sub-Entity CRUD — Expenses
// =============================================================================

export function addExpense(
  hhId: HouseholdId,
  expense: Omit<HouseholdExpense, 'id' | 'householdId'>,
): HouseholdExpense {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  const newExpense: HouseholdExpense = { ...expense, id: nextId('exp'), householdId: hhId };
  hh.expenses.push(newExpense);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return clone(newExpense);
}

export function updateExpense(
  hhId: HouseholdId,
  expenseId: string,
  updates: Partial<Omit<HouseholdExpense, 'id' | 'householdId'>>,
): HouseholdExpense {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  const idx = hh.expenses.findIndex((e) => e.id === expenseId);
  if (idx === -1) throw new Error(`Expense "${expenseId}" not found.`);
  hh.expenses[idx] = { ...hh.expenses[idx], ...updates };
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return clone(hh.expenses[idx]);
}

export function removeExpense(hhId: HouseholdId, expenseId: string): boolean {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  const idx = hh.expenses.findIndex((e) => e.id === expenseId);
  if (idx === -1) return false;
  hh.expenses.splice(idx, 1);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return true;
}

// =============================================================================
// Sub-Entity CRUD — Real Estate
// =============================================================================

export function addRealEstate(
  hhId: HouseholdId,
  property: Omit<HouseholdRealEstate, 'id' | 'householdId'>,
): HouseholdRealEstate {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  const newProp: HouseholdRealEstate = { ...property, id: nextId('re'), householdId: hhId };
  hh.realEstate.push(newProp);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  const recalc = recomputeHouseholdMetrics(hh);
  Object.assign(hh, { totalAssets: recalc.totalAssets, totalLiabilities: recalc.totalLiabilities, netWorth: recalc.netWorth, totalAum: recalc.totalAum });
  return clone(newProp);
}

export function updateRealEstate(
  hhId: HouseholdId,
  reId: string,
  updates: Partial<Omit<HouseholdRealEstate, 'id' | 'householdId'>>,
): HouseholdRealEstate {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  const idx = hh.realEstate.findIndex((r) => r.id === reId);
  if (idx === -1) throw new Error(`RealEstate "${reId}" not found.`);
  hh.realEstate[idx] = { ...hh.realEstate[idx], ...updates };
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  const recalc = recomputeHouseholdMetrics(hh);
  Object.assign(hh, { totalAssets: recalc.totalAssets, totalLiabilities: recalc.totalLiabilities, netWorth: recalc.netWorth, totalAum: recalc.totalAum });
  return clone(hh.realEstate[idx]);
}

export function removeRealEstate(hhId: HouseholdId, reId: string): boolean {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  const idx = hh.realEstate.findIndex((r) => r.id === reId);
  if (idx === -1) return false;
  hh.realEstate.splice(idx, 1);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  const recalc = recomputeHouseholdMetrics(hh);
  Object.assign(hh, { totalAssets: recalc.totalAssets, totalLiabilities: recalc.totalLiabilities, netWorth: recalc.netWorth, totalAum: recalc.totalAum });
  return true;
}

// =============================================================================
// Sub-Entity CRUD — Tax Profile & Estate Plan
// =============================================================================

export function updateTaxProfile(
  hhId: HouseholdId,
  profile: HouseholdTaxProfile,
): HouseholdTaxProfile {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  hh.taxProfile = clone(profile);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return clone(profile);
}

export function updateEstatePlan(
  hhId: HouseholdId,
  plan: HouseholdEstatePlan,
): HouseholdEstatePlan {
  const hh = households.get(hhId);
  if (!hh) throw new Error(`Household "${hhId}" not found.`);
  hh.estatePlan = clone(plan);
  hh.updatedAt = new Date().toISOString();
  hh.version += 1;
  return clone(plan);
}

// =============================================================================
// Computed / Aggregation
// =============================================================================

/**
 * Computes the Household 360-degree view using the types module helper.
 */
export function computeHousehold360(id: HouseholdId): Household360View | null {
  const hh = households.get(id);
  if (!hh) return null;

  // Recompute metrics first
  const recalculated = recomputeHouseholdMetrics(hh);
  Object.assign(hh, {
    totalAssets: recalculated.totalAssets,
    totalLiabilities: recalculated.totalLiabilities,
    netWorth: recalculated.netWorth,
    totalAum: recalculated.totalAum,
  });

  return buildHousehold360View(clone(hh));
}

/**
 * Computes dashboard statistics across all households for a firm.
 */
export function getDashboardStats(firmId: string): HouseholdDashboardStats {
  const firmHouseholds = Array.from(households.values()).filter(
    (h) => h.firmId === firmId,
  );

  const stats = emptyDashboardStats();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  stats.totalHouseholds = firmHouseholds.length;

  for (const hh of firmHouseholds) {
    // Status counts
    stats.byStatus[hh.status] = (stats.byStatus[hh.status] ?? 0) + 1;

    // Wealth tier counts
    stats.byWealthTier[hh.wealthTier] = (stats.byWealthTier[hh.wealthTier] ?? 0) + 1;

    // Aggregate financials
    stats.totalAum += hh.totalAum;
    stats.totalNetWorth += hh.netWorth;

    // Households needing review
    if (hh.nextReviewAt && new Date(hh.nextReviewAt) <= now) {
      stats.householdsNeedingReview += 1;
    }

    // New households in last 30 days
    if (new Date(hh.createdAt) >= thirtyDaysAgo) {
      stats.newHouseholds30d += 1;
    }
  }

  stats.averageNetWorth = stats.totalHouseholds > 0
    ? stats.totalNetWorth / stats.totalHouseholds
    : 0;

  return stats;
}

// =============================================================================
// Store Management (for testing)
// =============================================================================

export function clearStore(): void {
  households.clear();
}

export function reseedStore(): void {
  clearStore();
  idCounter = 1000;
  seedDemoData();
}

export function getStoreSize(): number {
  return households.size;
}

// =============================================================================
// Seed Data — 5 Demo Households
// =============================================================================

function seedDemoData(): void {
  const now = new Date().toISOString();

  // Helper to build a full member
  const mem = (
    id: string,
    hhId: string,
    data: Partial<HouseholdMember> & { firstName: string; lastName: string },
  ): HouseholdMember => {
    const defaults: HouseholdMember = {
      id: memberId(id),
      householdId: householdId(hhId),
      role: 'PRIMARY',
      relationship: 'SELF',
      firstName: data.firstName,
      middleName: null,
      lastName: data.lastName,
      preferredName: null,
      dateOfBirth: '1980-01-01',
      gender: null,
      email: null,
      phoneMobile: null,
      ssnLastFour: null,
      citizenship: 'US',
      domicileState: null,
      employmentStatus: null,
      employerName: null,
      occupation: null,
      isActive: true,
      retirementAge: null,
      lifeExpectancy: null,
      healthStatus: null,
    };
    return { ...defaults, ...data, id: memberId(id), householdId: householdId(hhId) };
  };

  // Helper to build a full account
  const acc = (
    id: string,
    hhId: string,
    ownerId: string,
    data: Partial<HouseholdAccount> & { name: string; currentBalance: number },
  ): HouseholdAccount => {
    const defaults: HouseholdAccount = {
      id: accountId(id),
      householdId: householdId(hhId),
      ownerId: memberId(ownerId),
      coOwnerId: null,
      name: data.name,
      institution: null,
      custodian: 'SCHWAB',
      accountNumberLast4: null,
      accountType: 'BROKERAGE',
      registration: 'INDIVIDUAL',
      taxBucket: 'TAXABLE',
      currentBalance: data.currentBalance,
      costBasis: null,
      unrealizedGain: null,
      equityPct: null,
      bondPct: null,
      cashPct: null,
      alternativePct: null,
      ytdReturn: null,
      inceptionReturn: null,
      isManagedByFarther: true,
      isHeldAway: false,
      lastSyncedAt: now,
      balanceAsOf: now,
      isActive: true,
    };
    return { ...defaults, ...data, id: accountId(id), householdId: householdId(hhId), ownerId: memberId(ownerId) };
  };

  // Helper for income
  const inc = (
    id: string,
    hhId: string,
    memId: string,
    data: Partial<HouseholdIncome> & { name: string; annualAmount: number },
  ): HouseholdIncome => {
    const defaults: HouseholdIncome = {
      id,
      householdId: householdId(hhId),
      memberId: memberId(memId),
      type: 'SALARY',
      name: data.name,
      annualAmount: data.annualAmount,
      frequency: 'ANNUAL',
      startYear: null,
      endYear: null,
      growthRate: 0.03,
      isInflationAdjusted: false,
      isTaxable: true,
      taxCharacter: 'ORDINARY',
      isActive: true,
    };
    return { ...defaults, ...data, id, householdId: householdId(hhId), memberId: memberId(memId) };
  };

  // Helper for expense
  const exp = (
    id: string,
    hhId: string,
    data: Partial<HouseholdExpense> & { name: string; annualAmount: number },
  ): HouseholdExpense => {
    const defaults: HouseholdExpense = {
      id,
      householdId: householdId(hhId),
      category: 'OTHER',
      name: data.name,
      annualAmount: data.annualAmount,
      isEssential: false,
      frequency: 'ANNUAL',
      startYear: null,
      endYear: null,
      growthRate: 0.02,
      isInflationAdjusted: false,
      isActive: true,
    };
    return { ...defaults, ...data, id, householdId: householdId(hhId) };
  };

  // Helper for goal
  const goal = (
    id: string,
    hhId: string,
    data: Partial<HouseholdGoal> & { name: string; targetAmount: number },
  ): HouseholdGoal => {
    const defaults: HouseholdGoal = {
      id,
      householdId: householdId(hhId),
      type: 'CUSTOM',
      name: data.name,
      targetAmount: data.targetAmount,
      currentFunding: 0,
      priority: 'IMPORTANT',
      fundingStatus: 'ON_TRACK',
      targetYear: 2035,
      monthlyContribution: null,
      linkedAccountIds: [],
      inflationAdjusted: false,
      notes: null,
      isActive: true,
    };
    return { ...defaults, ...data, id, householdId: householdId(hhId) };
  };

  // Helper for debt
  const debt = (
    id: string,
    hhId: string,
    memId: string,
    data: Partial<HouseholdDebt> & { name: string; currentBalance: number },
  ): HouseholdDebt => {
    const defaults: HouseholdDebt = {
      id,
      householdId: householdId(hhId),
      memberId: memberId(memId),
      type: 'OTHER',
      name: data.name,
      originalBalance: data.currentBalance,
      currentBalance: data.currentBalance,
      interestRate: 0.05,
      monthlyPayment: 0,
      remainingTermMonths: null,
      isTaxDeductible: false,
      isActive: true,
    };
    return { ...defaults, ...data, id, householdId: householdId(hhId), memberId: memberId(memId) };
  };

  // Helper for real estate
  const re = (
    id: string,
    hhId: string,
    ownerId: string,
    data: Partial<HouseholdRealEstate> & { address: string; estimatedValue: number },
  ): HouseholdRealEstate => {
    const defaults: HouseholdRealEstate = {
      id,
      householdId: householdId(hhId),
      ownerId: memberId(ownerId),
      type: 'PRIMARY_RESIDENCE',
      address: data.address,
      estimatedValue: data.estimatedValue,
      costBasis: null,
      mortgageBalance: null,
      annualPropertyTax: null,
      annualInsurance: null,
      annualRentalIncome: null,
      annualExpenses: null,
      isPrimaryResidence: true,
      purchaseDate: null,
      isActive: true,
    };
    return { ...defaults, ...data, id, householdId: householdId(hhId), ownerId: memberId(ownerId) };
  };

  // -------------------------------------------------------------------------
  // 1. The Johnsons — UHNW couple, 60s, complex estate, ~$17M net worth
  // -------------------------------------------------------------------------
  const johnson: Household = {
    ...createHouseholdFromTypes({
      id: householdId('hh-johnson-001'),
      firmId: 'firm-001',
      advisorId: 'adv-001',
      name: 'The Johnsons',
      status: 'ACTIVE',
      wealthTier: 'UHNW',
    }),
    members: [
      mem('mem-johnson-001', 'hh-johnson-001', {
        firstName: 'Richard', lastName: 'Johnson', role: 'PRIMARY', relationship: 'SELF',
        dateOfBirth: '1963-04-15', email: 'richard.johnson@email.com', phoneMobile: '203-555-0101',
        ssnLastFour: '4567', employmentStatus: 'RETIRED', occupation: 'Former CEO, Fortune 500',
        domicileState: 'CT', retirementAge: 62,
      }),
      mem('mem-johnson-002', 'hh-johnson-001', {
        firstName: 'Margaret', lastName: 'Johnson', role: 'CO_CLIENT', relationship: 'SPOUSE',
        dateOfBirth: '1965-09-22', email: 'margaret.johnson@email.com', phoneMobile: '203-555-0102',
        ssnLastFour: '7891', employmentStatus: 'RETIRED', occupation: 'Former Corporate Attorney',
        domicileState: 'CT',
      }),
      mem('mem-johnson-003', 'hh-johnson-001', {
        firstName: 'Emily', lastName: 'Johnson', role: 'DEPENDENT', relationship: 'CHILD',
        dateOfBirth: '1992-01-10', email: 'emily.johnson@email.com',
        employmentStatus: 'EMPLOYED', occupation: 'Physician',
      }),
    ],
    accounts: [
      acc('acc-johnson-001', 'hh-johnson-001', 'mem-johnson-001', {
        name: 'Richard Traditional IRA', currentBalance: 3200000, accountType: 'IRA_TRADITIONAL',
        taxBucket: 'TAX_DEFERRED', registration: 'INDIVIDUAL',
      }),
      acc('acc-johnson-002', 'hh-johnson-001', 'mem-johnson-002', {
        name: 'Margaret Traditional IRA', currentBalance: 2100000, accountType: 'IRA_TRADITIONAL',
        taxBucket: 'TAX_DEFERRED', registration: 'INDIVIDUAL',
      }),
      acc('acc-johnson-003', 'hh-johnson-001', 'mem-johnson-001', {
        name: 'Joint Taxable Brokerage', currentBalance: 4500000, accountType: 'BROKERAGE',
        taxBucket: 'TAXABLE', registration: 'JOINT_TENANTS', coOwnerId: memberId('mem-johnson-002'),
      }),
      acc('acc-johnson-004', 'hh-johnson-001', 'mem-johnson-001', {
        name: 'Richard Roth IRA', currentBalance: 850000, accountType: 'IRA_ROTH',
        taxBucket: 'TAX_FREE', registration: 'INDIVIDUAL',
      }),
      acc('acc-johnson-005', 'hh-johnson-001', 'mem-johnson-001', {
        name: 'Family Trust', currentBalance: 2200000, accountType: 'TRUST',
        taxBucket: 'TAXABLE', registration: 'TRUST',
      }),
    ],
    income: [
      inc('inc-johnson-001', 'hh-johnson-001', 'mem-johnson-001', {
        name: 'Board Consulting', annualAmount: 250000, type: 'SELF_EMPLOYMENT',
      }),
      inc('inc-johnson-002', 'hh-johnson-001', 'mem-johnson-001', {
        name: 'Social Security — Richard', annualAmount: 42000, type: 'SOCIAL_SECURITY',
        taxCharacter: 'PARTIALLY_TAXABLE',
      }),
      inc('inc-johnson-003', 'hh-johnson-001', 'mem-johnson-002', {
        name: 'Social Security — Margaret', annualAmount: 36000, type: 'SOCIAL_SECURITY',
        taxCharacter: 'PARTIALLY_TAXABLE',
      }),
      inc('inc-johnson-004', 'hh-johnson-001', 'mem-johnson-001', {
        name: 'Portfolio Dividends & Interest', annualAmount: 180000, type: 'DIVIDEND',
        taxCharacter: 'QUALIFIED_DIVIDEND',
      }),
    ],
    expenses: [
      exp('exp-johnson-001', 'hh-johnson-001', { name: 'Property Taxes & Maintenance', annualAmount: 48000, category: 'HOUSING', isEssential: true }),
      exp('exp-johnson-002', 'hh-johnson-001', { name: 'Insurance (Life, Health, Umbrella)', annualAmount: 36000, category: 'INSURANCE', isEssential: true }),
      exp('exp-johnson-003', 'hh-johnson-001', { name: 'Travel & Leisure', annualAmount: 60000, category: 'TRAVEL' }),
      exp('exp-johnson-004', 'hh-johnson-001', { name: 'Philanthropic Giving', annualAmount: 100000, category: 'CHARITABLE' }),
      exp('exp-johnson-005', 'hh-johnson-001', { name: 'General Living Expenses', annualAmount: 72000, category: 'PERSONAL', isEssential: true }),
    ],
    goals: [
      goal('goal-johnson-001', 'hh-johnson-001', {
        name: 'Maintain Lifestyle Through Retirement', type: 'RETIREMENT',
        targetAmount: 10000000, currentFunding: 8500000, targetYear: 2033, priority: 'ESSENTIAL',
      }),
      goal('goal-johnson-002', 'hh-johnson-001', {
        name: 'Grandchildren Education Fund', type: 'EDUCATION',
        targetAmount: 1000000, currentFunding: 350000, targetYear: 2035, priority: 'IMPORTANT',
      }),
      goal('goal-johnson-003', 'hh-johnson-001', {
        name: 'Charitable Foundation Endowment', type: 'CHARITABLE_GIVING',
        targetAmount: 5000000, currentFunding: 2200000, targetYear: 2040, priority: 'ASPIRATIONAL',
      }),
    ],
    debts: [],
    realEstate: [
      re('re-johnson-001', 'hh-johnson-001', 'mem-johnson-001', {
        address: '42 Fieldstone Lane, Greenwich, CT 06830', estimatedValue: 3200000,
        costBasis: 1800000, mortgageBalance: 0, annualPropertyTax: 38000,
        isPrimaryResidence: true, purchaseDate: '2001-06-15',
      }),
      re('re-johnson-002', 'hh-johnson-001', 'mem-johnson-001', {
        address: '15 Ocean Drive, Naples, FL 34102', estimatedValue: 1800000, type: 'VACATION_HOME',
        costBasis: 1200000, mortgageBalance: 450000, annualPropertyTax: 12000,
        isPrimaryResidence: false, purchaseDate: '2015-03-20',
      }),
    ],
    taxProfile: {
      householdId: householdId('hh-johnson-001'), filingStatus: 'MFJ',
      federalBracket: 0.37, stateBracket: 0.0699, domicileState: 'CT',
      estimatedEffectiveRate: 0.285, estimatedAGI: 680000, estimatedTaxableIncome: 580000,
      amtExposure: false, niitExposure: true, qbiEligible: false,
      capitalLossCarryforward: 0, charitableCarryforward: 0,
      lastTaxYearFiled: 2025, cpaName: 'Smith & Associates', cpaEmail: 'tax@smithcpa.com',
    },
    estatePlan: {
      householdId: householdId('hh-johnson-001'), status: 'CURRENT',
      hasWill: true, hasTrust: true, hasPoa: true, hasHealthcareDirective: true,
      estimatedGrossEstate: 17000000, estimatedEstateTax: 1200000,
      exemptionUsed: 0, remainingExemption: 13610000,
      trustNames: ['Johnson Family Trust', 'Johnson Charitable Remainder Trust'],
      lastUpdated: '2025-06-15', attorneyName: 'Clark & Patterson LLC',
      attorneyEmail: 'estate@clarkpatterson.com', notes: null,
    },
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: now,
  };
  const jRecalc = recomputeHouseholdMetrics(johnson);
  Object.assign(johnson, { totalAssets: jRecalc.totalAssets, totalLiabilities: jRecalc.totalLiabilities, netWorth: jRecalc.netWorth, totalAum: jRecalc.totalAum });
  households.set(johnson.id, johnson);

  // -------------------------------------------------------------------------
  // 2. The Patels — HNW family, 40s, education goals, ~$3.5M
  // -------------------------------------------------------------------------
  const patel: Household = {
    ...createHouseholdFromTypes({
      id: householdId('hh-patel-001'),
      firmId: 'firm-001', advisorId: 'adv-001',
      name: 'The Patels', status: 'ACTIVE', wealthTier: 'HNW',
    }),
    members: [
      mem('mem-patel-001', 'hh-patel-001', {
        firstName: 'Raj', lastName: 'Patel', role: 'PRIMARY', relationship: 'SELF',
        dateOfBirth: '1982-07-08', email: 'raj.patel@email.com', phoneMobile: '973-555-0201',
        ssnLastFour: '3456', employmentStatus: 'EMPLOYED', occupation: 'VP of Engineering, FinTech',
        domicileState: 'NJ',
      }),
      mem('mem-patel-002', 'hh-patel-001', {
        firstName: 'Priya', lastName: 'Patel', role: 'CO_CLIENT', relationship: 'SPOUSE',
        dateOfBirth: '1984-11-30', email: 'priya.patel@email.com', phoneMobile: '973-555-0202',
        ssnLastFour: '6789', employmentStatus: 'EMPLOYED', occupation: 'Pediatrician',
        domicileState: 'NJ',
      }),
      mem('mem-patel-003', 'hh-patel-001', {
        firstName: 'Anika', lastName: 'Patel', role: 'DEPENDENT', relationship: 'CHILD',
        dateOfBirth: '2012-03-15', isActive: true,
      }),
      mem('mem-patel-004', 'hh-patel-001', {
        firstName: 'Arjun', lastName: 'Patel', role: 'DEPENDENT', relationship: 'CHILD',
        dateOfBirth: '2015-08-22', isActive: true,
      }),
    ],
    accounts: [
      acc('acc-patel-001', 'hh-patel-001', 'mem-patel-001', {
        name: 'Raj 401(k)', currentBalance: 980000, accountType: '401K',
        custodian: 'FIDELITY', taxBucket: 'TAX_DEFERRED',
      }),
      acc('acc-patel-002', 'hh-patel-001', 'mem-patel-002', {
        name: 'Priya 403(b)', currentBalance: 620000, accountType: '403B',
        custodian: 'OTHER', taxBucket: 'TAX_DEFERRED',
      }),
      acc('acc-patel-003', 'hh-patel-001', 'mem-patel-001', {
        name: 'Joint Taxable', currentBalance: 750000, accountType: 'BROKERAGE',
        custodian: 'FIDELITY', taxBucket: 'TAXABLE', registration: 'JOINT_TENANTS',
        coOwnerId: memberId('mem-patel-002'),
      }),
      acc('acc-patel-004', 'hh-patel-001', 'mem-patel-003', {
        name: 'Anika 529 Plan', currentBalance: 125000, accountType: 'EDUCATION_529',
        custodian: 'FIDELITY', taxBucket: 'TAX_FREE', registration: 'CUSTODIAL',
      }),
      acc('acc-patel-005', 'hh-patel-001', 'mem-patel-004', {
        name: 'Arjun 529 Plan', currentBalance: 95000, accountType: 'EDUCATION_529',
        custodian: 'FIDELITY', taxBucket: 'TAX_FREE', registration: 'CUSTODIAL',
      }),
      acc('acc-patel-006', 'hh-patel-001', 'mem-patel-001', {
        name: 'Raj Roth IRA', currentBalance: 215000, accountType: 'IRA_ROTH',
        custodian: 'FIDELITY', taxBucket: 'TAX_FREE',
      }),
    ],
    income: [
      inc('inc-patel-001', 'hh-patel-001', 'mem-patel-001', { name: 'VP Engineering Salary', annualAmount: 285000, type: 'SALARY' }),
      inc('inc-patel-002', 'hh-patel-001', 'mem-patel-001', { name: 'RSU Vesting (estimated)', annualAmount: 120000, type: 'CAPITAL_GAINS' }),
      inc('inc-patel-003', 'hh-patel-001', 'mem-patel-002', { name: 'Pediatric Practice Income', annualAmount: 210000, type: 'SALARY' }),
    ],
    expenses: [
      exp('exp-patel-001', 'hh-patel-001', { name: 'Mortgage, Taxes, Insurance', annualAmount: 72000, category: 'HOUSING', isEssential: true }),
      exp('exp-patel-002', 'hh-patel-001', { name: 'Childcare & Programs', annualAmount: 24000, category: 'CHILDCARE', isEssential: true }),
      exp('exp-patel-003', 'hh-patel-001', { name: 'General Living Expenses', annualAmount: 84000, category: 'PERSONAL', isEssential: true }),
      exp('exp-patel-004', 'hh-patel-001', { name: 'Life & Disability Insurance', annualAmount: 12000, category: 'INSURANCE', isEssential: true }),
    ],
    goals: [
      goal('goal-patel-001', 'hh-patel-001', { name: 'Retirement at 60', type: 'RETIREMENT', targetAmount: 6000000, currentFunding: 2785000, targetYear: 2042, priority: 'ESSENTIAL' }),
      goal('goal-patel-002', 'hh-patel-001', { name: 'Anika College Fund', type: 'EDUCATION', targetAmount: 350000, currentFunding: 125000, targetYear: 2030, priority: 'ESSENTIAL' }),
      goal('goal-patel-003', 'hh-patel-001', { name: 'Arjun College Fund', type: 'EDUCATION', targetAmount: 350000, currentFunding: 95000, targetYear: 2033, priority: 'ESSENTIAL' }),
      goal('goal-patel-004', 'hh-patel-001', { name: 'Vacation Home', type: 'MAJOR_PURCHASE', targetAmount: 200000, currentFunding: 80000, targetYear: 2028, priority: 'ASPIRATIONAL', fundingStatus: 'AT_RISK' }),
    ],
    debts: [
      debt('debt-patel-001', 'hh-patel-001', 'mem-patel-001', { name: 'Primary Mortgage', type: 'MORTGAGE', originalBalance: 650000, currentBalance: 485000, interestRate: 0.0325, monthlyPayment: 3200, isTaxDeductible: true }),
      debt('debt-patel-002', 'hh-patel-001', 'mem-patel-002', { name: 'Priya Medical School Loans', type: 'STUDENT_LOAN', originalBalance: 180000, currentBalance: 42000, interestRate: 0.045, monthlyPayment: 1200 }),
    ],
    realEstate: [
      re('re-patel-001', 'hh-patel-001', 'mem-patel-001', {
        address: '18 Maple Court, Short Hills, NJ 07078', estimatedValue: 1150000,
        costBasis: 780000, mortgageBalance: 485000, annualPropertyTax: 22000,
        isPrimaryResidence: true, purchaseDate: '2017-08-15',
      }),
    ],
    taxProfile: {
      householdId: householdId('hh-patel-001'), filingStatus: 'MFJ',
      federalBracket: 0.35, stateBracket: 0.0897, domicileState: 'NJ',
      estimatedEffectiveRate: 0.281, estimatedAGI: 615000, estimatedTaxableIncome: 520000,
      amtExposure: false, niitExposure: true, qbiEligible: false,
      capitalLossCarryforward: 0, charitableCarryforward: 0,
      lastTaxYearFiled: 2025, cpaName: null, cpaEmail: null,
    },
    estatePlan: null,
    createdAt: '2024-03-20T14:00:00.000Z',
    updatedAt: now,
  };
  const pRecalc = recomputeHouseholdMetrics(patel);
  Object.assign(patel, { totalAssets: pRecalc.totalAssets, totalLiabilities: pRecalc.totalLiabilities, netWorth: pRecalc.netWorth, totalAum: pRecalc.totalAum });
  households.set(patel.id, patel);

  // -------------------------------------------------------------------------
  // 3. Sarah Chen — MASS_AFFLUENT single, 35, tech equity, ~$1.1M
  // -------------------------------------------------------------------------
  const chen: Household = {
    ...createHouseholdFromTypes({
      id: householdId('hh-chen-001'),
      firmId: 'firm-001', advisorId: 'adv-002',
      name: 'Sarah Chen', status: 'ACTIVE', wealthTier: 'MASS_AFFLUENT',
    }),
    members: [
      mem('mem-chen-001', 'hh-chen-001', {
        firstName: 'Sarah', lastName: 'Chen', role: 'PRIMARY', relationship: 'SELF',
        dateOfBirth: '1991-02-14', email: 'sarah.chen@techco.com', phoneMobile: '415-555-0301',
        ssnLastFour: '9012', employmentStatus: 'EMPLOYED', occupation: 'Senior Staff Engineer, FAANG',
        domicileState: 'CA',
      }),
    ],
    accounts: [
      acc('acc-chen-001', 'hh-chen-001', 'mem-chen-001', { name: '401(k)', currentBalance: 380000, accountType: '401K', custodian: 'FIDELITY', taxBucket: 'TAX_DEFERRED' }),
      acc('acc-chen-002', 'hh-chen-001', 'mem-chen-001', { name: 'RSU Holdings', currentBalance: 520000, accountType: 'BROKERAGE', custodian: 'OTHER', taxBucket: 'TAXABLE', isHeldAway: true, isManagedByFarther: false }),
      acc('acc-chen-003', 'hh-chen-001', 'mem-chen-001', { name: 'Roth IRA', currentBalance: 145000, accountType: 'IRA_ROTH', taxBucket: 'TAX_FREE' }),
      acc('acc-chen-004', 'hh-chen-001', 'mem-chen-001', { name: 'High-Yield Savings', currentBalance: 85000, accountType: 'SAVINGS', taxBucket: 'TAXABLE' }),
    ],
    income: [
      inc('inc-chen-001', 'hh-chen-001', 'mem-chen-001', { name: 'Base Salary', annualAmount: 245000, type: 'SALARY' }),
      inc('inc-chen-002', 'hh-chen-001', 'mem-chen-001', { name: 'RSU Vesting', annualAmount: 180000, type: 'CAPITAL_GAINS' }),
      inc('inc-chen-003', 'hh-chen-001', 'mem-chen-001', { name: 'Annual Bonus', annualAmount: 50000, type: 'BONUS' }),
    ],
    expenses: [
      exp('exp-chen-001', 'hh-chen-001', { name: 'Rent (SF Apartment)', annualAmount: 42000, category: 'HOUSING', isEssential: true }),
      exp('exp-chen-002', 'hh-chen-001', { name: 'Living Expenses', annualAmount: 48000, category: 'PERSONAL', isEssential: true }),
      exp('exp-chen-003', 'hh-chen-001', { name: 'Travel', annualAmount: 18000, category: 'TRAVEL' }),
    ],
    goals: [
      goal('goal-chen-001', 'hh-chen-001', { name: 'Buy First Home', type: 'HOME_PURCHASE', targetAmount: 400000, currentFunding: 165000, targetYear: 2028, priority: 'ESSENTIAL' }),
      goal('goal-chen-002', 'hh-chen-001', { name: 'Early Retirement (FIRE)', type: 'RETIREMENT', targetAmount: 4000000, currentFunding: 1130000, targetYear: 2041, priority: 'IMPORTANT' }),
    ],
    debts: [],
    realEstate: [],
    taxProfile: {
      householdId: householdId('hh-chen-001'), filingStatus: 'SINGLE',
      federalBracket: 0.35, stateBracket: 0.1230, domicileState: 'CA',
      estimatedEffectiveRate: 0.316, estimatedAGI: 475000, estimatedTaxableIncome: 420000,
      amtExposure: false, niitExposure: true, qbiEligible: false,
      capitalLossCarryforward: 0, charitableCarryforward: 0,
      lastTaxYearFiled: 2025, cpaName: null, cpaEmail: null,
    },
    estatePlan: null,
    createdAt: '2024-06-01T09:00:00.000Z', updatedAt: now,
  };
  const cRecalc = recomputeHouseholdMetrics(chen);
  Object.assign(chen, { totalAssets: cRecalc.totalAssets, totalLiabilities: cRecalc.totalLiabilities, netWorth: cRecalc.netWorth, totalAum: cRecalc.totalAum });
  households.set(chen.id, chen);

  // -------------------------------------------------------------------------
  // 4. The Garcias — EMERGING couple, 30s, first-time planning
  // -------------------------------------------------------------------------
  const garcia: Household = {
    ...createHouseholdFromTypes({
      id: householdId('hh-garcia-001'),
      firmId: 'firm-001', advisorId: 'adv-002',
      name: 'The Garcias', status: 'ONBOARDING', wealthTier: 'EMERGING',
    }),
    members: [
      mem('mem-garcia-001', 'hh-garcia-001', {
        firstName: 'Carlos', lastName: 'Garcia', role: 'PRIMARY', relationship: 'SELF',
        dateOfBirth: '1993-05-20', email: 'carlos.garcia@email.com', phoneMobile: '512-555-0401',
        ssnLastFour: '4321', employmentStatus: 'EMPLOYED', occupation: 'Marketing Manager',
        domicileState: 'TX',
      }),
      mem('mem-garcia-002', 'hh-garcia-001', {
        firstName: 'Sofia', lastName: 'Garcia', role: 'CO_CLIENT', relationship: 'SPOUSE',
        dateOfBirth: '1994-12-03', email: 'sofia.garcia@email.com', phoneMobile: '512-555-0402',
        ssnLastFour: '8765', employmentStatus: 'EMPLOYED', occupation: 'Registered Nurse',
        domicileState: 'TX',
      }),
    ],
    accounts: [
      acc('acc-garcia-001', 'hh-garcia-001', 'mem-garcia-001', { name: 'Carlos 401(k)', currentBalance: 85000, accountType: '401K', custodian: 'FIDELITY', taxBucket: 'TAX_DEFERRED' }),
      acc('acc-garcia-002', 'hh-garcia-001', 'mem-garcia-002', { name: 'Sofia 403(b)', currentBalance: 62000, accountType: '403B', custodian: 'OTHER', taxBucket: 'TAX_DEFERRED' }),
      acc('acc-garcia-003', 'hh-garcia-001', 'mem-garcia-001', { name: 'Joint Savings', currentBalance: 45000, accountType: 'SAVINGS', registration: 'JOINT_TENANTS', coOwnerId: memberId('mem-garcia-002') }),
      acc('acc-garcia-004', 'hh-garcia-001', 'mem-garcia-001', { name: 'Carlos Roth IRA', currentBalance: 28000, accountType: 'IRA_ROTH', taxBucket: 'TAX_FREE' }),
    ],
    income: [
      inc('inc-garcia-001', 'hh-garcia-001', 'mem-garcia-001', { name: 'Marketing Manager Salary', annualAmount: 95000, type: 'SALARY' }),
      inc('inc-garcia-002', 'hh-garcia-001', 'mem-garcia-002', { name: 'Nursing Salary', annualAmount: 78000, type: 'SALARY' }),
    ],
    expenses: [
      exp('exp-garcia-001', 'hh-garcia-001', { name: 'Mortgage & Insurance', annualAmount: 30000, category: 'HOUSING', isEssential: true }),
      exp('exp-garcia-002', 'hh-garcia-001', { name: 'Car Payments & Insurance', annualAmount: 14400, category: 'TRANSPORTATION', isEssential: true }),
      exp('exp-garcia-003', 'hh-garcia-001', { name: 'Groceries, Utilities, General', annualAmount: 36000, category: 'PERSONAL', isEssential: true }),
    ],
    goals: [
      goal('goal-garcia-001', 'hh-garcia-001', { name: 'Emergency Fund (6 Months)', type: 'EMERGENCY_FUND', targetAmount: 50000, currentFunding: 45000, targetYear: 2027, priority: 'ESSENTIAL' }),
      goal('goal-garcia-002', 'hh-garcia-001', { name: 'Pay Off Student Loans', type: 'DEBT_PAYOFF', targetAmount: 65000, currentFunding: 25000, targetYear: 2030, priority: 'ESSENTIAL' }),
      goal('goal-garcia-003', 'hh-garcia-001', { name: 'Save for First Baby', type: 'MAJOR_PURCHASE', targetAmount: 20000, currentFunding: 5000, targetYear: 2027, priority: 'IMPORTANT', fundingStatus: 'AT_RISK' }),
    ],
    debts: [
      debt('debt-garcia-001', 'hh-garcia-001', 'mem-garcia-001', { name: 'Primary Mortgage', type: 'MORTGAGE', originalBalance: 320000, currentBalance: 295000, interestRate: 0.0675, monthlyPayment: 2100, isTaxDeductible: true }),
      debt('debt-garcia-002', 'hh-garcia-001', 'mem-garcia-001', { name: 'Carlos Student Loans', type: 'STUDENT_LOAN', originalBalance: 45000, currentBalance: 28000, interestRate: 0.055, monthlyPayment: 450 }),
      debt('debt-garcia-003', 'hh-garcia-001', 'mem-garcia-002', { name: 'Sofia Student Loans', type: 'STUDENT_LOAN', originalBalance: 55000, currentBalance: 37000, interestRate: 0.048, monthlyPayment: 520 }),
      debt('debt-garcia-004', 'hh-garcia-001', 'mem-garcia-001', { name: 'Auto Loan — Honda CR-V', type: 'AUTO_LOAN', originalBalance: 32000, currentBalance: 18000, interestRate: 0.039, monthlyPayment: 550 }),
    ],
    realEstate: [
      re('re-garcia-001', 'hh-garcia-001', 'mem-garcia-001', {
        address: '2204 Bluebonnet Drive, Austin, TX 78745', estimatedValue: 385000,
        costBasis: 340000, mortgageBalance: 295000, annualPropertyTax: 7800,
        isPrimaryResidence: true, purchaseDate: '2023-08-10',
      }),
    ],
    taxProfile: {
      householdId: householdId('hh-garcia-001'), filingStatus: 'MFJ',
      federalBracket: 0.22, stateBracket: 0, domicileState: 'TX',
      estimatedEffectiveRate: 0.127, estimatedAGI: 173000, estimatedTaxableIncome: 140000,
      amtExposure: false, niitExposure: false, qbiEligible: false,
      capitalLossCarryforward: 0, charitableCarryforward: 0,
      lastTaxYearFiled: 2025, cpaName: null, cpaEmail: null,
    },
    estatePlan: null,
    createdAt: '2025-11-01T16:00:00.000Z', updatedAt: now,
  };
  const gRecalc = recomputeHouseholdMetrics(garcia);
  Object.assign(garcia, { totalAssets: gRecalc.totalAssets, totalLiabilities: gRecalc.totalLiabilities, netWorth: gRecalc.netWorth, totalAum: gRecalc.totalAum });
  households.set(garcia.id, garcia);

  // -------------------------------------------------------------------------
  // 5. Robert Williams — HNW retiree, 72, RMD optimization, ~$5M
  // -------------------------------------------------------------------------
  const williams: Household = {
    ...createHouseholdFromTypes({
      id: householdId('hh-williams-001'),
      firmId: 'firm-001', advisorId: 'adv-001',
      name: 'Robert Williams', status: 'ACTIVE', wealthTier: 'HNW',
    }),
    members: [
      mem('mem-williams-001', 'hh-williams-001', {
        firstName: 'Robert', lastName: 'Williams', role: 'PRIMARY', relationship: 'SELF',
        dateOfBirth: '1954-03-28', email: 'robert.williams@email.com', phoneMobile: '561-555-0501',
        ssnLastFour: '6543', employmentStatus: 'RETIRED', occupation: 'Retired (Former CFO)',
        domicileState: 'FL', retirementAge: 65,
      }),
    ],
    accounts: [
      acc('acc-williams-001', 'hh-williams-001', 'mem-williams-001', { name: 'Traditional IRA (Primary)', currentBalance: 2800000, accountType: 'IRA_TRADITIONAL', taxBucket: 'TAX_DEFERRED' }),
      acc('acc-williams-002', 'hh-williams-001', 'mem-williams-001', { name: 'Roth IRA', currentBalance: 450000, accountType: 'IRA_ROTH', taxBucket: 'TAX_FREE' }),
      acc('acc-williams-003', 'hh-williams-001', 'mem-williams-001', { name: 'Taxable Brokerage', currentBalance: 1200000, accountType: 'BROKERAGE', taxBucket: 'TAXABLE' }),
      acc('acc-williams-004', 'hh-williams-001', 'mem-williams-001', { name: 'Municipal Bond Portfolio', currentBalance: 600000, accountType: 'BROKERAGE', taxBucket: 'TAXABLE' }),
      acc('acc-williams-005', 'hh-williams-001', 'mem-williams-001', { name: 'High-Yield Savings', currentBalance: 150000, accountType: 'SAVINGS', taxBucket: 'TAXABLE' }),
    ],
    income: [
      inc('inc-williams-001', 'hh-williams-001', 'mem-williams-001', { name: 'Social Security', annualAmount: 44000, type: 'SOCIAL_SECURITY', taxCharacter: 'PARTIALLY_TAXABLE' }),
      inc('inc-williams-002', 'hh-williams-001', 'mem-williams-001', { name: 'Corporate Pension', annualAmount: 72000, type: 'PENSION' }),
      inc('inc-williams-003', 'hh-williams-001', 'mem-williams-001', { name: 'Required Minimum Distribution', annualAmount: 110000, type: 'OTHER' }),
      inc('inc-williams-004', 'hh-williams-001', 'mem-williams-001', { name: 'Portfolio Dividends & Interest', annualAmount: 65000, type: 'DIVIDEND', taxCharacter: 'QUALIFIED_DIVIDEND' }),
    ],
    expenses: [
      exp('exp-williams-001', 'hh-williams-001', { name: 'Property Taxes, HOA, Maintenance', annualAmount: 24000, category: 'HOUSING', isEssential: true }),
      exp('exp-williams-002', 'hh-williams-001', { name: 'Medicare Supplement, Prescriptions', annualAmount: 18000, category: 'HEALTHCARE', isEssential: true }),
      exp('exp-williams-003', 'hh-williams-001', { name: 'Travel & Golf', annualAmount: 36000, category: 'TRAVEL' }),
      exp('exp-williams-004', 'hh-williams-001', { name: 'General Living', annualAmount: 42000, category: 'PERSONAL', isEssential: true }),
      exp('exp-williams-005', 'hh-williams-001', { name: 'Charitable Giving (QCD)', annualAmount: 30000, category: 'CHARITABLE' }),
    ],
    goals: [
      goal('goal-williams-001', 'hh-williams-001', { name: 'Minimize RMD Tax Impact', type: 'CUSTOM', targetAmount: 0, currentFunding: 0, targetYear: 2027, priority: 'ESSENTIAL', fundingStatus: 'ON_TRACK' }),
      goal('goal-williams-002', 'hh-williams-001', { name: 'Legacy Planning — Children', type: 'ESTATE_TRANSFER', targetAmount: 3000000, currentFunding: 2200000, targetYear: 2040, priority: 'ESSENTIAL' }),
      goal('goal-williams-003', 'hh-williams-001', { name: 'Long-Term Care Reserve', type: 'CUSTOM', targetAmount: 500000, currentFunding: 150000, targetYear: 2030, priority: 'IMPORTANT', fundingStatus: 'AT_RISK' }),
    ],
    debts: [],
    realEstate: [
      re('re-williams-001', 'hh-williams-001', 'mem-williams-001', {
        address: '891 Palm Beach Blvd, Boca Raton, FL 33432', estimatedValue: 950000,
        costBasis: 620000, mortgageBalance: 0, annualPropertyTax: 9500,
        isPrimaryResidence: true, purchaseDate: '2012-11-01',
      }),
    ],
    taxProfile: {
      householdId: householdId('hh-williams-001'), filingStatus: 'SINGLE',
      federalBracket: 0.32, stateBracket: 0, domicileState: 'FL',
      estimatedEffectiveRate: 0.223, estimatedAGI: 291000, estimatedTaxableIncome: 260000,
      amtExposure: false, niitExposure: true, qbiEligible: false,
      capitalLossCarryforward: 45000, charitableCarryforward: 0,
      lastTaxYearFiled: 2025, cpaName: null, cpaEmail: null,
    },
    estatePlan: {
      householdId: householdId('hh-williams-001'), status: 'CURRENT',
      hasWill: true, hasTrust: true, hasPoa: true, hasHealthcareDirective: true,
      estimatedGrossEstate: 6200000, estimatedEstateTax: 0,
      exemptionUsed: 0, remainingExemption: 13610000,
      trustNames: ['Williams Family Trust'],
      lastUpdated: '2025-09-01', attorneyName: 'Barron & Fields',
      attorneyEmail: 'estate@barronfields.com', notes: null,
    },
    createdAt: '2023-09-10T08:00:00.000Z', updatedAt: now,
  };
  const wRecalc = recomputeHouseholdMetrics(williams);
  Object.assign(williams, { totalAssets: wRecalc.totalAssets, totalLiabilities: wRecalc.totalLiabilities, netWorth: wRecalc.netWorth, totalAum: wRecalc.totalAum });
  households.set(williams.id, williams);
}

// =============================================================================
// Auto-seed on module load
// =============================================================================

seedDemoData();
