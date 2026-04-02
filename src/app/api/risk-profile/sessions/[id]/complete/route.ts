export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

/**
 * POST /api/risk-profile/sessions/[id]/complete
 * Finalize a session and create a RiskProfile record from the scores.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { scores, composite, assetClassEligibility } = body;

    if (!scores || !composite) {
      return NextResponse.json(
        { error: 'scores and composite are required' },
        { status: 400 },
      );
    }

    // Verify session exists and is in progress
    const session = await (prisma as any).questionnaireSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Session is already completed or abandoned' },
        { status: 400 },
      );
    }

    // Calculate duration
    const now = new Date();
    const durationSeconds = Math.round(
      (now.getTime() - new Date(session.startedAt).getTime()) / 1000,
    );

    // Mark session as completed
    await (prisma as any).questionnaireSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        completionPct: 100,
        completedAt: now,
        durationSeconds,
      },
    });

    // Create risk profile
    const profile = await (prisma as any).riskProfile.create({
      data: {
        clientId: session.clientId,
        status: 'active',
        scores: JSON.stringify(scores),
        composite: JSON.stringify(composite),
        assetClassEligibility: JSON.stringify(assetClassEligibility ?? {}),
        createdBySessionId: sessionId,
        effectiveDate: now,
      },
    });

    // Create initial profile version
    await (prisma as any).profileVersion.create({
      data: {
        profileId: profile.id,
        version: 1,
        changeType: 'initial',
        trigger: 'questionnaire_completion',
        newScores: JSON.stringify(scores),
        materialChange: false,
      },
    });

    // Link profile back to session
    await (prisma as any).questionnaireSession.update({
      where: { id: sessionId },
      data: { profileId: profile.id },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/risk-profile/sessions/[id]/complete]', error);
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 },
    );
  }
}
