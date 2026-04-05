// =============================================================================
// Estate Analysis Execute API — Trigger Agent Orchestration
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAnalysis, updateAnalysisStatus, documentsStore } from '../../stores';

export const dynamic = 'force-dynamic';

// ── POST /api/v1/estate-analyses/[id]/execute ────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: analysisId } = params;

    // Verify analysis exists
    const analysis = getAnalysis(analysisId);
    if (!analysis) {
      return NextResponse.json(
        { success: false, data: null, error: 'Analysis not found', retryable: false },
        { status: 404 }
      );
    }

    // Verify documents exist
    const documents = documentsStore.get(analysisId) || [];
    if (documents.length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'No documents uploaded for this analysis',
          retryable: false,
        },
        { status: 400 }
      );
    }

    // Update status to ANALYZING
    updateAnalysisStatus(analysisId, 'ANALYZING');

    console.log(`[Estate Execute API] Starting analysis for ${analysisId} (${documents.length} documents)`);

    // In a real implementation, you would:
    // 1. Trigger the orchestrator (from estate-intelligence/orchestrator.ts)
    // 2. Run agents asynchronously
    // 3. Store findings as they complete
    //
    // For now, we'll just update the status to indicate it's running
    // The actual orchestration would happen in a background job

    // Simulate async start (in production, this would be a queue job)
    setTimeout(() => {
      console.log(`[Estate Execute API] Analysis ${analysisId} started in background`);
    }, 100);

    return NextResponse.json({
      success: true,
      data: {
        status: 'ANALYZING',
        analysisId,
        documentsCount: documents.length,
        message: 'Analysis started. Use /progress endpoint to check status.',
      },
      error: null,
      retryable: false,
    });
  } catch (err) {
    console.error('[Estate Execute API] POST error:', err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Failed to execute analysis',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
