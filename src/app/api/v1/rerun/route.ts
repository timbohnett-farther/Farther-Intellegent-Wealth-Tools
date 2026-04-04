export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/rerun - Re-run computation with current or provided params
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ==================== Types ====================

type ComputationType =
  | 'RISK_SCORE'
  | 'FEE_ANALYSIS'
  | 'MONTE_CARLO'
  | 'STRESS_TEST'
  | 'SIDE_BY_SIDE'
  | 'NARRATIVE';

type EntityType = 'PROPOSAL' | 'SCENARIO' | 'ROLLOVER';

interface RerunRequest {
  computationType: ComputationType;
  entityType: EntityType;
  entityId: string;
  params?: Record<string, unknown>;
}

interface RerunResponse {
  success: boolean;
  data: {
    rerunId: string;
    computationType: ComputationType;
    entityType: EntityType;
    entityId: string;
    status: 'QUEUED';
    queuedAt: string;
  } | null;
  error: string | null;
  retryable: boolean;
}

// ==================== Helpers ====================

function errorResponse(error: string, retryable: boolean, status: number): NextResponse<RerunResponse> {
  return NextResponse.json(
    { success: false, data: null, error, retryable },
    { status }
  );
}

// ==================== POST ====================

export async function POST(req: NextRequest): Promise<NextResponse<RerunResponse>> {
  try {
    // ---------- Parse body ----------
    let body: RerunRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Request body must be valid JSON', false, 400);
    }

    const { computationType, entityType, entityId, params } = body;

    // ---------- Validate ----------
    const validComputationTypes: ComputationType[] = [
      'RISK_SCORE',
      'FEE_ANALYSIS',
      'MONTE_CARLO',
      'STRESS_TEST',
      'SIDE_BY_SIDE',
      'NARRATIVE',
    ];

    const validEntityTypes: EntityType[] = ['PROPOSAL', 'SCENARIO', 'ROLLOVER'];

    if (!validComputationTypes.includes(computationType)) {
      return errorResponse(
        `Invalid computationType. Must be one of: ${validComputationTypes.join(', ')}`,
        false,
        400
      );
    }

    if (!validEntityTypes.includes(entityType)) {
      return errorResponse(
        `Invalid entityType. Must be one of: ${validEntityTypes.join(', ')}`,
        false,
        400
      );
    }

    if (!entityId || typeof entityId !== 'string') {
      return errorResponse('entityId is required and must be a string', false, 400);
    }

    // ---------- Verify entity exists ----------
    let entityExists = false;

    if (entityType === 'PROPOSAL') {
      const proposal = await prisma.proposalSession.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
      entityExists = !!proposal;
    } else if (entityType === 'SCENARIO') {
      const scenario = await prisma.planningScenario.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
      entityExists = !!scenario;
    } else if (entityType === 'ROLLOVER') {
      const rollover = await prisma.rolloverAnalysisRecord.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
      entityExists = !!rollover;
    }

    if (!entityExists) {
      return errorResponse(
        `${entityType} with ID ${entityId} not found`,
        false,
        404
      );
    }

    // ---------- Queue computation ----------
    // For now, return a stub that acknowledges the request
    // In production, this would enqueue a background job
    const rerunId = crypto.randomUUID();
    const queuedAt = new Date().toISOString();

    // Log the rerun request for debugging
    console.log('[POST /api/v1/rerun]', {
      rerunId,
      computationType,
      entityType,
      entityId,
      params: params || {},
      queuedAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        rerunId,
        computationType,
        entityType,
        entityId,
        status: 'QUEUED',
        queuedAt,
      },
      error: null,
      retryable: false,
    });

  } catch (err) {
    console.error('[POST /api/v1/rerun]', err);
    return errorResponse('Failed to queue computation', true, 500);
  }
}
