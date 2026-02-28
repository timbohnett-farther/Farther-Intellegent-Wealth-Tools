import { NextRequest, NextResponse } from 'next/server';
import {
  isAIEnabled,
  generateAIProfile,
} from '@/lib/risk-profile/ai-service';
import type { AIProfileContext } from '@/lib/risk-profile/ai-service';
import type { RiskProfile, RiskBand } from '@/lib/risk-profile/types';
import { MODEL_PORTFOLIOS, BACKTEST_RESULTS } from '@/lib/risk-profile/portfolios';

export async function POST(request: NextRequest) {
  try {
    if (!isAIEnabled()) {
      return NextResponse.json(
        { error: 'AI not configured', fallback: true },
        { status: 503 },
      );
    }

    const body = (await request.json()) as AIProfileContext;

    if (!body.intake || !body.questions || !body.responses) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      );
    }

    const aiScores = await generateAIProfile(body);

    // Use AI-generated scores but static model portfolios and backtesting data
    const recommendedBand = Math.max(1, Math.min(7, aiScores.recommendedBand)) as RiskBand;
    const conservativeBand = Math.max(1, recommendedBand - 1) as RiskBand;
    const aggressiveBand = Math.min(7, recommendedBand + 1) as RiskBand;

    const profile: RiskProfile = {
      axisScores: {
        tolerance: clamp(aiScores.axisScores.tolerance, 0, 100),
        capacity: clamp(aiScores.axisScores.capacity, 0, 100),
        need: Math.max(0, aiScores.axisScores.need),
        biasIndex: clamp(aiScores.axisScores.biasIndex, 0, 100),
        complexity: clamp(aiScores.axisScores.complexity, 0, 100),
      },
      toleranceBand: clamp(aiScores.toleranceBand, 1, 7) as RiskBand,
      capacityBand: clamp(aiScores.capacityBand, 1, 7) as RiskBand,
      recommendedBand,

      conservativePortfolio: MODEL_PORTFOLIOS[conservativeBand],
      recommendedPortfolio: MODEL_PORTFOLIOS[recommendedBand],
      aggressivePortfolio: MODEL_PORTFOLIOS[aggressiveBand],

      conservativeBacktest: BACKTEST_RESULTS[conservativeBand],
      recommendedBacktest: BACKTEST_RESULTS[recommendedBand],
      aggressiveBacktest: BACKTEST_RESULTS[aggressiveBand],

      detectedBiases: (aiScores.detectedBiases ?? []).map(b => ({
        type: b.type as RiskProfile['detectedBiases'][number]['type'],
        severity: b.severity as 'low' | 'moderate' | 'high',
        description: b.description,
        advisorTalkingPoint: b.advisorTalkingPoint,
      })),

      inconsistencies: (aiScores.inconsistencies ?? []).map(i => ({
        dimensions: i.dimensions,
        severity: i.severity as 'info' | 'warning' | 'critical',
        description: i.description,
        recommendation: i.recommendation,
      })),

      goalFeasibility: (aiScores.goalFeasibility ?? []).map(g => ({
        goalName: g.goalName,
        requiredReturn: g.requiredReturn,
        recommendedReturn: g.recommendedReturn,
        feasible: g.feasible,
        shortfallNote: g.shortfallNote,
      })),

      confidence: clamp(aiScores.confidence, 0, 100),
      complianceNotes: aiScores.complianceNotes ?? '',
      questionCount: body.responses.length,
      completedAt: new Date().toISOString(),
    };

    return NextResponse.json({ profile, aiGenerated: true });
  } catch (error) {
    console.error('AI profile generation failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'AI profile generation failed',
        fallback: true,
      },
      { status: 500 },
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
