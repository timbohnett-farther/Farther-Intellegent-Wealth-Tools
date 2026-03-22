/**
 * Farther Unified Platform — Security Module Tests
 *
 * Tests for the household security module covering:
 * - PII classification
 * - Field masking
 * - Role-based access control
 * - Row-level security
 * - Authorization checks
 * - Data access audit log
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  classifyField,
  maskPII,
  canAccessField,
  getFieldClassifications,
  isAuthorizedForHousehold,
  applyRowLevelSecurity,
  auditDataAccess,
  getDataAccessLog,
  queryDataAccessLog,
  clearDataAccessLog,
} from '../security';
import type { SecurityRole } from '../security';
import type { PIIClassification, Household } from '../types';

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  clearDataAccessLog();
});

// =============================================================================
// PII Classification
// =============================================================================

describe('PII Classification', () => {
  it('classifies ssnLastFour as RESTRICTED', () => {
    expect(classifyField('members[].ssnLastFour')).toBe('RESTRICTED');
  });

  it('classifies email as CONFIDENTIAL', () => {
    expect(classifyField('members[].email')).toBe('CONFIDENTIAL');
  });

  it('classifies phoneMobile as CONFIDENTIAL', () => {
    expect(classifyField('members[].phoneMobile')).toBe('CONFIDENTIAL');
  });

  it('classifies dateOfBirth as RESTRICTED', () => {
    expect(classifyField('members[].dateOfBirth')).toBe('RESTRICTED');
  });

  it('classifies accountNumberLast4 as CONFIDENTIAL', () => {
    expect(classifyField('accounts[].accountNumberLast4')).toBe('CONFIDENTIAL');
  });

  it('classifies firstName as CONFIDENTIAL', () => {
    expect(classifyField('members[].firstName')).toBe('CONFIDENTIAL');
  });

  it('classifies currentBalance as CONFIDENTIAL', () => {
    expect(classifyField('accounts[].currentBalance')).toBe('CONFIDENTIAL');
  });

  it('classifies household name as INTERNAL', () => {
    expect(classifyField('name')).toBe('INTERNAL');
  });

  it('classifies status as INTERNAL', () => {
    expect(classifyField('status')).toBe('INTERNAL');
  });

  it('classifies unknown fields as INTERNAL by default', () => {
    expect(classifyField('someRandomField')).toBe('INTERNAL');
  });

  it('classifies createdAt as PUBLIC', () => {
    expect(classifyField('createdAt')).toBe('PUBLIC');
  });

  it('classifies totalAssets as CONFIDENTIAL', () => {
    expect(classifyField('totalAssets')).toBe('CONFIDENTIAL');
  });

  it('classifies estimatedAGI as RESTRICTED', () => {
    expect(classifyField('taxProfile.estimatedAGI')).toBe('RESTRICTED');
  });
});

// =============================================================================
// Field Masking
// =============================================================================

describe('Field masking (maskPII)', () => {
  it('masks RESTRICTED values completely', () => {
    const masked = maskPII('1234', 'RESTRICTED');
    expect(masked).toBe('****');
  });

  it('partially masks CONFIDENTIAL values', () => {
    const masked = maskPII('john@example.com', 'CONFIDENTIAL');
    expect(masked[0]).toBe('j');
    expect(masked[masked.length - 1]).toBe('m');
    expect(masked).toContain('*');
  });

  it('does not mask PUBLIC values', () => {
    const masked = maskPII('Active', 'PUBLIC');
    expect(masked).toBe('Active');
  });

  it('does not mask INTERNAL values', () => {
    const masked = maskPII('The Johnsons', 'INTERNAL');
    expect(masked).toBe('The Johnsons');
  });

  it('handles short strings for CONFIDENTIAL masking', () => {
    const masked = maskPII('ab', 'CONFIDENTIAL');
    expect(masked).toBe('**');
  });

  it('handles empty strings', () => {
    const masked = maskPII('', 'RESTRICTED');
    expect(masked).toBe('');
  });
});

// =============================================================================
// Role-Based Access Control
// =============================================================================

describe('canAccessField()', () => {
  it('ADMIN can access RESTRICTED fields', () => {
    expect(canAccessField('ADMIN', 'RESTRICTED')).toBe(true);
  });

  it('ADMIN can access CONFIDENTIAL fields', () => {
    expect(canAccessField('ADMIN', 'CONFIDENTIAL')).toBe(true);
  });

  it('ADVISOR can access RESTRICTED fields', () => {
    expect(canAccessField('ADVISOR', 'RESTRICTED')).toBe(true);
  });

  it('ADVISOR can access CONFIDENTIAL fields', () => {
    expect(canAccessField('ADVISOR', 'CONFIDENTIAL')).toBe(true);
  });

  it('PARAPLANNER can access CONFIDENTIAL fields', () => {
    expect(canAccessField('PARAPLANNER', 'CONFIDENTIAL')).toBe(true);
  });

  it('PARAPLANNER cannot access RESTRICTED fields', () => {
    expect(canAccessField('PARAPLANNER', 'RESTRICTED')).toBe(false);
  });

  it('READONLY can access INTERNAL fields', () => {
    expect(canAccessField('READONLY', 'INTERNAL')).toBe(true);
  });

  it('READONLY cannot access CONFIDENTIAL fields', () => {
    expect(canAccessField('READONLY', 'CONFIDENTIAL')).toBe(false);
  });

  it('CLIENT can access CONFIDENTIAL fields', () => {
    expect(canAccessField('CLIENT', 'CONFIDENTIAL')).toBe(true);
  });

  it('CLIENT cannot access RESTRICTED fields', () => {
    expect(canAccessField('CLIENT', 'RESTRICTED')).toBe(false);
  });

  it('OPS can access CONFIDENTIAL fields', () => {
    expect(canAccessField('OPS', 'CONFIDENTIAL')).toBe(true);
  });

  it('all roles can access PUBLIC fields', () => {
    const roles: SecurityRole[] = ['ADMIN', 'ADVISOR', 'PARAPLANNER', 'OPS', 'READONLY', 'CLIENT'];
    for (const role of roles) {
      expect(canAccessField(role, 'PUBLIC')).toBe(true);
    }
  });
});

// =============================================================================
// Row-Level Security (Household Authorization)
// =============================================================================

describe('isAuthorizedForHousehold()', () => {
  // Helper to create a minimal household for testing
  function makeHousehold(overrides: Partial<Household> = {}): Household {
    return {
      id: 'hh-001' as any,
      firmId: 'firm-001',
      advisorId: 'adv-001',
      name: 'Test Household',
      status: 'ACTIVE',
      wealthTier: 'HNW',
      externalCrmId: null,
      members: [
        {
          id: 'mem-001' as any,
          householdId: 'hh-001' as any,
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
          domicileState: 'NY',
          employmentStatus: 'EMPLOYED',
          employerName: null,
          occupation: null,
          isActive: true,
          retirementAge: null,
          lifeExpectancy: null,
          healthStatus: null,
        },
      ],
      accounts: [],
      income: [],
      expenses: [],
      goals: [],
      debts: [],
      realEstate: [],
      taxProfile: null,
      estatePlan: null,
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0,
      totalAum: 0,
      tags: [],
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastReviewedAt: null,
      nextReviewAt: null,
      dataOwner: 'ADVISOR',
      lastSyncedAt: null,
      version: 1,
      ...overrides,
    } as Household;
  }

  it('ADMIN can access any household in their firm', () => {
    const hh = makeHousehold({ firmId: 'firm-001', advisorId: 'adv-999' });
    expect(isAuthorizedForHousehold('firm-001', 'user-001', hh, 'ADMIN')).toBe(true);
  });

  it('ADMIN cannot access households in other firms', () => {
    const hh = makeHousehold({ firmId: 'firm-002' });
    expect(isAuthorizedForHousehold('firm-001', 'user-001', hh, 'ADMIN')).toBe(false);
  });

  it('ADVISOR can access own households within the same firm', () => {
    const hh = makeHousehold({ firmId: 'firm-001', advisorId: 'adv-001' });
    expect(isAuthorizedForHousehold('firm-001', 'adv-001', hh, 'ADVISOR')).toBe(true);
  });

  it('ADVISOR cannot access other advisor households', () => {
    const hh = makeHousehold({ firmId: 'firm-001', advisorId: 'adv-002' });
    expect(isAuthorizedForHousehold('firm-001', 'adv-001', hh, 'ADVISOR')).toBe(false);
  });

  it('CLIENT can access household where they are a member', () => {
    const hh = makeHousehold({
      id: 'hh-001' as any,
      firmId: 'firm-001',
      members: [{
        id: 'cli-001' as any,
        householdId: 'hh-001' as any,
        role: 'PRIMARY',
        relationship: 'SELF',
        firstName: 'Client',
        middleName: null,
        lastName: 'User',
        preferredName: null,
        dateOfBirth: '1990-01-01',
        gender: null,
        email: null,
        phoneMobile: null,
        ssnLastFour: null,
        citizenship: 'US',
        domicileState: 'NY',
        employmentStatus: 'EMPLOYED',
        employerName: null,
        occupation: null,
        isActive: true,
        retirementAge: null,
        lifeExpectancy: null,
        healthStatus: null,
      }],
    });
    expect(isAuthorizedForHousehold('firm-001', 'cli-001', hh, 'CLIENT')).toBe(true);
  });

  it('CLIENT cannot access other households', () => {
    const hh = makeHousehold({ firmId: 'firm-001' });
    expect(isAuthorizedForHousehold('firm-001', 'cli-999', hh, 'CLIENT')).toBe(false);
  });

  it('OPS can access all households within the same firm', () => {
    const hh = makeHousehold({ firmId: 'firm-001' });
    expect(isAuthorizedForHousehold('firm-001', 'ops-001', hh, 'OPS')).toBe(true);
  });

  it('OPS cannot access households in other firms', () => {
    const hh = makeHousehold({ firmId: 'firm-002' });
    expect(isAuthorizedForHousehold('firm-001', 'ops-001', hh, 'OPS')).toBe(false);
  });

  it('PARAPLANNER can access households in same firm', () => {
    const hh = makeHousehold({ firmId: 'firm-001' });
    expect(isAuthorizedForHousehold('firm-001', 'pp-001', hh, 'PARAPLANNER')).toBe(true);
  });

  it('READONLY can access households in same firm', () => {
    const hh = makeHousehold({ firmId: 'firm-001' });
    expect(isAuthorizedForHousehold('firm-001', 'ro-001', hh, 'READONLY')).toBe(true);
  });
});

// =============================================================================
// Row-Level Security (Field Redaction)
// =============================================================================

describe('applyRowLevelSecurity()', () => {
  function makeHouseholdForRedaction(): Household {
    return {
      id: 'hh-001' as any,
      firmId: 'firm-001',
      advisorId: 'adv-001',
      name: 'The Johnsons',
      status: 'ACTIVE',
      wealthTier: 'UHNW',
      externalCrmId: null,
      members: [
        {
          id: 'mem-001' as any,
          householdId: 'hh-001' as any,
          role: 'PRIMARY',
          relationship: 'SELF',
          firstName: 'Richard',
          middleName: null,
          lastName: 'Johnson',
          preferredName: null,
          dateOfBirth: '1963-04-15',
          gender: 'Male',
          email: 'richard@email.com',
          phoneMobile: '203-555-0101',
          ssnLastFour: '4567',
          citizenship: 'US',
          domicileState: 'CT',
          employmentStatus: 'EMPLOYED',
          employerName: 'Acme Corp',
          occupation: 'CEO',
          isActive: true,
          retirementAge: 65,
          lifeExpectancy: 90,
          healthStatus: 'GOOD',
        },
      ],
      accounts: [
        {
          id: 'acc-001' as any,
          householdId: 'hh-001' as any,
          ownerId: 'mem-001' as any,
          coOwnerId: null,
          name: 'Richard IRA',
          institution: 'Schwab',
          custodian: 'SCHWAB',
          accountNumberLast4: '4567',
          accountType: 'IRA_TRADITIONAL',
          registration: 'INDIVIDUAL',
          taxBucket: 'TAX_DEFERRED',
          currentBalance: 3200000,
          costBasis: 1500000,
          unrealizedGain: 1700000,
          equityPct: 0.6,
          bondPct: 0.3,
          cashPct: 0.1,
          alternativePct: null,
          ytdReturn: 0.08,
          inceptionReturn: 0.10,
          isManagedByFarther: true,
          isHeldAway: false,
          lastSyncedAt: null,
          balanceAsOf: '2026-01-01',
          isActive: true,
        },
      ],
      income: [],
      expenses: [],
      goals: [],
      debts: [],
      realEstate: [],
      taxProfile: null,
      estatePlan: null,
      totalAssets: 3200000,
      totalLiabilities: 0,
      netWorth: 3200000,
      totalAum: 3200000,
      tags: [],
      notes: 'VIP client',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastReviewedAt: null,
      nextReviewAt: null,
      dataOwner: 'ADVISOR',
      lastSyncedAt: null,
      version: 1,
    } as Household;
  }

  it('ADMIN sees all fields unredacted', () => {
    const hh = makeHouseholdForRedaction();
    const redacted = applyRowLevelSecurity(hh, 'ADMIN', 'user-001');
    expect(redacted.members[0].ssnLastFour).toBe('4567');
    expect(redacted.members[0].email).toBe('richard@email.com');
    expect(redacted.accounts[0].accountNumberLast4).toBe('4567');
  });

  it('ADVISOR sees all fields unredacted', () => {
    const hh = makeHouseholdForRedaction();
    const redacted = applyRowLevelSecurity(hh, 'ADVISOR', 'adv-001');
    expect(redacted.members[0].ssnLastFour).toBe('4567');
    expect(redacted.members[0].email).toBe('richard@email.com');
  });

  it('PARAPLANNER has RESTRICTED fields redacted', () => {
    const hh = makeHouseholdForRedaction();
    const redacted = applyRowLevelSecurity(hh, 'PARAPLANNER', 'pp-001');
    expect(redacted.members[0].ssnLastFour).toBeNull();
    expect(redacted.members[0].dateOfBirth).toBe('****-**-**');
    expect(redacted.members[0].healthStatus).toBeNull();
  });

  it('READONLY has financial fields redacted', () => {
    const hh = makeHouseholdForRedaction();
    const redacted = applyRowLevelSecurity(hh, 'READONLY', 'ro-001');
    expect(redacted.totalAssets).toBe(0);
    expect(redacted.totalLiabilities).toBe(0);
    expect(redacted.netWorth).toBe(0);
    expect(redacted.notes).toBeNull();
  });

  it('preserves household name for all roles', () => {
    const hh = makeHouseholdForRedaction();
    const roles: SecurityRole[] = ['ADMIN', 'ADVISOR', 'PARAPLANNER', 'OPS', 'READONLY', 'CLIENT'];
    for (const role of roles) {
      const redacted = applyRowLevelSecurity(hh, role, 'user-001');
      expect(redacted.name).toBe('The Johnsons');
    }
  });
});

// =============================================================================
// Field Classifications Registry
// =============================================================================

describe('getFieldClassifications()', () => {
  it('returns a complete registry of field classifications', () => {
    const classifications = getFieldClassifications();
    expect(classifications['members[].ssnLastFour']).toBe('RESTRICTED');
    expect(classifications['members[].email']).toBe('CONFIDENTIAL');
    expect(classifications['createdAt']).toBe('PUBLIC');
    expect(classifications['name']).toBe('INTERNAL');
  });
});

// =============================================================================
// Data Access Audit Log
// =============================================================================

describe('Data access audit log', () => {
  it('records data access events', () => {
    auditDataAccess('user-001', 'hh-001', ['name', 'members[].email']);
    const log = getDataAccessLog();
    expect(log.length).toBe(1);
    expect(log[0].userId).toBe('user-001');
    expect(log[0].householdId).toBe('hh-001');
    expect(log[0].fieldsAccessed).toContain('name');
  });

  it('marks access as masked when restricted fields are accessed', () => {
    auditDataAccess('user-001', 'hh-001', ['members[].ssnLastFour']);
    const log = getDataAccessLog();
    expect(log[0].wasMasked).toBe(true);
  });

  it('marks access as not masked when no restricted fields', () => {
    auditDataAccess('user-001', 'hh-001', ['name', 'status']);
    const log = getDataAccessLog();
    expect(log[0].wasMasked).toBe(false);
  });

  it('queries log by userId', () => {
    auditDataAccess('user-001', 'hh-001', ['name']);
    auditDataAccess('user-002', 'hh-001', ['name']);
    auditDataAccess('user-001', 'hh-002', ['name']);

    const filtered = queryDataAccessLog({ userId: 'user-001' });
    expect(filtered.length).toBe(2);
  });

  it('queries log by householdId', () => {
    auditDataAccess('user-001', 'hh-001', ['name']);
    auditDataAccess('user-002', 'hh-001', ['name']);
    auditDataAccess('user-001', 'hh-002', ['name']);

    const filtered = queryDataAccessLog({ householdId: 'hh-001' });
    expect(filtered.length).toBe(2);
  });

  it('clears the audit log', () => {
    auditDataAccess('user-001', 'hh-001', ['name']);
    expect(getDataAccessLog().length).toBe(1);
    clearDataAccessLog();
    expect(getDataAccessLog().length).toBe(0);
  });
});
