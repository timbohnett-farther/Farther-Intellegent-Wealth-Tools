export const dynamic = 'force-dynamic';
// =============================================================================
// GET  /api/v1/household/:id/members  - List members of a household
// POST /api/v1/household/:id/members  - Add a member to a household
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getHousehold, addMember } from '@/lib/household/store';
import { householdId } from '@/lib/household/types';
import type { MemberRelationship, EmploymentStatus } from '@/lib/household/types';

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
    items: household.members,
    total: household.members.length,
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

  if (!body.firstName || typeof body.firstName !== 'string') {
    errors.firstName = 'firstName is required and must be a string.';
  }
  if (!body.lastName || typeof body.lastName !== 'string') {
    errors.lastName = 'lastName is required and must be a string.';
  }
  if (!body.relationship || typeof body.relationship !== 'string') {
    errors.relationship = 'relationship is required and must be a string.';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(
      'VALIDATION_ERROR',
      'One or more fields failed validation.',
      400,
      errors,
    );
  }

  // Add member
  try {
    const member = addMember(hhId, {
      role: (body.role as string as 'PRIMARY') ?? 'PRIMARY',
      firstName: body.firstName as string,
      middleName: (body.middleName as string) ?? null,
      lastName: body.lastName as string,
      preferredName: (body.preferredName as string) ?? null,
      relationship: body.relationship as MemberRelationship,
      dateOfBirth: (body.dateOfBirth as string) ?? '1980-01-01',
      gender: (body.gender as string) ?? null,
      email: (body.email as string) ?? null,
      phoneMobile: (body.phoneMobile as string) ?? null,
      ssnLastFour: (body.ssnLastFour as string) ?? null,
      citizenship: (body.citizenship as string) ?? 'US',
      domicileState: (body.domicileState as string) ?? null,
      employmentStatus: (body.employmentStatus as EmploymentStatus) ?? null,
      employerName: (body.employerName as string) ?? null,
      occupation: (body.occupation as string) ?? null,
      isActive: true,
      retirementAge: (body.retirementAge as number) ?? null,
      lifeExpectancy: (body.lifeExpectancy as number) ?? null,
      healthStatus: null,
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    return errorResponse('INTERNAL_ERROR', (err as Error).message, 500);
  }
}
