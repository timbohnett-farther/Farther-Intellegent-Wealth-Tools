export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

/**
 * POST /api/risk-profile/sessions
 * Start a new questionnaire session and persist it to the database.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, wealthTier, sessionType = 'full' } = body;

    if (!wealthTier) {
      return NextResponse.json(
        { error: 'wealthTier is required' },
        { status: 400 },
      );
    }

    const session = await prisma.questionnaireSession.create({
      data: {
        clientId: clientId ?? null,
        wealthTier,
        sessionType,
        status: 'in_progress',
        totalQuestions: 15,
        completionPct: 0,
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/risk-profile/sessions]', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 },
    );
  }
}
