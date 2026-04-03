/**
 * GET /api/relocation/admin/candidate-updates
 * List all pending candidate tax rule updates for admin review
 *
 * POST /api/relocation/admin/candidate-updates (approve/reject)
 * Approve or reject a candidate update
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const candidates = await prisma.relocation_candidate_updates.findMany({
      where: status !== 'all' ? { review_status: status } : undefined,
      orderBy: [
        { confidence_score: 'desc' },
        { detected_date: 'desc' },
      ],
    });

    // Get jurisdiction names for display
    const candidatesWithJurisdiction = await Promise.all(
      candidates.map(async (c) => {
        const jurisdiction = await prisma.relocation_jurisdictions.findFirst({
          where: { code: c.jurisdiction_code },
        });

        return {
          id: c.id,
          jurisdictionCode: c.jurisdiction_code,
          jurisdictionName: jurisdiction?.name || c.jurisdiction_code,
          sourceType: c.source_type,
          sourceUrl: c.source_url,
          detectedDate: c.detected_date,
          proposedChanges: JSON.parse(c.proposed_changes),
          confidenceScore: c.confidence_score,
          extractionSummary: c.extraction_summary,
          reviewStatus: c.review_status,
          reviewedBy: c.reviewed_by,
          reviewDate: c.review_date,
          reviewNotes: c.review_notes,
        };
      })
    );

    return NextResponse.json({
      candidates: candidatesWithJurisdiction,
      count: candidatesWithJurisdiction.length,
    });
  } catch (error) {
    console.error('Error fetching candidate updates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidate updates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateId, action, reviewNotes, reviewedBy } = body;

    if (!candidateId || !action || !reviewedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: candidateId, action, reviewedBy' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get the candidate update
    const candidate = await prisma.relocation_candidate_updates.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate update not found' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      // Apply the changes to the jurisdiction rules
      const proposedChanges = JSON.parse(candidate.proposed_changes);

      // Update jurisdiction rules (simplified - would need more robust merging logic in production)
      const jurisdiction = await prisma.relocation_jurisdictions.findFirst({
        where: { code: candidate.jurisdiction_code },
      });

      if (jurisdiction && proposedChanges.incomeTax) {
        // Update income tax rules
        await prisma.relocation_income_tax_rules.updateMany({
          where: { jurisdiction_id: jurisdiction.id },
          data: {
            // Apply changes from proposed updates
            ...(proposedChanges.incomeTax.systemType && { system_type: proposedChanges.incomeTax.systemType }),
            ...(proposedChanges.incomeTax.flatRate && { flat_rate: proposedChanges.incomeTax.flatRate }),
            ...(proposedChanges.incomeTax.brackets && { ordinary_income_brackets: JSON.stringify(proposedChanges.incomeTax.brackets) }),
          },
        });
      }

      // Mark candidate as approved
      await prisma.relocation_candidate_updates.update({
        where: { id: candidateId },
        data: {
          review_status: 'approved',
          reviewed_by: reviewedBy,
          review_date: new Date().toISOString(),
          review_notes: reviewNotes || `Approved and applied to ${candidate.jurisdiction_code} rules`,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'approved',
        message: `Tax rule update for ${candidate.jurisdiction_code} has been approved and applied`,
      });
    } else {
      // Reject the candidate
      await prisma.relocation_candidate_updates.update({
        where: { id: candidateId },
        data: {
          review_status: 'rejected',
          reviewed_by: reviewedBy,
          review_date: new Date().toISOString(),
          review_notes: reviewNotes || 'Rejected by admin',
        },
      });

      return NextResponse.json({
        success: true,
        action: 'rejected',
        message: `Tax rule update for ${candidate.jurisdiction_code} has been rejected`,
      });
    }
  } catch (error) {
    console.error('Error processing candidate update:', error);
    return NextResponse.json(
      { error: 'Failed to process candidate update' },
      { status: 500 }
    );
  }
}
