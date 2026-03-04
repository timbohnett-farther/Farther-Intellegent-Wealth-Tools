export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import {
  isAIEnabled,
  generateAdaptiveQuestion,
} from '@/lib/risk-profile/ai-service';
import type { AIQuestionContext } from '@/lib/risk-profile/ai-service';

export async function POST(request: NextRequest) {
  try {
    if (!isAIEnabled()) {
      return NextResponse.json(
        { error: 'AI not configured', fallback: true },
        { status: 503 },
      );
    }

    const body = (await request.json()) as AIQuestionContext;

    if (!body.intake || typeof body.questionNumber !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      );
    }

    const question = await generateAdaptiveQuestion(body);

    return NextResponse.json({ question, fallback: false });
  } catch (error) {
    console.error('AI question generation failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'AI generation failed',
        fallback: true,
      },
      { status: 500 },
    );
  }
}
