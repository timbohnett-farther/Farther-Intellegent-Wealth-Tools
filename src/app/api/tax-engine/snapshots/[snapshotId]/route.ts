/**
 * Tax Input Snapshot Detail API
 *
 * GET /api/tax-engine/snapshots/[snapshotId] - Get snapshot details
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ snapshotId: string }>;
}

/**
 * GET /api/tax-engine/snapshots/[snapshotId]
 *
 * Retrieve full snapshot details including inputs
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { snapshotId } = await context.params;

    if (!snapshotId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing snapshotId parameter',
        },
        { status: 400 }
      );
    }

    // Fetch snapshot
    const snapshot = await prisma.taxInputSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          error: `Snapshot ${snapshotId} not found`,
        },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const taxpayers = snapshot.taxpayers ? JSON.parse(snapshot.taxpayers) : [];
    const inputs = snapshot.inputs ? JSON.parse(snapshot.inputs) : {};
    const sourceFactVersions = snapshot.sourceFactVersions
      ? JSON.parse(snapshot.sourceFactVersions)
      : {};
    const missingInputs = snapshot.missingInputs
      ? JSON.parse(snapshot.missingInputs)
      : [];
    const warnings = snapshot.warnings ? JSON.parse(snapshot.warnings) : [];

    // Build response
    const response = {
      success: true,
      snapshot: {
        snapshotId: snapshot.id,
        householdId: snapshot.householdId,
        taxYear: snapshot.taxYear,
        filingStatus: snapshot.filingStatus,
        taxpayers,
        inputs,
        sourceFactVersions,
        missingInputs,
        warnings,
        createdAt: snapshot.createdAt.toISOString(),
        createdBy: snapshot.createdBy || 'system',
        approvedAt: snapshot.approvedAt?.toISOString() || null,
        approvedBy: snapshot.approvedBy || null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get snapshot error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
