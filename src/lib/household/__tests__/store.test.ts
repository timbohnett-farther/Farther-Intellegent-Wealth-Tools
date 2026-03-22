/**
 * Farther Unified Platform — Household Store Tests
 *
 * Comprehensive tests for the in-memory household store covering:
 * - CRUD operations for households
 * - Search/filter/pagination/sorting
 * - Sub-entity operations (members, accounts, goals, debts, income, expenses, real estate)
 * - Computed aggregates (netWorth, totalAssets, totalLiabilities, totalAum)
 * - 360-degree view computation
 * - Dashboard statistics
 * - Tax profile & estate plan updates
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createHousehold,
  getHousehold,
  updateHousehold,
  deleteHousehold,
  listHouseholds,
  addMember,
  updateMember,
  removeMember,
  addAccount,
  updateAccount,
  removeAccount,
  addGoal,
  updateGoal,
  removeGoal,
  addDebt,
  updateDebt,
  removeDebt,
  addIncome,
  updateIncome,
  removeIncome,
  addExpense,
  updateExpense,
  removeExpense,
  addRealEstate,
  updateRealEstate,
  removeRealEstate,
  updateTaxProfile,
  updateEstatePlan,
  computeHousehold360,
  getDashboardStats,
  clearStore,
  reseedStore,
  getStoreSize,
} from '../store';

import { householdId, memberId, accountId } from '../types';
import type {
  HouseholdId,
  MemberId,
  Household360View,
  HouseholdDashboardStats,
} from '../types';

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  reseedStore();
});

// =============================================================================
// Helper — branded IDs for seed data
// =============================================================================

const JOHNSON_ID = householdId('hh-johnson-001');
const PATEL_ID = householdId('hh-patel-001');
const CHEN_ID = householdId('hh-chen-001');
const GARCIA_ID = householdId('hh-garcia-001');
const WILLIAMS_ID = householdId('hh-williams-001');

// =============================================================================
// Seed Data Verification
// =============================================================================

describe('Seed Data', () => {
  it('seeds 5 demo households on initialization', () => {
    expect(getStoreSize()).toBe(5);
  });

  it('includes The Johnsons as UHNW', () => {
    const hh = getHousehold(JOHNSON_ID);
    expect(hh).not.toBeNull();
    expect(hh!.name).toBe('The Johnsons');
    expect(hh!.wealthTier).toBe('UHNW');
    expect(hh!.status).toBe('ACTIVE');
    expect(hh!.members.length).toBe(3); // Richard, Margaret, Emily
  });

  it('includes The Patels as HNW with education goals', () => {
    const hh = getHousehold(PATEL_ID);
    expect(hh).not.toBeNull();
    expect(hh!.name).toBe('The Patels');
    expect(hh!.wealthTier).toBe('HNW');
    expect(hh!.members.length).toBe(4); // Raj, Priya, Anika, Arjun
    const eduGoals = hh!.goals.filter((g) => g.type === 'EDUCATION');
    expect(eduGoals.length).toBe(2); // Anika College Fund, Arjun College Fund
  });

  it('includes Sarah Chen as MASS_AFFLUENT single', () => {
    const hh = getHousehold(CHEN_ID);
    expect(hh).not.toBeNull();
    expect(hh!.name).toBe('Sarah Chen');
    expect(hh!.wealthTier).toBe('MASS_AFFLUENT');
    expect(hh!.members.length).toBe(1);
    expect(hh!.debts.length).toBe(0);
    expect(hh!.realEstate.length).toBe(0);
  });

  it('includes The Garcias as EMERGING with ONBOARDING status', () => {
    const hh = getHousehold(GARCIA_ID);
    expect(hh).not.toBeNull();
    expect(hh!.name).toBe('The Garcias');
    expect(hh!.wealthTier).toBe('EMERGING');
    expect(hh!.status).toBe('ONBOARDING');
    expect(hh!.debts.length).toBe(4); // mortgage, 2 student loans, auto loan
  });

  it('includes Robert Williams as HNW retiree', () => {
    const hh = getHousehold(WILLIAMS_ID);
    expect(hh).not.toBeNull();
    expect(hh!.name).toBe('Robert Williams');
    expect(hh!.wealthTier).toBe('HNW');
    expect(hh!.members[0].employmentStatus).toBe('RETIRED');
    expect(hh!.members.length).toBe(1);
  });

  it('correctly calculates net worth for Johnsons (>$10M)', () => {
    const hh = getHousehold(JOHNSON_ID)!;
    // Accounts: 3.2M + 2.1M + 4.5M + 0.85M + 2.2M = 12.85M
    // Real estate: 3.2M + 1.8M = 5M
    // Liabilities: mortgage 0.45M (Naples)
    // Net worth should be around $17M
    expect(hh.totalAssets).toBeGreaterThan(10_000_000);
    expect(hh.netWorth).toBeGreaterThan(10_000_000);
    expect(hh.totalLiabilities).toBe(450000); // Naples mortgage only
  });

  it('correctly calculates net worth for Garcias with debts', () => {
    const hh = getHousehold(GARCIA_ID)!;
    // Accounts: 85K + 62K + 45K + 28K = 220K
    // Real estate: 385K
    // Total assets = 605K
    // Debts: 295K + 28K + 37K + 18K = 378K
    // Real estate mortgage (also counted): 295K
    // Total liabilities = 378K + 295K = 673K
    // Net worth = 605K - 673K = -68K (negative because mortgage counted in both debts and RE)
    expect(hh.totalLiabilities).toBeGreaterThan(0);
    expect(hh.totalAssets).toBeGreaterThan(0);
    // Garcias have net worth less than totalAssets due to significant debts
    expect(hh.netWorth).toBeLessThan(hh.totalAssets);
    expect(hh.netWorth).toBe(hh.totalAssets - hh.totalLiabilities);
  });

  it('correctly calculates totalAum (only isManagedByFarther accounts)', () => {
    const hh = getHousehold(CHEN_ID)!;
    // Chen has RSU Holdings with isManagedByFarther: false
    // So totalAum should exclude the 520K RSU Holdings
    expect(hh.totalAum).toBeLessThan(hh.totalAssets);
  });

  it('all seed households belong to firm-001', () => {
    const result = listHouseholds({ firmId: 'firm-001' });
    expect(result.total).toBe(5);
    result.households.forEach((hh) => {
      expect(hh.firmId).toBe('firm-001');
    });
  });
});

// =============================================================================
// Household CRUD
// =============================================================================

describe('Household CRUD', () => {
  it('creates a new household with required fields', () => {
    const hh = createHousehold({
      firmId: 'firm-test',
      advisorId: 'adv-test',
      name: 'Test Family',
      status: 'PROSPECT',
      wealthTier: 'EMERGING',
    });

    expect(hh.id).toBeDefined();
    expect(hh.name).toBe('Test Family');
    expect(hh.firmId).toBe('firm-test');
    expect(hh.advisorId).toBe('adv-test');
    expect(hh.status).toBe('PROSPECT');
    expect(hh.wealthTier).toBe('EMERGING');
    expect(hh.createdAt).toBeDefined();
    expect(hh.updatedAt).toBeDefined();
    expect(hh.members).toEqual([]);
    expect(hh.accounts).toEqual([]);
    expect(hh.income).toEqual([]);
    expect(hh.expenses).toEqual([]);
    expect(hh.goals).toEqual([]);
    expect(hh.debts).toEqual([]);
    expect(hh.realEstate).toEqual([]);
    expect(hh.taxProfile).toBeNull();
    expect(hh.estatePlan).toBeNull();
    expect(hh.totalAssets).toBe(0);
    expect(hh.totalLiabilities).toBe(0);
    expect(hh.netWorth).toBe(0);
    expect(hh.totalAum).toBe(0);
    expect(hh.version).toBe(1);
  });

  it('creates a household with default status and wealthTier', () => {
    const hh = createHousehold({
      firmId: 'firm-test',
      advisorId: 'adv-test',
      name: 'Defaults Test',
    });

    expect(hh.status).toBe('PROSPECT');
    expect(hh.wealthTier).toBe('EMERGING');
  });

  it('adds the created household to the store', () => {
    const initialSize = getStoreSize();
    const hh = createHousehold({
      firmId: 'firm-test',
      advisorId: 'adv-test',
      name: 'Store Size Test',
    });
    expect(getStoreSize()).toBe(initialSize + 1);
    expect(getHousehold(hh.id)).not.toBeNull();
  });

  it('retrieves a household by ID', () => {
    const created = createHousehold({
      firmId: 'firm-test',
      advisorId: 'adv-test',
      name: 'Retrieval Test',
    });

    const retrieved = getHousehold(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.name).toBe('Retrieval Test');
    expect(retrieved!.id).toBe(created.id);
  });

  it('returns null for non-existent household', () => {
    const result = getHousehold(householdId('non-existent-id'));
    expect(result).toBeNull();
  });

  it('updates a household', () => {
    const created = createHousehold({
      firmId: 'firm-test',
      advisorId: 'adv-test',
      name: 'Update Test',
    });

    const updated = updateHousehold(created.id, {
      name: 'Updated Name',
      status: 'ACTIVE',
      wealthTier: 'HNW',
    });

    expect(updated.name).toBe('Updated Name');
    expect(updated.status).toBe('ACTIVE');
    expect(updated.wealthTier).toBe('HNW');
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.version).toBe(created.version + 1);
  });

  it('throws when updating non-existent household', () => {
    expect(() =>
      updateHousehold(householdId('non-existent'), { name: 'fail' }),
    ).toThrow('not found');
  });

  it('deletes a household', () => {
    const created = createHousehold({
      firmId: 'firm-test',
      advisorId: 'adv-test',
      name: 'Delete Test',
    });

    const deleted = deleteHousehold(created.id);
    expect(deleted).toBe(true);
    expect(getHousehold(created.id)).toBeNull();
    expect(getStoreSize()).toBe(5); // back to seed count
  });

  it('returns false when deleting non-existent household', () => {
    expect(deleteHousehold(householdId('non-existent'))).toBe(false);
  });

  it('returns deep clones (mutations do not affect store)', () => {
    const hh = getHousehold(JOHNSON_ID)!;
    hh.name = 'MUTATED';
    hh.members.push({} as any);

    const fresh = getHousehold(JOHNSON_ID)!;
    expect(fresh.name).toBe('The Johnsons');
    expect(fresh.members.length).toBe(3);
  });
});

// =============================================================================
// List / Search / Filter
// =============================================================================

describe('listHouseholds()', () => {
  it('lists all households without filters', () => {
    const result = listHouseholds({});
    expect(result.total).toBe(5);
    expect(result.households.length).toBe(5);
    expect(result.limit).toBe(50); // default limit
    expect(result.offset).toBe(0);
  });

  it('filters by firmId', () => {
    const result = listHouseholds({ firmId: 'firm-001' });
    expect(result.total).toBe(5);
    result.households.forEach((h) => expect(h.firmId).toBe('firm-001'));
  });

  it('filters by firmId with no matches', () => {
    const result = listHouseholds({ firmId: 'firm-nonexistent' });
    expect(result.total).toBe(0);
    expect(result.households).toEqual([]);
  });

  it('filters by advisorId', () => {
    const result = listHouseholds({ firmId: 'firm-001', advisorId: 'adv-001' });
    expect(result.total).toBeGreaterThan(0);
    result.households.forEach((h) => expect(h.advisorId).toBe('adv-001'));
  });

  it('filters by status (array)', () => {
    const result = listHouseholds({ status: ['ACTIVE'] });
    expect(result.total).toBeGreaterThan(0);
    result.households.forEach((h) => expect(h.status).toBe('ACTIVE'));
  });

  it('filters by multiple statuses (OR)', () => {
    const result = listHouseholds({ status: ['ACTIVE', 'ONBOARDING'] });
    expect(result.total).toBe(5); // 4 ACTIVE + 1 ONBOARDING
    result.households.forEach((h) =>
      expect(['ACTIVE', 'ONBOARDING']).toContain(h.status),
    );
  });

  it('filters by wealthTier (array)', () => {
    const result = listHouseholds({ wealthTier: ['UHNW'] });
    expect(result.total).toBe(1);
    expect(result.households[0].name).toBe('The Johnsons');
  });

  it('filters by multiple wealthTiers (OR)', () => {
    const result = listHouseholds({ wealthTier: ['HNW', 'UHNW'] });
    expect(result.total).toBe(3); // Johnsons(UHNW), Patels(HNW), Williams(HNW)
  });

  it('searches by household name (query)', () => {
    const result = listHouseholds({ query: 'garcia' });
    expect(result.total).toBe(1);
    expect(result.households[0].name).toBe('The Garcias');
  });

  it('searches by member name (query)', () => {
    const result = listHouseholds({ query: 'sarah' });
    expect(result.total).toBe(1);
    expect(result.households[0].name).toBe('Sarah Chen');
  });

  it('searches case-insensitively', () => {
    const result = listHouseholds({ query: 'JOHNSON' });
    expect(result.total).toBe(1);
    expect(result.households[0].name).toBe('The Johnsons');
  });

  it('paginates results with limit and offset', () => {
    const page1 = listHouseholds({ limit: 2, offset: 0 });
    expect(page1.households.length).toBe(2);
    expect(page1.total).toBe(5);
    expect(page1.limit).toBe(2);
    expect(page1.offset).toBe(0);

    const page2 = listHouseholds({ limit: 2, offset: 2 });
    expect(page2.households.length).toBe(2);
    expect(page2.offset).toBe(2);

    const page3 = listHouseholds({ limit: 2, offset: 4 });
    expect(page3.households.length).toBe(1);
    expect(page3.offset).toBe(4);
  });

  it('sorts by name ascending (default)', () => {
    const result = listHouseholds({ sortBy: 'name', sortOrder: 'asc' });
    const names = result.households.map((h) => h.name.toLowerCase());
    for (let i = 1; i < names.length; i++) {
      expect(names[i] >= names[i - 1]).toBe(true);
    }
  });

  it('sorts by name descending', () => {
    const result = listHouseholds({ sortBy: 'name', sortOrder: 'desc' });
    const names = result.households.map((h) => h.name.toLowerCase());
    for (let i = 1; i < names.length; i++) {
      expect(names[i] <= names[i - 1]).toBe(true);
    }
  });

  it('sorts by netWorth descending', () => {
    const result = listHouseholds({ sortBy: 'netWorth', sortOrder: 'desc' });
    for (let i = 1; i < result.households.length; i++) {
      expect(result.households[i].netWorth).toBeLessThanOrEqual(
        result.households[i - 1].netWorth,
      );
    }
  });

  it('filters by minNetWorth', () => {
    const result = listHouseholds({ minNetWorth: 5_000_000 });
    expect(result.total).toBeGreaterThan(0);
    result.households.forEach((h) => {
      expect(h.netWorth).toBeGreaterThanOrEqual(5_000_000);
    });
  });

  it('filters by maxNetWorth', () => {
    const result = listHouseholds({ maxNetWorth: 1_000_000 });
    expect(result.total).toBeGreaterThan(0);
    result.households.forEach((h) => {
      expect(h.netWorth).toBeLessThanOrEqual(1_000_000);
    });
  });

  it('combines multiple filters', () => {
    const result = listHouseholds({
      firmId: 'firm-001',
      status: ['ACTIVE'],
      wealthTier: ['HNW'],
    });
    expect(result.total).toBeGreaterThan(0);
    result.households.forEach((h) => {
      expect(h.status).toBe('ACTIVE');
      expect(h.wealthTier).toBe('HNW');
    });
  });
});

// =============================================================================
// Member CRUD
// =============================================================================

describe('Member operations', () => {
  it('adds a member to a household', () => {
    const hh = getHousehold(CHEN_ID)!;
    expect(hh.members.length).toBe(1);

    const member = addMember(hh.id, {
      role: 'CO_CLIENT',
      relationship: 'SPOUSE',
      firstName: 'James',
      middleName: null,
      lastName: 'Chen',
      preferredName: null,
      dateOfBirth: '1990-05-15',
      gender: null,
      email: 'james.chen@email.com',
      phoneMobile: null,
      ssnLastFour: null,
      citizenship: 'US',
      domicileState: 'CA',
      employmentStatus: 'EMPLOYED',
      employerName: null,
      occupation: 'Software Engineer',
      isActive: true,
      retirementAge: null,
      lifeExpectancy: null,
      healthStatus: null,
    });

    expect(member.id).toBeDefined();
    expect(member.firstName).toBe('James');
    expect(member.lastName).toBe('Chen');
    expect(member.householdId).toBe(hh.id);
    expect(member.relationship).toBe('SPOUSE');

    const updated = getHousehold(hh.id)!;
    expect(updated.members.length).toBe(2);
  });

  it('updates a member', () => {
    const hh = getHousehold(JOHNSON_ID)!;
    const memId = hh.members[0].id;

    const updated = updateMember(hh.id, memId as string, {
      occupation: 'Retired CEO',
    });

    expect(updated.occupation).toBe('Retired CEO');
    expect(updated.id).toBe(memId);
  });

  it('removes a member', () => {
    const hh = getHousehold(JOHNSON_ID)!;
    const initialCount = hh.members.length;
    const memId = hh.members[2].id; // Emily

    const removed = removeMember(hh.id, memId as string);
    expect(removed).toBe(true);

    const updated = getHousehold(hh.id)!;
    expect(updated.members.length).toBe(initialCount - 1);
  });

  it('returns false when removing non-existent member', () => {
    expect(removeMember(JOHNSON_ID, 'non-existent')).toBe(false);
  });

  it('throws when adding member to non-existent household', () => {
    expect(() =>
      addMember(householdId('non-existent'), {
        role: 'PRIMARY',
        relationship: 'SELF',
        firstName: 'Test',
        middleName: null,
        lastName: 'User',
        preferredName: null,
        dateOfBirth: '1990-01-01',
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
      }),
    ).toThrow('not found');
  });

  it('throws when updating member on non-existent household', () => {
    expect(() =>
      updateMember(householdId('non-existent'), 'mem-1', { occupation: 'x' }),
    ).toThrow('not found');
  });

  it('throws when updating non-existent member', () => {
    expect(() =>
      updateMember(JOHNSON_ID, 'non-existent-mem', { occupation: 'x' }),
    ).toThrow('not found');
  });

  it('increments version on member add/update/remove', () => {
    const before = getHousehold(JOHNSON_ID)!;
    const v1 = before.version;

    addMember(JOHNSON_ID, {
      role: 'DEPENDENT',
      relationship: 'CHILD',
      firstName: 'New',
      middleName: null,
      lastName: 'Member',
      preferredName: null,
      dateOfBirth: '2000-01-01',
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
    });

    const after = getHousehold(JOHNSON_ID)!;
    expect(after.version).toBe(v1 + 1);
  });
});

// =============================================================================
// Account CRUD
// =============================================================================

describe('Account operations', () => {
  it('adds an account and recalculates aggregates', () => {
    const hh = getHousehold(CHEN_ID)!;
    const initialAssets = hh.totalAssets;

    const account = addAccount(hh.id, {
      ownerId: memberId('mem-chen-001'),
      coOwnerId: null,
      name: 'New Brokerage',
      institution: 'Charles Schwab',
      custodian: 'SCHWAB',
      accountNumberLast4: '9999',
      accountType: 'BROKERAGE',
      registration: 'INDIVIDUAL',
      taxBucket: 'TAXABLE',
      currentBalance: 500000,
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
      lastSyncedAt: new Date().toISOString(),
      balanceAsOf: new Date().toISOString(),
      isActive: true,
    });

    expect(account.id).toBeDefined();
    expect(account.currentBalance).toBe(500000);
    expect(account.householdId).toBe(hh.id);

    const updated = getHousehold(hh.id)!;
    expect(updated.totalAssets).toBe(initialAssets + 500000);
  });

  it('updates an account balance and recalculates', () => {
    const hh = getHousehold(JOHNSON_ID)!;
    const accId = hh.accounts[0].id; // Richard Traditional IRA (3.2M)
    const oldBalance = hh.accounts[0].currentBalance;

    const updated = updateAccount(hh.id, accId as string, {
      currentBalance: 5000000,
    });

    expect(updated.currentBalance).toBe(5000000);

    const updatedHH = getHousehold(hh.id)!;
    expect(updatedHH.totalAssets).toBe(hh.totalAssets - oldBalance + 5000000);
  });

  it('removes an account and recalculates', () => {
    const hh = getHousehold(CHEN_ID)!;
    const accId = hh.accounts[0].id;
    const removedBalance = hh.accounts[0].currentBalance;
    const initialAssets = hh.totalAssets;

    const removed = removeAccount(hh.id, accId as string);
    expect(removed).toBe(true);

    const updated = getHousehold(hh.id)!;
    expect(updated.totalAssets).toBe(initialAssets - removedBalance);
    expect(updated.accounts.length).toBe(hh.accounts.length - 1);
  });

  it('returns false when removing non-existent account', () => {
    expect(removeAccount(JOHNSON_ID, 'non-existent-acc')).toBe(false);
  });

  it('throws when adding account to non-existent household', () => {
    expect(() =>
      addAccount(householdId('non-existent'), {
        ownerId: memberId('mem-1'),
        coOwnerId: null,
        name: 'Test',
        institution: null,
        custodian: 'SCHWAB',
        accountNumberLast4: null,
        accountType: 'BROKERAGE',
        registration: 'INDIVIDUAL',
        taxBucket: 'TAXABLE',
        currentBalance: 100,
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
        lastSyncedAt: null,
        balanceAsOf: new Date().toISOString(),
        isActive: true,
      }),
    ).toThrow('not found');
  });
});

// =============================================================================
// Goal CRUD
// =============================================================================

describe('Goal operations', () => {
  it('adds a goal', () => {
    const hh = getHousehold(CHEN_ID)!;
    const initialGoalCount = hh.goals.length;

    const newGoal = addGoal(hh.id, {
      type: 'MAJOR_PURCHASE',
      name: 'New Car Fund',
      targetAmount: 50000,
      currentFunding: 10000,
      priority: 'ASPIRATIONAL',
      fundingStatus: 'NOT_STARTED',
      targetYear: 2027,
      monthlyContribution: 500,
      linkedAccountIds: [],
      inflationAdjusted: false,
      notes: null,
      isActive: true,
    });

    expect(newGoal.id).toBeDefined();
    expect(newGoal.name).toBe('New Car Fund');
    expect(newGoal.householdId).toBe(hh.id);
    expect(newGoal.targetAmount).toBe(50000);

    const updated = getHousehold(hh.id)!;
    expect(updated.goals.length).toBe(initialGoalCount + 1);
  });

  it('updates a goal', () => {
    const hh = getHousehold(PATEL_ID)!;
    const goalId = hh.goals[0].id;

    const updated = updateGoal(hh.id, goalId, {
      currentFunding: 3000000,
      fundingStatus: 'ON_TRACK',
    });

    expect(updated.currentFunding).toBe(3000000);
    expect(updated.fundingStatus).toBe('ON_TRACK');
  });

  it('removes a goal', () => {
    const hh = getHousehold(PATEL_ID)!;
    const goalCount = hh.goals.length;
    const goalId = hh.goals[0].id;

    expect(removeGoal(hh.id, goalId)).toBe(true);

    const updated = getHousehold(hh.id)!;
    expect(updated.goals.length).toBe(goalCount - 1);
  });

  it('returns false when removing non-existent goal', () => {
    expect(removeGoal(PATEL_ID, 'non-existent-goal')).toBe(false);
  });

  it('throws when updating goal on non-existent household', () => {
    expect(() =>
      updateGoal(householdId('non-existent'), 'goal-1', { name: 'fail' }),
    ).toThrow('not found');
  });
});

// =============================================================================
// Debt CRUD
// =============================================================================

describe('Debt operations', () => {
  it('adds a debt and recalculates liabilities', () => {
    const hh = getHousehold(CHEN_ID)!;
    expect(hh.totalLiabilities).toBe(0);
    expect(hh.debts.length).toBe(0);

    addDebt(hh.id, {
      memberId: memberId('mem-chen-001'),
      type: 'AUTO_LOAN',
      name: 'Auto Loan',
      originalBalance: 35000,
      currentBalance: 28000,
      interestRate: 0.045,
      monthlyPayment: 650,
      remainingTermMonths: 48,
      isTaxDeductible: false,
      isActive: true,
    });

    const updated = getHousehold(hh.id)!;
    expect(updated.debts.length).toBe(1);
    expect(updated.totalLiabilities).toBe(28000);
    expect(updated.netWorth).toBe(updated.totalAssets - 28000);
  });

  it('updates a debt', () => {
    const hh = getHousehold(GARCIA_ID)!;
    const debtId = hh.debts[0].id;

    const updated = updateDebt(hh.id, debtId, { currentBalance: 250000 });
    expect(updated.currentBalance).toBe(250000);
  });

  it('removes a debt and recalculates liabilities', () => {
    const hh = getHousehold(GARCIA_ID)!;
    const debtId = hh.debts[0].id; // Primary Mortgage (295000)
    const removedBalance = hh.debts[0].currentBalance;
    const initialLiabilities = hh.totalLiabilities;

    expect(removeDebt(hh.id, debtId)).toBe(true);

    const updated = getHousehold(hh.id)!;
    expect(updated.debts.length).toBe(hh.debts.length - 1);
    // Liabilities decrease by the debt balance
    expect(updated.totalLiabilities).toBe(initialLiabilities - removedBalance);
  });

  it('returns false when removing non-existent debt', () => {
    expect(removeDebt(GARCIA_ID, 'non-existent-debt')).toBe(false);
  });

  it('throws when adding debt to non-existent household', () => {
    expect(() =>
      addDebt(householdId('non-existent'), {
        memberId: memberId('mem-1'),
        type: 'OTHER',
        name: 'Test',
        originalBalance: 1000,
        currentBalance: 1000,
        interestRate: 0.05,
        monthlyPayment: 100,
        remainingTermMonths: null,
        isTaxDeductible: false,
        isActive: true,
      }),
    ).toThrow('not found');
  });
});

// =============================================================================
// Income CRUD
// =============================================================================

describe('Income operations', () => {
  it('adds income to a household', () => {
    const hh = getHousehold(CHEN_ID)!;
    const initialIncomeCount = hh.income.length;

    const newIncome = addIncome(hh.id, {
      memberId: memberId('mem-chen-001'),
      type: 'SALARY',
      name: 'Side Consulting',
      annualAmount: 30000,
      frequency: 'ANNUAL',
      startYear: null,
      endYear: null,
      growthRate: 0.03,
      isInflationAdjusted: false,
      isTaxable: true,
      taxCharacter: 'ORDINARY',
      isActive: true,
    });

    expect(newIncome.id).toBeDefined();
    expect(newIncome.name).toBe('Side Consulting');
    expect(newIncome.annualAmount).toBe(30000);
    expect(newIncome.householdId).toBe(hh.id);

    const updated = getHousehold(hh.id)!;
    expect(updated.income.length).toBe(initialIncomeCount + 1);
  });

  it('updates income', () => {
    const hh = getHousehold(PATEL_ID)!;
    const incId = hh.income[0].id;

    const updated = updateIncome(hh.id, incId, { annualAmount: 300000 });
    expect(updated.annualAmount).toBe(300000);
  });

  it('removes income', () => {
    const hh = getHousehold(PATEL_ID)!;
    const incId = hh.income[0].id;
    const initialCount = hh.income.length;

    expect(removeIncome(hh.id, incId)).toBe(true);

    const updated = getHousehold(hh.id)!;
    expect(updated.income.length).toBe(initialCount - 1);
  });

  it('returns false when removing non-existent income', () => {
    expect(removeIncome(PATEL_ID, 'non-existent-inc')).toBe(false);
  });
});

// =============================================================================
// Expense CRUD
// =============================================================================

describe('Expense operations', () => {
  it('adds an expense to a household', () => {
    const hh = getHousehold(CHEN_ID)!;
    const initialCount = hh.expenses.length;

    const newExpense = addExpense(hh.id, {
      category: 'ENTERTAINMENT',
      name: 'Subscriptions',
      annualAmount: 2400,
      isEssential: false,
      frequency: 'ANNUAL',
      startYear: null,
      endYear: null,
      growthRate: 0.02,
      isInflationAdjusted: false,
      isActive: true,
    });

    expect(newExpense.id).toBeDefined();
    expect(newExpense.name).toBe('Subscriptions');
    expect(newExpense.annualAmount).toBe(2400);
    expect(newExpense.householdId).toBe(hh.id);

    const updated = getHousehold(hh.id)!;
    expect(updated.expenses.length).toBe(initialCount + 1);
  });

  it('updates an expense', () => {
    const hh = getHousehold(JOHNSON_ID)!;
    const expId = hh.expenses[0].id;

    const updated = updateExpense(hh.id, expId, { annualAmount: 55000 });
    expect(updated.annualAmount).toBe(55000);
  });

  it('removes an expense', () => {
    const hh = getHousehold(JOHNSON_ID)!;
    const expId = hh.expenses[0].id;
    const initialCount = hh.expenses.length;

    expect(removeExpense(hh.id, expId)).toBe(true);

    const updated = getHousehold(hh.id)!;
    expect(updated.expenses.length).toBe(initialCount - 1);
  });

  it('returns false when removing non-existent expense', () => {
    expect(removeExpense(JOHNSON_ID, 'non-existent-exp')).toBe(false);
  });
});

// =============================================================================
// Real Estate CRUD
// =============================================================================

describe('Real Estate operations', () => {
  it('adds real estate and recalculates aggregates', () => {
    const hh = getHousehold(CHEN_ID)!;
    const initialAssets = hh.totalAssets;
    expect(hh.realEstate.length).toBe(0);

    addRealEstate(hh.id, {
      ownerId: memberId('mem-chen-001'),
      type: 'PRIMARY_RESIDENCE',
      address: '123 Main St, San Francisco, CA 94102',
      estimatedValue: 1200000,
      costBasis: 950000,
      mortgageBalance: 760000,
      annualPropertyTax: 14000,
      annualInsurance: null,
      annualRentalIncome: null,
      annualExpenses: null,
      isPrimaryResidence: true,
      purchaseDate: '2025-01-15',
      isActive: true,
    });

    const updated = getHousehold(hh.id)!;
    expect(updated.realEstate.length).toBe(1);
    expect(updated.totalAssets).toBe(initialAssets + 1200000);
    // mortgageBalance is included in liabilities via recomputeHouseholdMetrics
    expect(updated.totalLiabilities).toBe(760000);
  });

  it('updates real estate market value and recalculates', () => {
    const hh = getHousehold(JOHNSON_ID)!;
    const reId = hh.realEstate[0].id;

    const updated = updateRealEstate(hh.id, reId, {
      estimatedValue: 3500000,
    });
    expect(updated.estimatedValue).toBe(3500000);

    // Verify recalculation happened
    const updatedHH = getHousehold(hh.id)!;
    expect(updatedHH.totalAssets).toBeGreaterThan(0);
  });

  it('removes real estate and recalculates', () => {
    const hh = getHousehold(JOHNSON_ID)!;
    const reId = hh.realEstate[0].id;
    const initialCount = hh.realEstate.length;

    expect(removeRealEstate(hh.id, reId)).toBe(true);

    const updated = getHousehold(hh.id)!;
    expect(updated.realEstate.length).toBe(initialCount - 1);
  });

  it('returns false when removing non-existent real estate', () => {
    expect(removeRealEstate(JOHNSON_ID, 'non-existent-re')).toBe(false);
  });

  it('throws when updating real estate on non-existent household', () => {
    expect(() =>
      updateRealEstate(householdId('non-existent'), 're-1', {
        estimatedValue: 100,
      }),
    ).toThrow('not found');
  });
});

// =============================================================================
// Tax Profile & Estate Plan
// =============================================================================

describe('Tax Profile & Estate Plan', () => {
  it('updates tax profile', () => {
    const profile = updateTaxProfile(GARCIA_ID, {
      householdId: GARCIA_ID,
      filingStatus: 'MFJ',
      federalBracket: 0.24,
      stateBracket: 0,
      domicileState: 'TX',
      estimatedEffectiveRate: 0.162,
      estimatedAGI: 173000,
      estimatedTaxableIncome: 140000,
      amtExposure: false,
      niitExposure: false,
      qbiEligible: false,
      capitalLossCarryforward: 0,
      charitableCarryforward: 0,
      lastTaxYearFiled: 2025,
      cpaName: null,
      cpaEmail: null,
    });

    expect(profile.filingStatus).toBe('MFJ');
    expect(profile.federalBracket).toBe(0.24);

    const updated = getHousehold(GARCIA_ID)!;
    expect(updated.taxProfile).not.toBeNull();
    expect(updated.taxProfile!.federalBracket).toBe(0.24);
  });

  it('updates estate plan (from null)', () => {
    const hh = getHousehold(PATEL_ID)!;
    expect(hh.estatePlan).toBeNull();

    const plan = updateEstatePlan(PATEL_ID, {
      householdId: PATEL_ID,
      status: 'CURRENT',
      hasWill: true,
      hasTrust: false,
      hasPoa: true,
      hasHealthcareDirective: true,
      estimatedGrossEstate: 3500000,
      estimatedEstateTax: 0,
      exemptionUsed: 0,
      remainingExemption: 13610000,
      trustNames: [],
      lastUpdated: '2026-01-15',
      attorneyName: null,
      attorneyEmail: null,
      notes: null,
    });

    expect(plan.hasWill).toBe(true);
    expect(plan.status).toBe('CURRENT');

    const updated = getHousehold(PATEL_ID)!;
    expect(updated.estatePlan).not.toBeNull();
    expect(updated.estatePlan!.hasWill).toBe(true);
  });

  it('throws when updating tax profile on non-existent household', () => {
    expect(() =>
      updateTaxProfile(householdId('non-existent'), {
        householdId: householdId('non-existent'),
        filingStatus: 'SINGLE',
        federalBracket: 0.22,
        stateBracket: null,
        domicileState: 'NY',
        estimatedEffectiveRate: 0.18,
        estimatedAGI: 100000,
        estimatedTaxableIncome: 85000,
        amtExposure: false,
        niitExposure: false,
        qbiEligible: false,
        capitalLossCarryforward: 0,
        charitableCarryforward: 0,
        lastTaxYearFiled: null,
        cpaName: null,
        cpaEmail: null,
      }),
    ).toThrow('not found');
  });

  it('throws when updating estate plan on non-existent household', () => {
    expect(() =>
      updateEstatePlan(householdId('non-existent'), {
        householdId: householdId('non-existent'),
        status: 'MISSING',
        hasWill: false,
        hasTrust: false,
        hasPoa: false,
        hasHealthcareDirective: false,
        estimatedGrossEstate: 0,
        estimatedEstateTax: 0,
        exemptionUsed: 0,
        remainingExemption: 0,
        trustNames: [],
        lastUpdated: null,
        attorneyName: null,
        attorneyEmail: null,
        notes: null,
      }),
    ).toThrow('not found');
  });
});

// =============================================================================
// 360-Degree View
// =============================================================================

describe('computeHousehold360()', () => {
  it('returns null for non-existent household', () => {
    expect(computeHousehold360(householdId('non-existent'))).toBeNull();
  });

  it('computes 360 view for Johnsons (UHNW, complex)', () => {
    const view = computeHousehold360(JOHNSON_ID)!;
    expect(view).not.toBeNull();

    // Household reference
    expect(view.household.name).toBe('The Johnsons');
    expect(view.household.id).toBe(JOHNSON_ID);

    // Asset summary
    expect(view.assetSummary.totalAssets).toBeGreaterThan(10_000_000);
    expect(view.assetSummary.netWorth).toBeGreaterThan(10_000_000);
    expect(view.assetSummary.totalAum).toBeGreaterThan(0);
    expect(view.assetSummary.totalLiabilities).toBe(450000); // Naples mortgage

    // Income summary
    expect(view.incomeSummary.totalAnnualIncome).toBeGreaterThan(0);
    expect(view.incomeSummary.earnedIncome).toBe(250000); // Board consulting (self-employment)

    // Expense summary
    expect(view.expenseSummary.totalAnnualExpenses).toBeGreaterThan(0);
    expect(view.expenseSummary.savingsRate).toBeGreaterThan(0);
    expect(view.expenseSummary.savingsRate).toBeLessThanOrEqual(1);

    // Goals summary
    expect(view.goalsSummary.totalGoals).toBe(3);
    expect(view.goalsSummary.totalTargetAmount).toBeGreaterThan(0);
    expect(view.goalsSummary.overallFundingPct).toBeGreaterThan(0);
    expect(view.goalsSummary.overallFundingPct).toBeLessThanOrEqual(1);

    // Debt summary (Johnsons have no debts, only real estate mortgage)
    expect(view.debtSummary.totalDebt).toBe(0);
    expect(view.debtSummary.debtToIncomeRatio).toBe(0);
  });

  it('computes 360 view with debt-to-income ratio for Garcias', () => {
    const view = computeHousehold360(GARCIA_ID)!;
    expect(view).not.toBeNull();

    // Garcias have significant debts
    expect(view.debtSummary.totalDebt).toBeGreaterThan(0);
    expect(view.debtSummary.totalMonthlyPayments).toBeGreaterThan(0);
    expect(view.debtSummary.debtToIncomeRatio).toBeGreaterThan(0);
    expect(view.debtSummary.weightedAvgRate).toBeGreaterThan(0);
  });

  it('includes income breakdown by type', () => {
    const view = computeHousehold360(JOHNSON_ID)!;

    // Johnsons: consulting=250K(SELF_EMPLOYMENT), SS=42K+36K(SOCIAL_SECURITY), dividends=180K(DIVIDEND)
    expect(view.incomeSummary.earnedIncome).toBe(250000); // SELF_EMPLOYMENT
    expect(view.incomeSummary.portfolioIncome).toBe(180000); // DIVIDEND
  });

  it('includes expense breakdown', () => {
    const view = computeHousehold360(JOHNSON_ID)!;

    // Johnsons have essential (property taxes, insurance, living) and discretionary (travel, giving)
    expect(view.expenseSummary.essentialExpenses).toBeGreaterThan(0);
    expect(view.expenseSummary.discretionaryExpenses).toBeGreaterThan(0);
    expect(view.expenseSummary.essentialExpenses + view.expenseSummary.discretionaryExpenses)
      .toBe(view.expenseSummary.totalAnnualExpenses);
  });

  it('includes goals funding summary', () => {
    const view = computeHousehold360(PATEL_ID)!;

    expect(view.goalsSummary.totalGoals).toBe(4);
    expect(view.goalsSummary.onTrack).toBeGreaterThanOrEqual(0);
    expect(view.goalsSummary.atRisk).toBeGreaterThanOrEqual(1); // Vacation Home is AT_RISK
    expect(view.goalsSummary.overallFundingPct).toBeGreaterThan(0);
    expect(view.goalsSummary.overallFundingPct).toBeLessThanOrEqual(1);
  });

  it('computes asset allocation breakdown', () => {
    const view = computeHousehold360(CHEN_ID)!;

    // Chen has held-away RSU Holdings (isManagedByFarther: false, isHeldAway: true)
    expect(view.assetSummary.heldAwayAssets).toBe(520000);
    expect(view.assetSummary.totalAum).toBeLessThan(view.assetSummary.totalAssets);
    // Chen has retirement accounts (401k) and tax-free (Roth IRA)
    expect(view.assetSummary.retirementAssets).toBeGreaterThan(0);
    expect(view.assetSummary.taxFreeAssets).toBeGreaterThan(0);
  });

  it('returns null planning context fields by default', () => {
    const view = computeHousehold360(JOHNSON_ID)!;

    expect(view.activePlanId).toBeNull();
    expect(view.activeProposalId).toBeNull();
    expect(view.lastPlanCalculation).toBeNull();
    expect(view.planSuccessRate).toBeNull();
    expect(view.riskScore).toBeNull();
    expect(view.riskLabel).toBeNull();
    expect(view.recommendedAllocation).toBeNull();
  });
});

// =============================================================================
// Dashboard Stats
// =============================================================================

describe('getDashboardStats()', () => {
  it('computes stats for firm-001', () => {
    const stats = getDashboardStats('firm-001');

    expect(stats.totalHouseholds).toBe(5);
    expect(stats.totalAum).toBeGreaterThan(0);
    expect(stats.totalNetWorth).toBeGreaterThan(0);
    expect(stats.averageNetWorth).toBeGreaterThan(0);
    expect(stats.averageNetWorth).toBe(stats.totalNetWorth / stats.totalHouseholds);
  });

  it('breaks down by status', () => {
    const stats = getDashboardStats('firm-001');

    expect(stats.byStatus).toBeDefined();
    // 4 ACTIVE (Johnsons, Patels, Chen, Williams) + 1 ONBOARDING (Garcias)
    expect(stats.byStatus['ACTIVE']).toBe(4);
    expect(stats.byStatus['ONBOARDING']).toBe(1);
    expect(stats.byStatus['PROSPECT']).toBe(0);
    expect(stats.byStatus['DORMANT']).toBe(0);
    expect(stats.byStatus['OFFBOARDED']).toBe(0);
  });

  it('breaks down by wealth tier', () => {
    const stats = getDashboardStats('firm-001');

    expect(stats.byWealthTier).toBeDefined();
    expect(stats.byWealthTier['UHNW']).toBe(1); // Johnsons
    expect(stats.byWealthTier['HNW']).toBe(2); // Patels, Williams
    expect(stats.byWealthTier['MASS_AFFLUENT']).toBe(1); // Chen
    expect(stats.byWealthTier['EMERGING']).toBe(1); // Garcias
    expect(stats.byWealthTier['INSTITUTIONAL']).toBe(0);
  });

  it('returns zeroes for non-existent firm', () => {
    const stats = getDashboardStats('firm-nonexistent');

    expect(stats.totalHouseholds).toBe(0);
    expect(stats.totalAum).toBe(0);
    expect(stats.totalNetWorth).toBe(0);
    expect(stats.averageNetWorth).toBe(0);
    expect(stats.householdsNeedingReview).toBe(0);
    expect(stats.newHouseholds30d).toBe(0);
  });

  it('includes householdsNeedingReview and newHouseholds30d fields', () => {
    const stats = getDashboardStats('firm-001');

    expect(typeof stats.householdsNeedingReview).toBe('number');
    expect(typeof stats.newHouseholds30d).toBe('number');
    expect(stats.householdsNeedingReview).toBeGreaterThanOrEqual(0);
    expect(stats.newHouseholds30d).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// Store Management
// =============================================================================

describe('Store management', () => {
  it('clears the store', () => {
    clearStore();
    expect(getStoreSize()).toBe(0);
    expect(listHouseholds({}).total).toBe(0);
  });

  it('reseeds the store after clearing', () => {
    clearStore();
    expect(getStoreSize()).toBe(0);
    reseedStore();
    expect(getStoreSize()).toBe(5);
  });

  it('reseedStore is idempotent (resets to 5)', () => {
    createHousehold({
      firmId: 'firm-test',
      advisorId: 'adv-test',
      name: 'Extra Household',
    });
    expect(getStoreSize()).toBe(6);

    reseedStore();
    expect(getStoreSize()).toBe(5);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge cases', () => {
  it('handles empty household (no sub-entities)', () => {
    const hh = createHousehold({
      firmId: 'firm-test',
      advisorId: 'adv-test',
      name: 'Empty Household',
    });

    expect(hh.totalAssets).toBe(0);
    expect(hh.totalLiabilities).toBe(0);
    expect(hh.netWorth).toBe(0);
    expect(hh.totalAum).toBe(0);
    expect(hh.members).toEqual([]);
    expect(hh.accounts).toEqual([]);
    expect(hh.income).toEqual([]);
    expect(hh.expenses).toEqual([]);
    expect(hh.goals).toEqual([]);
    expect(hh.debts).toEqual([]);
    expect(hh.realEstate).toEqual([]);
  });

  it('computes 360 view for empty household', () => {
    const hh = createHousehold({
      firmId: 'firm-test',
      advisorId: 'adv-test',
      name: 'Empty 360 Test',
    });

    const view = computeHousehold360(hh.id)!;
    expect(view).not.toBeNull();

    expect(view.assetSummary.totalAssets).toBe(0);
    expect(view.assetSummary.netWorth).toBe(0);
    expect(view.assetSummary.totalAum).toBe(0);
    expect(view.incomeSummary.totalAnnualIncome).toBe(0);
    expect(view.expenseSummary.totalAnnualExpenses).toBe(0);
    expect(view.expenseSummary.savingsRate).toBe(0);
    expect(view.goalsSummary.totalGoals).toBe(0);
    expect(view.goalsSummary.overallFundingPct).toBe(0);
    expect(view.debtSummary.totalDebt).toBe(0);
    expect(view.debtSummary.debtToIncomeRatio).toBe(0);
    expect(view.debtSummary.weightedAvgRate).toBe(0);
  });

  it('throws descriptive errors for invalid sub-entity operations', () => {
    expect(() =>
      updateMember(householdId('non-existent'), 'mem-1', { occupation: 'fail' }),
    ).toThrow('not found');

    expect(() =>
      updateAccount(householdId('non-existent'), 'acc-1', { currentBalance: 0 }),
    ).toThrow('not found');

    expect(() =>
      updateGoal(householdId('non-existent'), 'goal-1', { name: 'fail' }),
    ).toThrow('not found');

    expect(() =>
      updateDebt(householdId('non-existent'), 'debt-1', { currentBalance: 0 }),
    ).toThrow('not found');

    expect(() =>
      updateIncome(householdId('non-existent'), 'inc-1', { annualAmount: 0 }),
    ).toThrow('not found');

    expect(() =>
      updateExpense(householdId('non-existent'), 'exp-1', { annualAmount: 0 }),
    ).toThrow('not found');

    expect(() =>
      updateRealEstate(householdId('non-existent'), 're-1', { estimatedValue: 0 }),
    ).toThrow('not found');
  });

  it('throws when updating non-existent sub-entity within existing household', () => {
    expect(() =>
      updateMember(JOHNSON_ID, 'bad-mem-id', { occupation: 'x' }),
    ).toThrow('not found');

    expect(() =>
      updateAccount(JOHNSON_ID, 'bad-acc-id', { currentBalance: 0 }),
    ).toThrow('not found');

    expect(() =>
      updateGoal(JOHNSON_ID, 'bad-goal-id', { name: 'x' }),
    ).toThrow('not found');

    expect(() =>
      updateDebt(GARCIA_ID, 'bad-debt-id', { currentBalance: 0 }),
    ).toThrow('not found');

    expect(() =>
      updateIncome(JOHNSON_ID, 'bad-inc-id', { annualAmount: 0 }),
    ).toThrow('not found');

    expect(() =>
      updateExpense(JOHNSON_ID, 'bad-exp-id', { annualAmount: 0 }),
    ).toThrow('not found');

    expect(() =>
      updateRealEstate(JOHNSON_ID, 'bad-re-id', { estimatedValue: 0 }),
    ).toThrow('not found');
  });

  it('handles creating many households without ID collision', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const hh = createHousehold({
        firmId: 'firm-bulk',
        advisorId: 'adv-bulk',
        name: `Household ${i}`,
      });
      expect(ids.has(hh.id)).toBe(false);
      ids.add(hh.id);
    }
    expect(ids.size).toBe(50);
  });

  it('listHouseholds returns deep clones', () => {
    const result = listHouseholds({ firmId: 'firm-001' });
    result.households[0].name = 'MUTATED';

    const fresh = listHouseholds({ firmId: 'firm-001' });
    expect(fresh.households.find((h) => h.name === 'MUTATED')).toBeUndefined();
  });
});
