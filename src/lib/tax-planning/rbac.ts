// =============================================================================
// Tax Planning Platform — RBAC Middleware
// =============================================================================
//
// Role-based access control for the Farther Tax Planning Platform.
// Defines permission scopes, role-permission mappings, and authorization
// helpers used across all API routes and services.
// =============================================================================

import type { UserRole } from './types';

// ==================== Permission Scopes ====================

/**
 * Granular permission scopes for the tax planning platform.
 * Each scope follows the pattern `resource:action`.
 */
type Permission =
  | 'households:read'
  | 'households:write'
  | 'docs:read'
  | 'docs:write'
  | 'returns:read'
  | 'returns:write'
  | 'scenarios:read'
  | 'scenarios:write'
  | 'compute:run'
  | 'compute:read'
  | 'export:pdf'
  | 'admin:settings'
  | 'admin:audit'
  | 'integrations:manage'
  | 'copilot:ask'
  | 'copilot:read'
  | 'copilot:review'
  | 'copilot:admin'
  | 'deliverables:read'
  | 'deliverables:write'
  | 'deliverables:approve'
  | 'deliverables:export'
  | 'deliverables:admin';

// ==================== Role-Permission Matrix ====================

/**
 * Maps each UserRole to its set of allowed permissions.
 *
 * - ADMIN:       Full access to every scope.
 * - ADVISOR:     Full household, document, scenario, compute, return, and export access.
 * - PARAPLANNER: Same as advisor (supports advisor workflows).
 * - OPS:         Read-only households/returns, full document access, audit log visibility.
 * - READONLY:    Minimal read-only access to households, documents, and returns.
 * - CLIENT:      Limited household read, document upload, and shared deliverable export.
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'households:read',
    'households:write',
    'docs:read',
    'docs:write',
    'returns:read',
    'returns:write',
    'scenarios:read',
    'scenarios:write',
    'compute:run',
    'compute:read',
    'export:pdf',
    'admin:settings',
    'admin:audit',
    'integrations:manage',
    'copilot:ask',
    'copilot:read',
    'copilot:review',
    'copilot:admin',
    'deliverables:read',
    'deliverables:write',
    'deliverables:approve',
    'deliverables:export',
    'deliverables:admin',
  ],
  ADVISOR: [
    'households:read',
    'households:write',
    'docs:read',
    'docs:write',
    'returns:read',
    'returns:write',
    'scenarios:read',
    'scenarios:write',
    'compute:run',
    'compute:read',
    'export:pdf',
    'copilot:ask',
    'copilot:read',
    'copilot:review',
    'deliverables:read',
    'deliverables:write',
    'deliverables:approve',
    'deliverables:export',
  ],
  PARAPLANNER: [
    'households:read',
    'households:write',
    'docs:read',
    'docs:write',
    'returns:read',
    'returns:write',
    'scenarios:read',
    'scenarios:write',
    'compute:run',
    'compute:read',
    'export:pdf',
    'copilot:ask',
    'copilot:read',
    'copilot:review',
    'deliverables:read',
    'deliverables:write',
    'deliverables:export',
  ],
  OPS: [
    'households:read',
    'docs:read',
    'docs:write',
    'returns:read',
    'admin:audit',
    'copilot:read',
    'deliverables:read',
  ],
  READONLY: [
    'households:read',
    'docs:read',
    'returns:read',
    'copilot:read',
    'deliverables:read',
  ],
  CLIENT: [
    'households:read',
    'docs:write',
    'export:pdf',
  ],
};

// ==================== Authorization Helpers ====================

/**
 * Checks whether a given role has a specific permission.
 *
 * @param role - The user's role.
 * @param permission - The permission to check.
 * @returns `true` if the role grants the permission, `false` otherwise.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) {
    return false;
  }
  return allowed.includes(permission);
}

/**
 * Asserts that a role has every one of the listed permissions.
 * Throws an error describing the first missing permission if the check fails.
 *
 * @param role - The user's role.
 * @param permissions - One or more permissions that are all required.
 * @throws {Error} If the role lacks any of the requested permissions.
 */
export function requirePermission(role: UserRole, ...permissions: Permission[]): void {
  for (const permission of permissions) {
    if (!hasPermission(role, permission)) {
      throw new Error(
        `Authorization denied: role "${role}" does not have permission "${permission}".`
      );
    }
  }
}

/**
 * Returns the full list of permissions granted to a role.
 *
 * @param role - The user's role.
 * @returns An array of Permission strings. Returns an empty array for unknown roles.
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ==================== Auth Context ====================

/**
 * Represents the authenticated user context extracted from a JWT or session.
 * Attached to every authorized request for downstream authorization checks.
 */
export interface AuthContext {
  userId: string;
  firmId: string;
  role: UserRole;
  email: string;
}

// ==================== Token Helpers (Stage 1 Stubs) ====================

/**
 * Internal shape of the mock JWT payload.
 * In production this would be replaced by a real JWT library (e.g. jose).
 */
interface MockTokenPayload {
  sub: string;
  firm_id: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Creates a base64-encoded mock token for Stage 1 development.
 *
 * The token is NOT cryptographically signed -- it is a plain JSON payload
 * encoded as base64 so that it can be passed as a Bearer token in the
 * Authorization header.  Real JWT validation will be added in Stage 2.
 *
 * @param user - The user attributes to embed in the token.
 * @returns A string suitable for use as `Bearer <token>`.
 */
export function createMockToken(user: {
  user_id: string;
  firm_id: string;
  role: UserRole;
  email: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MockTokenPayload = {
    sub: user.user_id,
    firm_id: user.firm_id,
    role: user.role,
    email: user.email,
    iat: now,
    exp: now + 3600, // 1 hour expiry
  };

  // Mimic a three-part JWT structure: header.payload.signature
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'mock_signature';

  return `${header}.${body}.${signature}`;
}

/**
 * Parses an Authorization header value and extracts an {@link AuthContext}.
 *
 * Expects the header in the form `Bearer <token>` where `<token>` is a
 * mock JWT created by {@link createMockToken}.  Returns `null` for any
 * malformed, missing, or expired token.
 *
 * @param authHeader - The raw Authorization header value (may be null).
 * @returns The parsed AuthContext or null if parsing fails.
 */
export function parseAuthContext(authHeader: string | null): AuthContext | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  const token = parts[1];
  const segments = token.split('.');
  if (segments.length !== 3) {
    return null;
  }

  try {
    const decoded = Buffer.from(segments[1], 'base64url').toString('utf-8');
    const payload: MockTokenPayload = JSON.parse(decoded);

    // Validate required fields
    if (!payload.sub || !payload.firm_id || !payload.role || !payload.email) {
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    // Validate role is a known UserRole
    const validRoles: UserRole[] = ['ADMIN', 'ADVISOR', 'PARAPLANNER', 'OPS', 'READONLY', 'CLIENT'];
    if (!validRoles.includes(payload.role)) {
      return null;
    }

    return {
      userId: payload.sub,
      firmId: payload.firm_id,
      role: payload.role,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export type { Permission };
