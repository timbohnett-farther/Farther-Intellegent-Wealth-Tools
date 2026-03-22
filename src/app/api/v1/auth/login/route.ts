export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/auth/login
// =============================================================================
// Stage 1: Accepts any password, returns a mock JWT token.
// In production, this would validate credentials against a user store and
// issue real JWTs signed with a secret key.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type { LoginRequest, LoginResponse, ErrorEnvelope } from '@/lib/tax-planning/types';
import { store } from '@/lib/tax-planning/store';
import { createMockToken } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---------- Parse body ----------
  let body: LoginRequest;
  try {
    body = await request.json();
  } catch {
    const err: ErrorEnvelope = {
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON.',
        details: {},
        correlationId: crypto.randomUUID(),
      },
    };
    return NextResponse.json(err, { status: 400 });
  }

  // ---------- Validate required fields ----------
  if (!body.email || typeof body.email !== 'string') {
    const err: ErrorEnvelope = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Field "email" is required and must be a string.',
        details: { field: 'email' },
        correlationId: crypto.randomUUID(),
      },
    };
    return NextResponse.json(err, { status: 400 });
  }

  if (!body.password || typeof body.password !== 'string') {
    const err: ErrorEnvelope = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Field "password" is required and must be a string.',
        details: { field: 'password' },
        correlationId: crypto.randomUUID(),
      },
    };
    return NextResponse.json(err, { status: 400 });
  }

  // ---------- Lookup user ----------
  const user = store.getUserByEmail(body.email.toLowerCase());
  if (!user) {
    const err: ErrorEnvelope = {
      error: {
        code: 'AUTH_FAILED',
        message: 'Invalid email or password.',
        details: {},
        correlationId: crypto.randomUUID(),
      },
    };
    return NextResponse.json(err, { status: 401 });
  }

  // Stage 1: Accept any password
  // In Stage 2 this will validate password hashes

  // ---------- Generate tokens ----------
  const accessToken = createMockToken({
    user_id: user.user_id,
    firm_id: user.firm_id,
    role: user.role,
    email: user.email,
  });

  const refreshToken = `refresh_${crypto.randomUUID()}`;

  // ---------- Audit ----------
  auditService.emit({
    firmId: user.firm_id,
    userId: user.user_id,
    eventKey: 'auth.login',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: { email: user.email },
  });

  // ---------- Response ----------
  const response: LoginResponse = {
    accessToken,
    refreshToken,
    expiresIn: 3600,
    user: {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
    },
  };

  return NextResponse.json(response, { status: 200 });
}
