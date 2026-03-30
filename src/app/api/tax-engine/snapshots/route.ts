/**
 * Tax Input Snapshots API
 *
 * POST /api/tax-engine/snapshots - Create new snapshot from approved facts
 * GET  /api/tax-engine/snapshots - List snapshots for household
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildSnapshot } from '@/lib/tax-engine/mappers/snapshot-builder';
import type { CreateSnapshotResponse } from '@/types';

/**
 * POST /api/tax-engine/snapshots
 *
 * Create a new tax input snapshot from approved facts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      householdId,
      taxYear,
      sourceFactVersionMode = 'latest_approved',
      createdBy,
    } = body;

    // Validation
    if (!householdId || !taxYear) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: householdId, taxYear',
        },
        { status: 400 }
      );
    }

    // Validate tax year range
    if (taxYear < 2020 || taxYear > 2025) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tax year must be between 2020 and 2025',
        },
        { status: 400 }
      );
    }

    // Fetch approved facts for household and tax year
    const approvedFacts = await prisma.approvedFact.findMany({
      where: {
        householdId,
        taxYear,
        approvalStatus: 'approved',
      },
      orderBy: [
        { canonicalField: 'asc' },
        { version: 'desc' }, // Latest version first
      ],
    });

    if (approvedFacts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No approved facts found for household ${householdId}, tax year ${taxYear}`,
        },
        { status: 404 }
      );
    }

    // Build snapshot
    const result = await buildSnapshot(householdId, approvedFacts, {
      taxYear,
      includeWarnings: true,
    });

    // Persist snapshot to database
    const savedSnapshot = await prisma.taxInputSnapshot.create({
      data: {
        id: result.snapshot.snapshotId,
        householdId,
        taxYear,
        filingStatus: result.snapshot.filingStatus,
        taxpayers: JSON.stringify(result.snapshot.taxpayers),
        inputs: JSON.stringify(result.snapshot.inputs),
        sourceFactVersions: JSON.stringify(result.snapshot.sourceFactVersions),
        missingInputs: JSON.stringify(result.snapshot.missingInputs),
        warnings: JSON.stringify(result.snapshot.warnings),
        createdBy: createdBy || 'system',
      },
    });

    // Prepare response
    const response: CreateSnapshotResponse = {
      success: true,
      snapshotId: savedSnapshot.id,
      missingInputs: result.missingInputs.map((mi) => mi.field),
      warnings: result.warnings.map((w) => w.message),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Create snapshot error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tax-engine/snapshots
 *
 * List snapshots for a household
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');
    const taxYear = searchParams.get('taxYear');

    if (!householdId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: householdId',
        },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = { householdId };
    if (taxYear) {
      where.taxYear = parseInt(taxYear, 10);
    }

    // Fetch snapshots
    const snapshots = await prisma.taxInputSnapshot.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to most recent 50
    });

    // Parse JSON fields for response
    const snapshotsWithParsed = snapshots.map((snapshot) => ({
      snapshotId: snapshot.id,
      householdId: snapshot.householdId,
      taxYear: snapshot.taxYear,
      filingStatus: snapshot.filingStatus,
      createdAt: snapshot.createdAt.toISOString(),
      createdBy: snapshot.createdBy || 'system',
      missingInputCount: snapshot.missingInputs
        ? JSON.parse(snapshot.missingInputs).length
        : 0,
      warningCount: snapshot.warnings ? JSON.parse(snapshot.warnings).length : 0,
      approvedAt: snapshot.approvedAt?.toISOString() || null,
      approvedBy: snapshot.approvedBy || null,
    }));

    return NextResponse.json({
      success: true,
      snapshots: snapshotsWithParsed,
      count: snapshotsWithParsed.length,
    });
  } catch (error) {
    console.error('List snapshots error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
