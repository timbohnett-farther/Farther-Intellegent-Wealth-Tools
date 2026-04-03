/**
 * GET /api/relocation/jurisdictions
 *
 * Returns list of available jurisdictions for relocation calculator
 * Query params:
 * - type: "leaving" | "destination" | "all" (default: "all")
 * - status: "published" | "draft" | "all" (default: "published")
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'published';

    // Build filter
    const where: any = {};

    if (status !== 'all') {
      where.status = status;
    }

    if (type === 'leaving') {
      where.is_leaving_state_enabled = true;
    } else if (type === 'destination') {
      where.is_destination_enabled = true;
    }

    // Fetch jurisdictions
    const jurisdictions = await prisma.relocation_jurisdictions.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        is_destination_enabled: true,
        is_leaving_state_enabled: true,
        tax_year: true,
        effective_date: true,
        notes_public: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform to client-friendly format
    const result = jurisdictions.map((j) => ({
      id: j.id,
      code: j.code,
      name: j.name,
      type: j.type,
      isDestinationEnabled: j.is_destination_enabled,
      isLeavingStateEnabled: j.is_leaving_state_enabled,
      taxYear: j.tax_year,
      effectiveDate: j.effective_date,
      notesPublic: j.notes_public,
    }));

    return NextResponse.json({
      jurisdictions: result,
      count: result.length,
      filters: {
        type,
        status,
      },
    });
  } catch (error) {
    console.error('Error in /api/relocation/jurisdictions:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching jurisdictions' },
      { status: 500 }
    );
  }
}
