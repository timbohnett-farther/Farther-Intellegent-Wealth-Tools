// =============================================================================
// Estate Analysis Detail API — GET & DELETE
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAnalysis, deleteAnalysis } from '../stores';

export const dynamic = 'force-dynamic';

// ── GET /api/v1/estate-analyses/[id] ─────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const analysis = getAnalysis(id);

    if (!analysis) {
      return NextResponse.json(
        { success: false, data: null, error: 'Analysis not found', retryable: false },
        { status: 404 }
      );
    }

    console.log(`[Estate Analysis Detail API] Fetched analysis ${id}`);

    return NextResponse.json({
      success: true,
      data: analysis,
      error: null,
      retryable: false,
    });
  } catch (err) {
    console.error('[Estate Analysis Detail API] GET error:', err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Failed to fetch analysis',
        retryable: true,
      },
      { status: 500 }
    );
  }
}

// ── DELETE /api/v1/estate-analyses/[id] ──────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const deleted = deleteAnalysis(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, data: null, error: 'Analysis not found', retryable: false },
        { status: 404 }
      );
    }

    console.log(`[Estate Analysis Detail API] Deleted analysis ${id}`);

    return NextResponse.json({
      success: true,
      data: { deleted: true },
      error: null,
      retryable: false,
    });
  } catch (err) {
    console.error('[Estate Analysis Detail API] DELETE error:', err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Failed to delete analysis',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
