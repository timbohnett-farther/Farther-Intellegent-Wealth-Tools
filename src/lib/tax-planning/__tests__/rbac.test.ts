/**
 * Tests for tax-planning/rbac.ts
 *
 * Covers: hasPermission, requirePermission, getRolePermissions,
 * createMockToken, parseAuthContext.
 */

import { describe, it, expect } from 'vitest';

import {
  hasPermission,
  requirePermission,
  getRolePermissions,
  createMockToken,
  parseAuthContext,
} from '../rbac';

import type { Permission } from '../rbac';
import type { UserRole } from '../types';

// =============================================================================
// hasPermission
// =============================================================================

describe('hasPermission()', () => {
  it('grants ADMIN all permissions', () => {
    const all: Permission[] = [
      'households:read', 'households:write',
      'docs:read', 'docs:write',
      'returns:read', 'returns:write',
      'scenarios:read', 'scenarios:write',
      'compute:run', 'compute:read',
      'export:pdf',
      'admin:settings', 'admin:audit',
      'integrations:manage',
    ];
    for (const perm of all) {
      expect(hasPermission('ADMIN', perm)).toBe(true);
    }
  });

  it('grants ADVISOR household, doc, scenario, compute, returns, and export access', () => {
    expect(hasPermission('ADVISOR', 'households:read')).toBe(true);
    expect(hasPermission('ADVISOR', 'households:write')).toBe(true);
    expect(hasPermission('ADVISOR', 'scenarios:write')).toBe(true);
    expect(hasPermission('ADVISOR', 'compute:run')).toBe(true);
    expect(hasPermission('ADVISOR', 'export:pdf')).toBe(true);
  });

  it('denies ADVISOR admin permissions', () => {
    expect(hasPermission('ADVISOR', 'admin:settings')).toBe(false);
    expect(hasPermission('ADVISOR', 'admin:audit')).toBe(false);
    expect(hasPermission('ADVISOR', 'integrations:manage')).toBe(false);
  });

  it('gives PARAPLANNER a subset of ADVISOR permissions', () => {
    const advisorPerms = getRolePermissions('ADVISOR');
    const paraPerms = getRolePermissions('PARAPLANNER');
    // PARAPLANNER has a subset of ADVISOR permissions (no deliverables:approve, crm:write, cpa:write, governance:read, analytics:read)
    for (const perm of paraPerms) {
      expect(advisorPerms).toContain(perm);
    }
    expect(paraPerms.length).toBeLessThanOrEqual(advisorPerms.length);
  });

  it('denies OPS write access to households and scenarios', () => {
    expect(hasPermission('OPS', 'households:write')).toBe(false);
    expect(hasPermission('OPS', 'scenarios:write')).toBe(false);
    expect(hasPermission('OPS', 'compute:run')).toBe(false);
  });

  it('grants OPS audit log access', () => {
    expect(hasPermission('OPS', 'admin:audit')).toBe(true);
  });

  it('gives READONLY minimal read access', () => {
    expect(hasPermission('READONLY', 'households:read')).toBe(true);
    expect(hasPermission('READONLY', 'docs:read')).toBe(true);
    expect(hasPermission('READONLY', 'returns:read')).toBe(true);
    expect(hasPermission('READONLY', 'households:write')).toBe(false);
    expect(hasPermission('READONLY', 'scenarios:read')).toBe(false);
  });

  it('gives CLIENT limited access: household read, doc upload, export', () => {
    expect(hasPermission('CLIENT', 'households:read')).toBe(true);
    expect(hasPermission('CLIENT', 'docs:write')).toBe(true);
    expect(hasPermission('CLIENT', 'export:pdf')).toBe(true);
    expect(hasPermission('CLIENT', 'scenarios:read')).toBe(false);
    expect(hasPermission('CLIENT', 'admin:audit')).toBe(false);
  });
});

// =============================================================================
// requirePermission
// =============================================================================

describe('requirePermission()', () => {
  it('does not throw when role has the permission', () => {
    expect(() => requirePermission('ADMIN', 'households:read')).not.toThrow();
    expect(() => requirePermission('ADVISOR', 'compute:run')).not.toThrow();
  });

  it('throws when role lacks the permission', () => {
    expect(() => requirePermission('READONLY', 'households:write')).toThrow(
      'Authorization denied'
    );
  });

  it('throws if any of multiple required permissions are missing', () => {
    expect(() =>
      requirePermission('OPS', 'households:read', 'households:write')
    ).toThrow('Authorization denied');
  });

  it('passes if all multiple permissions are granted', () => {
    expect(() =>
      requirePermission('ADMIN', 'households:read', 'households:write', 'admin:settings')
    ).not.toThrow();
  });

  it('includes role and permission name in error message', () => {
    expect(() => requirePermission('CLIENT', 'admin:settings')).toThrow(
      /role "CLIENT".*"admin:settings"/
    );
  });
});

// =============================================================================
// getRolePermissions
// =============================================================================

describe('getRolePermissions()', () => {
  it('returns all 40 permissions for ADMIN', () => {
    expect(getRolePermissions('ADMIN')).toHaveLength(40);
  });

  it('returns 9 permissions for READONLY', () => {
    expect(getRolePermissions('READONLY')).toHaveLength(9);
  });

  it('returns 3 permissions for CLIENT', () => {
    expect(getRolePermissions('CLIENT')).toHaveLength(3);
  });

  it('returns an array (not undefined) for all valid roles', () => {
    const roles: UserRole[] = ['ADMIN', 'ADVISOR', 'PARAPLANNER', 'OPS', 'READONLY', 'CLIENT'];
    for (const role of roles) {
      expect(Array.isArray(getRolePermissions(role))).toBe(true);
    }
  });
});

// =============================================================================
// createMockToken / parseAuthContext
// =============================================================================

describe('createMockToken() + parseAuthContext()', () => {
  const mockUser = {
    user_id: 'user-001',
    firm_id: 'firm-001',
    role: 'ADVISOR' as UserRole,
    email: 'advisor@farther.com',
  };

  it('creates a token that can be parsed back', () => {
    const token = createMockToken(mockUser);
    const ctx = parseAuthContext(`Bearer ${token}`);

    expect(ctx).not.toBeNull();
    expect(ctx!.userId).toBe('user-001');
    expect(ctx!.firmId).toBe('firm-001');
    expect(ctx!.role).toBe('ADVISOR');
    expect(ctx!.email).toBe('advisor@farther.com');
  });

  it('token has three dot-separated segments', () => {
    const token = createMockToken(mockUser);
    expect(token.split('.')).toHaveLength(3);
  });

  it('returns null for null authHeader', () => {
    expect(parseAuthContext(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseAuthContext('')).toBeNull();
  });

  it('returns null for malformed header (no Bearer prefix)', () => {
    const token = createMockToken(mockUser);
    expect(parseAuthContext(token)).toBeNull();
  });

  it('returns null for invalid base64 payload', () => {
    expect(parseAuthContext('Bearer xxx.!!!invalid!!!.yyy')).toBeNull();
  });

  it('works for all valid roles', () => {
    const roles: UserRole[] = ['ADMIN', 'ADVISOR', 'PARAPLANNER', 'OPS', 'READONLY', 'CLIENT'];
    for (const role of roles) {
      const token = createMockToken({ ...mockUser, role });
      const ctx = parseAuthContext(`Bearer ${token}`);
      expect(ctx!.role).toBe(role);
    }
  });
});
