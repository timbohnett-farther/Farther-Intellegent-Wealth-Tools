export const dynamic = 'force-dynamic';
// =============================================================================
// GET  /api/v1/household/:id/goals  - List goals of a household
// POST /api/v1/household/:id/goals  - Add a goal to a household
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getHousehold, addGoal } from '@/lib/household/store';
import { householdId, accountId } from '@/lib/household/types';
import type { GoalType, GoalPriority, GoalFundingStatus } from '@/lib/household/types';

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
    items: household.goals,
    total: household.goals.length,
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
  if (!body.type || typeof body.type !== 'string') {
    errors.type = 'type is required and must be a string.';
  }
  if (body.targetAmount === undefined || typeof body.targetAmount !== 'number') {
    errors.targetAmount = 'targetAmount is required and must be a number.';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(
      'VALIDATION_ERROR',
      'One or more fields failed validation.',
      400,
      errors,
    );
  }

  // Add goal
  try {
    const goal = addGoal(hhId, {
      name: body.name as string,
      type: body.type as GoalType,
      targetAmount: body.targetAmount as number,
      currentFunding: (body.currentFunding as number) ?? 0,
      targetYear: (body.targetYear as number) ?? new Date().getFullYear() + 10,
      priority: ((body.priority as string) ?? 'IMPORTANT') as GoalPriority,
      fundingStatus: ((body.fundingStatus as string) ?? 'NOT_STARTED') as GoalFundingStatus,
      monthlyContribution: (body.monthlyContribution as number) ?? null,
      linkedAccountIds: ((body.linkedAccountIds as string[]) ?? []).map(accountId),
      inflationAdjusted: (body.inflationAdjusted as boolean) ?? false,
      notes: (body.notes as string) ?? null,
      isActive: true,
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (err) {
    return errorResponse('INTERNAL_ERROR', (err as Error).message, 500);
  }
}
