/**
 * PATCH /api/opportunities/:id/status
 *
 * Update the status of an opportunity with audit trail.
 * Valid status transitions:
 * - detected → reviewed → recommended → in_progress → implemented
 * - any status → dismissed
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  UpdateOpportunityStatusRequestSchema,
  type UpdateOpportunityStatusResponse,
  type ApiErrorResponse,
} from '@/lib/opportunity-engine/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = UpdateOpportunityStatusRequestSchema.parse(body);

    // Fetch existing opportunity
    const existing = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!existing) {
      const errorResponse: ApiErrorResponse = {
        error: 'Not Found',
        message: `Opportunity with ID ${id} not found`,
        statusCode: 404,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Build status history entry
    const statusHistory = existing.statusHistory
      ? JSON.parse(existing.statusHistory as string)
      : [];

    const newHistoryEntry = {
      status: validatedRequest.status,
      timestamp: new Date(),
      updatedBy: validatedRequest.updatedBy,
      notes: validatedRequest.notes,
    };

    statusHistory.push(newHistoryEntry);

    // Prepare update data
    const updateData: any = {
      status: validatedRequest.status,
      statusHistory: JSON.stringify(statusHistory),
      updatedAt: new Date(),
    };

    // Set timestamp fields based on new status
    if (validatedRequest.status === 'reviewed' && !existing.reviewedAt) {
      updateData.reviewedAt = new Date();
    } else if (validatedRequest.status === 'implemented' && !existing.implementedAt) {
      updateData.implementedAt = new Date();
    } else if (validatedRequest.status === 'dismissed' && !existing.dismissedAt) {
      updateData.dismissedAt = new Date();
      updateData.dismissedReason = validatedRequest.notes || 'No reason provided';
    }

    // Update opportunity
    const updated = await prisma.opportunity.update({
      where: { id },
      data: updateData,
    });

    // Create audit event
    await prisma.opportunityAuditEvent.create({
      data: {
        opportunityId: id,
        eventType: 'status_changed',
        actor: validatedRequest.updatedBy,
        actorType: 'user',
        changesBefore: JSON.stringify({ status: existing.status }),
        changesAfter: JSON.stringify({ status: validatedRequest.status }),
        metadata: JSON.stringify({
          notes: validatedRequest.notes,
        }),
        timestamp: new Date(),
      },
    });

    // Parse JSON fields for response
    const evidence = JSON.parse(updated.evidence as string);
    const score = JSON.parse(updated.score as string);
    const context = JSON.parse(updated.context as string);

    // Build response
    const response: UpdateOpportunityStatusResponse = {
      opportunity: {
        id: updated.id,
        detectionRunId: updated.detectionRunId,
        householdId: updated.householdId,
        taxYear: updated.taxYear,
        ruleName: updated.ruleName,
        ruleVersion: updated.ruleVersion,
        category: updated.category as any,
        priority: updated.priority as any,
        rank: updated.rank,
        title: updated.title,
        summary: updated.summary,
        estimatedValue: updated.estimatedValue ?? undefined,
        confidence: updated.confidence as any,
        evidence,
        score,
        finalScore: updated.finalScore,
        context,
        isDuplicate: updated.isDuplicate,
        duplicateOfId: updated.duplicateOfId ?? undefined,
        suppressionReason: updated.suppressionReason ?? undefined,
        status: updated.status as any,
        statusHistory,
        detectedAt: updated.detectedAt,
        reviewedAt: updated.reviewedAt ?? undefined,
        implementedAt: updated.implementedAt ?? undefined,
        dismissedAt: updated.dismissedAt ?? undefined,
        dismissedReason: updated.dismissedReason ?? undefined,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        error: 'Validation Error',
        message: 'Invalid request data',
        statusCode: 400,
        details: error.errors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.error(`[API] Error in PATCH /api/opportunities/${params.id}/status:`, error);

    const errorResponse: ApiErrorResponse = {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      statusCode: 500,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
