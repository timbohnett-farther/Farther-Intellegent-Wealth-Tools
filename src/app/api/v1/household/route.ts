export const dynamic = 'force-dynamic';
// =============================================================================
// GET  /api/v1/household       - List/search households
// POST /api/v1/household       - Create a new household
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  listHouseholds,
  createHousehold,
} from '@/lib/household/store';
import type {
  HouseholdStatus,
  WealthTier,
} from '@/lib/household/types';

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const firmId = searchParams.get('firmId') ?? undefined;
  const advisorId = searchParams.get('advisorId') ?? undefined;
  const query = searchParams.get('query') ?? searchParams.get('q') ?? undefined;
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)),
  );
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));
  const sortBy = searchParams.get('sortBy') ?? 'updatedAt';
  const sortOrder = (searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc';

  // Parse status — supports repeated params (?status=ACTIVE&status=ONBOARDING)
  // or comma-separated (?status=ACTIVE,ONBOARDING)
  const rawStatuses = searchParams.getAll('status');
  const statusValues = rawStatuses
    .flatMap((s) => s.split(','))
    .map((s) => s.trim())
    .filter(Boolean) as HouseholdStatus[];

  // Validate status values
  for (const s of statusValues) {
    if (!VALID_STATUSES.includes(s)) {
      return errorResponse(
        'VALIDATION_ERROR',
        `Invalid status "${s}". Must be one of: ${VALID_STATUSES.join(', ')}.`,
        400,
      );
    }
  }

  // Parse wealthTier — same pattern as status
  const rawTiers = searchParams.getAll('wealthTier');
  const tierValues = rawTiers
    .flatMap((t) => t.split(','))
    .map((t) => t.trim())
    .filter(Boolean) as WealthTier[];

  // Validate wealthTier values
  for (const t of tierValues) {
    if (!VALID_WEALTH_TIERS.includes(t)) {
      return errorResponse(
        'VALIDATION_ERROR',
        `Invalid wealthTier "${t}". Must be one of: ${VALID_WEALTH_TIERS.join(', ')}.`,
        400,
      );
    }
  }

  const validSortByValues = ['name', 'netWorth', 'totalAum', 'createdAt', 'updatedAt', 'lastReviewedAt'] as const;
  type ValidSortBy = typeof validSortByValues[number];
  const typedSortBy: ValidSortBy | undefined = validSortByValues.includes(sortBy as ValidSortBy)
    ? (sortBy as ValidSortBy)
    : undefined;

  const result = listHouseholds({
    firmId: firmId ?? 'firm-001',
    advisorId,
    status: statusValues.length > 0 ? statusValues : undefined,
    wealthTier: tierValues.length > 0 ? tierValues : undefined,
    query,
    limit,
    offset,
    sortBy: typedSortBy,
    sortOrder,
  });

  return NextResponse.json(result);
}

// ==================== POST ====================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---------- Parse body ----------
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // ---------- Validate ----------
  const errors: Record<string, string> = {};

  if (!body.name || typeof body.name !== 'string') {
    errors.name = 'name is required and must be a string.';
  } else if (
    (body.name as string).length < 1 ||
    (body.name as string).length > 200
  ) {
    errors.name = 'name must be between 1 and 200 characters.';
  }

  if (!body.firmId || typeof body.firmId !== 'string') {
    errors.firmId = 'firmId is required and must be a string.';
  }

  if (!body.advisorId || typeof body.advisorId !== 'string') {
    errors.advisorId = 'advisorId is required and must be a string.';
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

  // ---------- Create ----------
  const household = createHousehold({
    firmId: body.firmId as string,
    advisorId: body.advisorId as string,
    name: body.name as string,
    status: (body.status as HouseholdStatus) ?? undefined,
    wealthTier: (body.wealthTier as WealthTier) ?? undefined,
    primaryState: (body.primaryState as string) ?? undefined,
  });

  return NextResponse.json(household, { status: 201 });
}
