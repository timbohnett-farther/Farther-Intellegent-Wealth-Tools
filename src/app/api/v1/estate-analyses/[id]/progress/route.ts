// =============================================================================
// Estate Analysis Progress API — Real-Time Status
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAnalysis, documentsStore, findingsStore } from '../../stores';
import type { AnalysisProgress } from '@/lib/estate-intelligence/types';

export const dynamic = 'force-dynamic';

// ── GET /api/v1/estate-analyses/[id]/progress ────────────────────────────────

export async function GET(
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

    // Get findings count
    const findings = findingsStore.get(analysisId) || [];
    const highSeverity = findings.filter((f) => f.severity === 'HIGH').length;
    const mediumSeverity = findings.filter((f) => f.severity === 'MEDIUM').length;
    const lowSeverity = findings.filter((f) => f.severity === 'LOW').length;
    const infoSeverity = findings.filter((f) => f.severity === 'INFO').length;

    // Get documents count
    const documents = documentsStore.get(analysisId) || [];

    // Build progress response
    const progress: AnalysisProgress = {
      status: analysis.status,
      totalAgents: 12, // Total number of agents in the system
      completedAgents: analysis.status === 'COMPLETE' ? 12 : 0, // Simplified
      activeAgents: analysis.status === 'ANALYZING' ? ['TRUST_STRUCTURE_ANALYST'] : [],
      findings: {
        total: findings.length,
        high: highSeverity,
        medium: mediumSeverity,
        low: lowSeverity,
        info: infoSeverity,
      },
      estimatedTimeRemaining: analysis.status === 'ANALYZING' ? 120 : undefined, // 2 minutes
    };

    console.log(`[Estate Progress API] Analysis ${analysisId}: ${analysis.status}, ${findings.length} findings`);

    return NextResponse.json({
      success: true,
      data: progress,
      error: null,
      retryable: false,
    });
  } catch (err) {
    console.error('[Estate Progress API] GET error:', err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Failed to fetch progress',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
