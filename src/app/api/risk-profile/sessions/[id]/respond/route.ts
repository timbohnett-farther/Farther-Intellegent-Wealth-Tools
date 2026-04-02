export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

/**
 * POST /api/risk-profile/sessions/[id]/respond
 * Save a response for a given session and return the next question number.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const {
      questionItemId,
      sequenceNumber,
      presentedStem,
      responseValue,
      responseLabel,
      scoring,
      aiAnalysis,
      timeToAnswerMs,
    } = body;

    if (questionItemId == null || sequenceNumber == null || responseValue == null) {
      return NextResponse.json(
        { error: 'questionItemId, sequenceNumber, and responseValue are required' },
        { status: 400 },
      );
    }

    // Verify session exists and is in progress
    const session = await prisma.questionnaireSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Session is not in progress' },
        { status: 400 },
      );
    }

    // Upsert response (allow re-answering)
    const response = await prisma.sessionResponse.create({
      data: {
        sessionId,
        questionItemId,
        sequenceNumber,
        presentedStem: presentedStem ?? '',
        responseValue,
        responseLabel: responseLabel ?? null,
        scoring: scoring ? JSON.stringify(scoring) : null,
        aiAnalysis: aiAnalysis ? JSON.stringify(aiAnalysis) : null,
        timeToAnswerMs: timeToAnswerMs ?? null,
        answeredAt: new Date(),
      },
    });

    // Update session completion percentage
    const responseCount = await prisma.sessionResponse.count({
      where: { sessionId },
    });
    const completionPct = Math.min(
      100,
      (responseCount / session.totalQuestions) * 100,
    );

    await prisma.questionnaireSession.update({
      where: { id: sessionId },
      data: { completionPct },
    });

    return NextResponse.json({
      response,
      completionPct,
      nextSequenceNumber: sequenceNumber + 1,
    });
  } catch (error) {
    console.error('[POST /api/risk-profile/sessions/[id]/respond]', error);
    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 },
    );
  }
}
