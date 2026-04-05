// =============================================================================
// Estate Analysis Report API — Get & Export
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAnalysis, documentsStore, findingsStore, reportsStore } from '../../stores';
import { composeReport, exportToPDF, exportToDocx } from '@/lib/estate-intelligence/report-engine';

export const dynamic = 'force-dynamic';

// ── GET /api/v1/estate-analyses/[id]/report ──────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: analysisId } = params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format'); // 'pdf' | 'docx' | null (default JSON)

    // Verify analysis exists
    const analysis = getAnalysis(analysisId);
    if (!analysis) {
      return NextResponse.json(
        { success: false, data: null, error: 'Analysis not found', retryable: false },
        { status: 404 }
      );
    }

    // Get or generate report
    let report = reportsStore.get(analysisId);

    if (!report) {
      // Generate report
      const findings = findingsStore.get(analysisId) || [];
      const documents = documentsStore.get(analysisId) || [];

      if (findings.length === 0) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: 'No findings available. Run analysis first.',
            retryable: false,
          },
          { status: 400 }
        );
      }

      console.log(`[Estate Report API] Generating report for ${analysisId}...`);

      // Calculate estate value and tax exposure (simplified)
      const estateValue = 5000000; // Mock value
      const taxExposure = 1200000; // Mock value

      report = await composeReport({
        analysisId,
        findings,
        clientName: analysis.clientName,
        documents,
        estateValue,
        taxExposure,
      });

      // Cache report
      reportsStore.set(analysisId, report);

      console.log(`[Estate Report API] Report generated: ${report.sections.length} sections`);
    }

    // Handle export formats
    if (format === 'pdf') {
      const pdfBuffer = await exportToPDF(report);

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="estate-analysis-${analysisId}.pdf"`,
        },
      });
    }

    if (format === 'docx') {
      const docxBuffer = await exportToDocx(report);

      return new NextResponse(docxBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="estate-analysis-${analysisId}.docx"`,
        },
      });
    }

    // Default: return JSON
    return NextResponse.json({
      success: true,
      data: report,
      error: null,
      retryable: false,
    });
  } catch (err) {
    console.error('[Estate Report API] GET error:', err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: err instanceof Error ? err.message : 'Failed to generate report',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
