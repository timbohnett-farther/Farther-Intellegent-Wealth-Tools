/**
 * AI Narrative Generator
 *
 * Uses MiniMax M2.7 to generate 6-section proposal narratives:
 * 1. Executive Summary
 * 2. Risk Analysis
 * 3. Portfolio Diagnosis
 * 4. Recommendation
 * 5. Fee Transparency
 * 6. What Happens Next
 */

import type { PortfolioMetrics } from '@/lib/proposal-engine/types';
import { riskScoreToLabel } from '@/lib/proposal-engine/types';
import { callAI, extractJSON } from '@/lib/ai/gateway';

/**
 * Narrative context (inputs for AI generation)
 */
export interface NarrativeContext {
  clientName: string;
  proposalType: string; // e.g., 'New Client Onboarding', 'Annual Review', 'Rebalance'
  occasion: string; // e.g., 'Initial Portfolio Review', 'Q1 2024 Review'
  assetsInScope: number; // Dollar amount
  currentMetrics: PortfolioMetrics;
  proposedMetrics: PortfolioMetrics;
  riskLabel?: string;
  feeReduction?: number; // Annual fee savings in dollars
}

/**
 * Generated proposal narrative (6 sections)
 */
export interface ProposalNarrative {
  executiveSummary: string;
  riskAnalysis: string;
  portfolioDiagnosis: string;
  recommendation: string;
  feeTransparency: string;
  whatHappensNext: string;
  generatedAt: string; // ISO timestamp
  provider: string; // 'minimax' or 'fallback'
}

/**
 * Generate AI-powered proposal narrative
 */
export async function generateNarrative(params: {
  proposal: NarrativeContext;
  riskScore?: number;
  feeSavings?: { annual: number };
  topImprovements?: string[];
}): Promise<ProposalNarrative> {
  const { proposal, riskScore = 50, feeSavings, topImprovements = [] } = params;

  // Build system prompt
  const systemPrompt = buildSystemPrompt();

  // Build user prompt with numerical context
  const userPrompt = buildUserPrompt({
    proposal,
    riskScore,
    feeSavings,
    topImprovements,
  });

  try {
    // Call AI with JSON mode
    const response = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 2000,
      jsonMode: true,
    });

    // Parse JSON response
    const narrative = extractJSON<ProposalNarrative>(response.text);

    if (!validateNarrative(narrative)) {
      throw new Error('Invalid narrative structure from AI');
    }

    return {
      ...narrative,
      generatedAt: new Date().toISOString(),
      provider: response.provider,
    };
  } catch (err) {
    console.error('[narrative-generator] AI generation failed:', err);

    // Fallback to template-based narrative
    return generateFallbackNarrative(params);
  }
}

/**
 * Build system prompt positioning AI as Farther's portfolio analyst
 */
function buildSystemPrompt(): string {
  return `You are Farther's AI-powered portfolio analyst. Your role is to translate complex financial data into clear, professional narratives that advisors can present to clients.

Your tone is:
- Professional but approachable
- Data-driven but human
- Confident but not salesy
- Transparent about fees and risks

You generate proposal narratives in 6 sections:
1. Executive Summary (2-3 sentences): High-level overview of the proposal and key benefits
2. Risk Analysis (2-4 sentences): Explain the portfolio's risk profile and how it aligns with the client's goals
3. Portfolio Diagnosis (2-4 sentences): Identify current portfolio issues (fees, concentration, risk/return mismatch)
4. Recommendation (2-4 sentences): Propose specific changes and explain why they improve the portfolio
5. Fee Transparency (2-3 sentences): Break down fee structure and savings in clear terms
6. What Happens Next (2-3 sentences): Outline the implementation process and timeline

Return ONLY valid JSON with these 6 keys: executiveSummary, riskAnalysis, portfolioDiagnosis, recommendation, feeTransparency, whatHappensNext.`;
}

/**
 * Build user prompt with all numerical context
 */
function buildUserPrompt(params: {
  proposal: NarrativeContext;
  riskScore: number;
  feeSavings?: { annual: number };
  topImprovements: string[];
}): string {
  const { proposal, riskScore, feeSavings, topImprovements } = params;

  const riskLabel = riskScoreToLabel(riskScore);

  const sections = [
    `Generate a proposal narrative for ${proposal.clientName}.`,
    '',
    `**Context:**`,
    `- Proposal Type: ${proposal.proposalType}`,
    `- Occasion: ${proposal.occasion}`,
    `- Assets in Scope: ${formatCurrency(proposal.assetsInScope)}`,
    '',
    `**Current Portfolio:**`,
    `- Total Value: ${formatCurrency(proposal.currentMetrics.totalValue)}`,
    `- Holdings: ${proposal.currentMetrics.holdingCount}`,
    `- Expense Ratio: ${(proposal.currentMetrics.weightedExpenseRatio * 100).toFixed(2)}%`,
    `- Estimated Yield: ${((proposal.currentMetrics.estimatedYield ?? 0) * 100).toFixed(2)}%`,
    `- Equity Allocation: ${proposal.currentMetrics.equityPct.toFixed(1)}%`,
    '',
    `**Proposed Portfolio:**`,
    `- Total Value: ${formatCurrency(proposal.proposedMetrics.totalValue)}`,
    `- Holdings: ${proposal.proposedMetrics.holdingCount}`,
    `- Expense Ratio: ${(proposal.proposedMetrics.weightedExpenseRatio * 100).toFixed(2)}%`,
    `- Estimated Yield: ${((proposal.proposedMetrics.estimatedYield ?? 0) * 100).toFixed(2)}%`,
    `- Equity Allocation: ${proposal.proposedMetrics.equityPct.toFixed(1)}%`,
    '',
    `**Risk Assessment:**`,
    `- Risk Score: ${riskScore} (${riskLabel})`,
    proposal.riskLabel ? `- Risk Label: ${proposal.riskLabel}` : '',
    '',
  ];

  if (feeSavings && feeSavings.annual > 0) {
    sections.push(`**Fee Savings:**`);
    sections.push(`- Annual Savings: ${formatCurrency(feeSavings.annual)}`);
    sections.push('');
  }

  if (topImprovements.length > 0) {
    sections.push(`**Key Improvements:**`);
    topImprovements.forEach(improvement => {
      sections.push(`- ${improvement}`);
    });
    sections.push('');
  }

  sections.push(
    'Generate the 6-section narrative. Return ONLY valid JSON with keys: executiveSummary, riskAnalysis, portfolioDiagnosis, recommendation, feeTransparency, whatHappensNext.'
  );

  return sections.filter(Boolean).join('\n');
}

/**
 * Validate AI-generated narrative structure
 */
function validateNarrative(narrative: unknown): narrative is ProposalNarrative {
  if (typeof narrative !== 'object' || narrative === null) return false;

  const n = narrative as Record<string, unknown>;

  return (
    typeof n.executiveSummary === 'string' &&
    typeof n.riskAnalysis === 'string' &&
    typeof n.portfolioDiagnosis === 'string' &&
    typeof n.recommendation === 'string' &&
    typeof n.feeTransparency === 'string' &&
    typeof n.whatHappensNext === 'string'
  );
}

/**
 * Generate template-based fallback narrative when AI fails
 */
function generateFallbackNarrative(params: {
  proposal: NarrativeContext;
  riskScore?: number;
  feeSavings?: { annual: number };
  topImprovements?: string[];
}): ProposalNarrative {
  const { proposal, riskScore = 50, feeSavings, topImprovements = [] } = params;
  const riskLabel = riskScoreToLabel(riskScore);

  const executiveSummary = `We've prepared a comprehensive portfolio review for ${proposal.clientName} covering ${formatCurrency(proposal.assetsInScope)} in assets. This proposal outlines strategic recommendations to optimize your portfolio's risk-return profile while reducing costs.`;

  const riskAnalysis = `Your portfolio's current risk profile is rated ${riskLabel} (score: ${riskScore}/100). ${
    riskScore > 70
      ? 'This reflects a higher-risk growth-oriented allocation suitable for long-term wealth accumulation.'
      : riskScore > 40
      ? 'This reflects a moderate risk profile balancing growth potential with downside protection.'
      : 'This reflects a conservative allocation prioritizing capital preservation with modest growth potential.'
  }`;

  const portfolioDiagnosis = `Your current portfolio contains ${
    proposal.currentMetrics.holdingCount
  } holdings with a weighted expense ratio of ${(
    proposal.currentMetrics.weightedExpenseRatio * 100
  ).toFixed(2)}%. ${
    topImprovements.length > 0
      ? `Key areas for improvement include: ${topImprovements.slice(0, 2).join(', ')}.`
      : 'Our analysis identifies opportunities to enhance diversification and reduce embedded costs.'
  }`;

  const recommendation = `We recommend transitioning to a portfolio of ${
    proposal.proposedMetrics.holdingCount
  } holdings with a lower expense ratio of ${(
    proposal.proposedMetrics.weightedExpenseRatio * 100
  ).toFixed(2)}%. This rebalanced approach maintains your target risk profile while improving cost efficiency and tax efficiency.`;

  const feeTransparency = feeSavings && feeSavings.annual > 0
    ? `By implementing these changes, you'll save approximately ${formatCurrency(
        feeSavings.annual
      )} annually in embedded fund fees. Over time, these savings compound meaningfully, enhancing your long-term wealth accumulation.`
    : `Our advisory fee structure is fully transparent and designed to align our interests with yours. All fees are clearly disclosed in your Investment Advisory Agreement, with no hidden costs or transaction charges.`;

  const whatHappensNext = `Once you approve this proposal, we'll execute the recommended changes within 3-5 business days. You'll receive a detailed implementation report confirming all trades, and your updated portfolio will be reflected in your next quarterly statement. We're here to answer any questions along the way.`;

  return {
    executiveSummary,
    riskAnalysis,
    portfolioDiagnosis,
    recommendation,
    feeTransparency,
    whatHappensNext,
    generatedAt: new Date().toISOString(),
    provider: 'fallback',
  };
}

/**
 * Format currency for display
 */
function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
