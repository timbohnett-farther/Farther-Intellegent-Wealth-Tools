// =============================================================================
// Estate Analyses API — List & Create
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { analysesStore, type AnalysisRecord } from './stores';
import type { AnalysisStatus } from '@/lib/estate-intelligence/types';

export const dynamic = 'force-dynamic';

// ── POST /api/v1/estate-analyses ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientName, advisorId, firmId, householdId } = body;

    // Validate required fields
    if (!clientName?.trim()) {
      return NextResponse.json(
        { success: false, data: null, error: 'clientName is required', retryable: false },
        { status: 400 }
      );
    }

    // Generate analysis ID
    const analysisId = `EST-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create record
    const analysis: AnalysisRecord = {
      analysisId,
      clientName: clientName.trim(),
      advisorId,
      firmId,
      householdId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    analysesStore.set(analysisId, analysis);

    console.log(`[Estate Analyses API] Created analysis ${analysisId} for ${clientName}`);

    return NextResponse.json({
      success: true,
      data: { analysisId, status: 'PENDING' },
      error: null,
      retryable: false,
    });
  } catch (err) {
    console.error('[Estate Analyses API] POST error:', err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Failed to create analysis',
        retryable: true,
      },
      { status: 500 }
    );
  }
}

// ── GET /api/v1/estate-analyses ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') as AnalysisStatus | null;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    // Get all analyses
    let analyses = Array.from(analysesStore.values());

    // Filter by status if provided
    if (statusFilter) {
      analyses = analyses.filter((a) => a.status === statusFilter);
    }

    // Sort by created date (newest first)
    analyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply limit
    analyses = analyses.slice(0, limit);

    console.log(`[Estate Analyses API] Fetched ${analyses.length} analyses (status: ${statusFilter || 'all'})`);

    return NextResponse.json({
      success: true,
      data: {
        analyses,
        total: analyses.length,
      },
      error: null,
      retryable: false,
    });
  } catch (err) {
    console.error('[Estate Analyses API] GET error:', err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Failed to fetch analyses',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
