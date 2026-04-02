/**
 * POST /api/scenarios/:scenarioId/archive
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { archiveScenario } from '@/lib/scenario-planning/scenario-service';
import { ArchiveScenarioRequestSchema, type ApiErrorResponse } from '@/lib/scenario-planning/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { scenarioId: string } }
) {
  try {
    const { scenarioId } = params;
    const body = await request.json();
    const validatedRequest = ArchiveScenarioRequestSchema.parse(body);
    const userId = request.headers.get('x-user-id') || 'system';

    const scenario = await archiveScenario(scenarioId, userId, validatedRequest.reason);

    return NextResponse.json(scenario, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.issues }, { status: 400 });
    }

    console.error(`[API] Error:`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
