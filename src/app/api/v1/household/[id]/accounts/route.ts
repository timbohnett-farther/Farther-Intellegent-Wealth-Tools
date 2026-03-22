export const dynamic = 'force-dynamic';
// =============================================================================
// GET  /api/v1/household/:id/accounts  - List accounts of a household
// POST /api/v1/household/:id/accounts  - Add an account to a household
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getHousehold, addAccount } from '@/lib/household/store';
import { householdId, memberId } from '@/lib/household/types';
import type { AccountType, CustodianId, AccountRegistration, AccountTaxBucket } from '@/lib/household/types';

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

  return NextResponse.json({
    items: household.accounts,
    total: household.accounts.length,
  });
}

// ==================== POST ====================

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const hhId = householdId(id);

  // Verify household exists
  const household = getHousehold(hhId);
  if (!household) {
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

  // Validate required fields
  const errors: Record<string, string> = {};

  if (!body.name || typeof body.name !== 'string') {
    errors.name = 'name is required and must be a string.';
  }
  if (!body.accountType || typeof body.accountType !== 'string') {
    errors.accountType = 'accountType is required and must be a string.';
  }
  if (!body.ownerId || typeof body.ownerId !== 'string') {
    errors.ownerId = 'ownerId is required and must be a string.';
  }
  if (body.currentBalance !== undefined && typeof body.currentBalance !== 'number') {
    errors.currentBalance = 'currentBalance must be a number.';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(
      'VALIDATION_ERROR',
      'One or more fields failed validation.',
      400,
      errors,
    );
  }

  // Add account
  try {
    const now = new Date().toISOString();
    const account = addAccount(hhId, {
      ownerId: memberId(body.ownerId as string),
      coOwnerId: body.coOwnerId ? memberId(body.coOwnerId as string) : null,
      name: body.name as string,
      institution: (body.institution as string) ?? null,
      accountType: body.accountType as AccountType,
      custodian: ((body.custodian as string) ?? 'OTHER') as CustodianId,
      accountNumberLast4: (body.accountNumberLast4 as string) ?? null,
      registration: ((body.registration as string) ?? 'INDIVIDUAL') as AccountRegistration,
      taxBucket: ((body.taxBucket as string) ?? 'TAXABLE') as AccountTaxBucket,
      currentBalance: (body.currentBalance as number) ?? 0,
      costBasis: (body.costBasis as number) ?? null,
      unrealizedGain: (body.unrealizedGain as number) ?? null,
      equityPct: (body.equityPct as number) ?? null,
      bondPct: (body.bondPct as number) ?? null,
      cashPct: (body.cashPct as number) ?? null,
      alternativePct: (body.alternativePct as number) ?? null,
      ytdReturn: (body.ytdReturn as number) ?? null,
      inceptionReturn: (body.inceptionReturn as number) ?? null,
      isManagedByFarther: (body.isManagedByFarther as boolean) ?? true,
      isHeldAway: (body.isHeldAway as boolean) ?? false,
      lastSyncedAt: now,
      balanceAsOf: now,
      isActive: true,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    return errorResponse('INTERNAL_ERROR', (err as Error).message, 500);
  }
}
