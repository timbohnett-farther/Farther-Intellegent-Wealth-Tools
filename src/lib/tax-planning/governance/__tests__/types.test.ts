// =============================================================================
// Governance, Compliance, & Admin Layer — Type Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import type {
  PlatformRole,
  PermissionPolicy,
  AccessScope,
  ApprovalPolicy,
  AIGovernancePolicy,
  TemplateGovernanceRecord,
  AdminSetting,
  ReviewQueueItem,
  GovernanceAuditEvent,
  FeatureFlag,
  AuthorizationDecision,
  SettingsResolutionResult,
} from '../types';

describe('Governance Types', () => {
  it('should create a valid PlatformRole', () => {
    const role: PlatformRole = {
      roleId: 'role-001',
      name: 'firm_admin',
      description: 'Full access',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(role.roleId).toBe('role-001');
    expect(role.status).toBe('active');
  });

  it('should create a valid PermissionPolicy', () => {
    const policy: PermissionPolicy = {
      policyId: 'policy-001',
      name: 'Admin Policy',
      roleIds: ['ADMIN'],
      permissions: ['households:read', 'households:write'],
      status: 'active',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(policy.permissions).toHaveLength(2);
    expect(policy.version).toBe(1);
  });

  it('should create a valid AccessScope', () => {
    const scope: AccessScope = {
      scopeId: 'scope-001',
      userId: 'user-001',
      scopeType: 'firm',
      scopeRefId: 'firm-001',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(scope.scopeType).toBe('firm');
    expect(scope.status).toBe('active');
  });

  it('should create a valid AuthorizationDecision', () => {
    const decision: AuthorizationDecision = {
      allowed: true,
      matchedRoleIds: ['ADMIN'],
      matchedPolicyIds: ['policy-001'],
      matchedScopeIds: ['scope-001'],
    };

    expect(decision.allowed).toBe(true);
    expect(decision.matchedRoleIds).toHaveLength(1);
  });

  it('should create a valid FeatureFlag', () => {
    const flag: FeatureFlag = {
      flagId: 'flag-001',
      key: 'new_feature',
      description: 'New feature toggle',
      enabled: true,
      targetingRules: { role: 'ADMIN' },
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(flag.enabled).toBe(true);
    expect(flag.status).toBe('active');
  });
});
