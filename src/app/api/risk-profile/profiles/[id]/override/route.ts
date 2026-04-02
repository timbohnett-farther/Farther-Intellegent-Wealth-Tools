export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

/**
 * PATCH /api/risk-profile/profiles/[id]/override
 * Advisor override: change the recommended band with a documented reason.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { newComposite, reason, advisorId } = body;

    if (!newComposite || !reason) {
      return NextResponse.json(
        { error: 'newComposite and reason are required' },
        { status: 400 },
      );
    }

    // Fetch current profile
    const existing = await (prisma as any).riskProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const previousScores = existing.scores;
    const newVersion = existing.version + 1;

    // Update profile with override
    const updated = await (prisma as any).riskProfile.update({
      where: { id },
      data: {
        composite: JSON.stringify(newComposite),
        advisorOverride: true,
        advisorOverrideReason: reason,
        version: newVersion,
      },
    });

    // Create version record for audit trail
    await (prisma as any).profileVersion.create({
      data: {
        profileId: id,
        version: newVersion,
        changeType: 'advisor_adjustment',
        trigger: reason,
        previousScores,
        newScores: JSON.stringify(newComposite),
        materialChange: true,
        complianceNote: `Advisor override applied: ${reason}`,
        advisorAcked: true,
        advisorAckedAt: new Date(),
        changedBy: advisorId ?? 'advisor',
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error('[PATCH /api/risk-profile/profiles/[id]/override]', error);
    return NextResponse.json(
      { error: 'Failed to apply override' },
      { status: 500 },
    );
  }
}
