// =============================================================================
// Estate Analysis Findings API — Get All Findings
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAnalysis, findingsStore } from '../../stores';
import type { FindingSeverity, FindingCategory } from '@/lib/estate-intelligence/types';

export const dynamic = 'force-dynamic';

// ── GET /api/v1/estate-analyses/[id]/findings ────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: analysisId } = params;
    const { searchParams } = new URL(req.url);

    // Verify analysis exists
    const analysis = getAnalysis(analysisId);
    if (!analysis) {
      return NextResponse.json(
        { success: false, data: null, error: 'Analysis not found', retryable: false },
        { status: 404 }
      );
    }

    // Get all findings
    let findings = findingsStore.get(analysisId) || [];

    // Apply filters
    const severityFilter = searchParams.get('severity') as FindingSeverity | null;
    if (severityFilter) {
      findings = findings.filter((f) => f.severity === severityFilter);
    }

    const categoryFilter = searchParams.get('category') as FindingCategory | null;
    if (categoryFilter) {
      findings = findings.filter((f) => f.category === categoryFilter);
    }

    // Sort by severity (HIGH → MEDIUM → LOW → INFO)
    const severityOrder: Record<FindingSeverity, number> = {
      HIGH: 0,
      MEDIUM: 1,
      LOW: 2,
      INFO: 3,
    };

    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    console.log(`[Estate Findings API] Fetched ${findings.length} findings for ${analysisId}`);

    return NextResponse.json({
      success: true,
      data: {
        findings,
        count: findings.length,
      },
      error: null,
      retryable: false,
    });
  } catch (err) {
    console.error('[Estate Findings API] GET error:', err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Failed to fetch findings',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
