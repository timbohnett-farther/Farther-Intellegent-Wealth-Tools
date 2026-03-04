export const dynamic = 'force-dynamic';
// =============================================================================
// GET    /api/v1/household/:id  - Get household by ID
// PATCH  /api/v1/household/:id  - Update household
// DELETE /api/v1/household/:id  - Delete household
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getHousehold,
  updateHousehold,
  deleteHousehold,
} from '@/lib/household/store';
import { householdId } from '@/lib/household/types';
import type { HouseholdStatus, WealthTier } from '@/lib/household/types';

// ==================== Helpers ====================

function errorResponse(
  code: string,
  message: string,
  status: number,
  details: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
        correlationId: crypto.randomUUID(),
      },
    },
    { status },
  );
}

type RouteParams = { params: Promise<{ id: string }> };

const VALID_STATUSES: HouseholdStatus[] = [
  'PROSPECT',
  'ONBOARDING',
  'ACTIVE',
  'DORMANT',
  'OFFBOARDED',
];

const VALID_WEALTH_TIERS: WealthTier[] = [
  'EMERGING',
  'MASS_AFFLUENT',
  'HNW',
  'UHNW',
  'INSTITUTIONAL',
];

// ==================== GET ====================

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const hhId = householdId(id);

  const household = getHousehold(hhId);
  if (!household) {
    return errorResponse(
      'NOT_FOUND',
      `Household "${id}" not found.`,
      404,
      { resource: 'Household', id },
    );
  }

  return NextResponse.json(household);
}

// ==================== PATCH ====================

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const hhId = householdId(id);

  // Verify existence
  const existing = getHousehold(hhId);
  if (!existing) {
    return errorResponse(
      'NOT_FOUND',
      `Household "${id}" not found.`,
      404,
      { resource: 'Household', id },
    );
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // Validate
  const errors: Record<string, string> = {};

  if (body.name !== undefined && typeof body.name !== 'string') {
    errors.name = 'name must be a string.';
  }

  if (
    body.status !== undefined &&
    !VALID_STATUSES.includes(body.status as HouseholdStatus)
  ) {
    errors.status = `status must be one of: ${VALID_STATUSES.join(', ')}.`;
  }

  if (
    body.wealthTier !== undefined &&
    !VALID_WEALTH_TIERS.includes(body.wealthTier as WealthTier)
  ) {
    errors.wealthTier = `wealthTier must be one of: ${VALID_WEALTH_TIERS.join(', ')}.`;
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(
      'VALIDATION_ERROR',
      'One or more fields failed validation.',
      400,
      errors,
    );
  }

  // Apply updates
  try {
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.status !== undefined) updates.status = body.status;
    if (body.wealthTier !== undefined) updates.wealthTier = body.wealthTier;
    if (body.primaryState !== undefined) updates.primaryState = body.primaryState;
    if (body.advisorId !== undefined) updates.advisorId = body.advisorId;

    const updated = updateHousehold(hhId, updates);
    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(
      'INTERNAL_ERROR',
      (err as Error).message,
      500,
    );
  }
}

// ==================== DELETE ====================

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const hhId = householdId(id);

  const existing = getHousehold(hhId);
  if (!existing) {
    return errorResponse(
      'NOT_FOUND',
      `Household "${id}" not found.`,
      404,
      { resource: 'Household', id },
    );
  }

  deleteHousehold(hhId);

  return NextResponse.json({ deleted: true, householdId: id });
}
