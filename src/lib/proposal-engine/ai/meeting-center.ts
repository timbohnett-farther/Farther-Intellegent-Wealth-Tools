/**
 * AI Meeting Center — Pre-Meeting, Real-Time, and Post-Meeting Assistance
 *
 * Provides AI-powered support across the entire advisor-client meeting lifecycle:
 * - Pre-meeting briefs with personalized talking points
 * - Real-time insights during meetings (from transcript)
 * - Post-meeting summaries with action items and sentiment analysis
 *
 * Uses the AI Gateway (callAI + extractJSON) with structured JSON output.
 * All functions gracefully degrade to template-based fallbacks if AI fails.
 *
 * @module proposal-engine/ai/meeting-center
 */

import { callAI, extractJSON } from '@/lib/ai/gateway';

// ═════════════════════════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════════════════════════

export interface PreMeetingParams {
  clientName: string;
  proposalType: string;
  currentPortfolio?: {
    totalValue: number;
    holdingCount: number;
    topHoldings: string[];
  };
  riskScore?: number;
  meetingNotes?: string;
  previousProposals?: Array<{
    date: string;
    status: string;
    type: string;
  }>;
}

export interface PreMeetingBrief {
  summary: string;
  talkingPoints: string[];
  clientConcerns: string[];
  questionsToAsk: string[];
  portfolioHighlights: string[];
  suggestedAgenda: string[];
}

export interface RealTimeParams {
  transcript: string;
  clientName: string;
  currentContext: string;
}

export type InsightType = 'SUGGESTION' | 'WARNING' | 'OPPORTUNITY' | 'COMPLIANCE';

export interface RealTimeInsight {
  type: InsightType;
  text: string;
  confidence: number;
}

export interface PostMeetingParams {
  transcript: string;
  clientName: string;
  proposalId?: string;
}

export type TaskOwner = 'ADVISOR' | 'CLIENT' | 'OPS';

export type ClientSentiment = 'POSITIVE' | 'NEUTRAL' | 'CONCERNED' | 'NEGATIVE';

export interface PostMeetingSummary {
  summary: string;
  keyDecisions: string[];
  actionItems: Array<{
    task: string;
    owner: TaskOwner;
    deadline?: string;
  }>;
  nextSteps: string[];
  clientSentiment: ClientSentiment;
  proposalUpdates: string[];
}

// ═════════════════════════════════════════════════════════════════════════════
// Pre-Meeting Brief
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Generate a personalized pre-meeting brief for the advisor.
 * Analyzes client context to surface talking points, concerns, and opportunities.
 *
 * @param params - Client and proposal context
 * @returns Structured brief with agenda, talking points, and questions
 *
 * @example
 * ```ts
 * const brief = await generatePreMeetingBrief({
 *   clientName: "Sarah Johnson",
 *   proposalType: "RETIREMENT_TRANSITION",
 *   currentPortfolio: { totalValue: 2_500_000, holdingCount: 45, topHoldings: ["SPY", "AGG"] },
 *   riskScore: 65
 * });
 * console.log(brief.talkingPoints);
 * // ["Discuss phased retirement income strategy", "Review bond allocation for rate environment"]
 * ```
 */
export async function generatePreMeetingBrief(
  params: PreMeetingParams
): Promise<PreMeetingBrief> {
  const systemPrompt = `You are a senior wealth advisor preparing for a client meeting. Generate a comprehensive pre-meeting brief based on the client context provided. Focus on actionable talking points, anticipated concerns, and strategic questions to ask.

Output ONLY valid JSON matching this schema:
{
  "summary": "string (2-3 sentence overview)",
  "talkingPoints": ["string", ...],
  "clientConcerns": ["string", ...],
  "questionsToAsk": ["string", ...],
  "portfolioHighlights": ["string", ...],
  "suggestedAgenda": ["string", ...]
}`;

  const userPrompt = `Client: ${params.clientName}
Proposal Type: ${params.proposalType}
${params.currentPortfolio ? `
Current Portfolio:
- Total Value: $${(params.currentPortfolio.totalValue / 100).toLocaleString()}
- Holdings: ${params.currentPortfolio.holdingCount}
- Top Positions: ${params.currentPortfolio.topHoldings.join(', ')}
` : ''}
${params.riskScore ? `Risk Score: ${params.riskScore}/100` : ''}
${params.meetingNotes ? `\nNotes: ${params.meetingNotes}` : ''}
${params.previousProposals?.length ? `\nPrevious Proposals: ${params.previousProposals.map(p => `${p.type} (${p.date}, ${p.status})`).join(', ')}` : ''}

Generate a pre-meeting brief with 4-6 talking points, anticipated concerns, strategic questions, portfolio highlights, and a suggested agenda.`;

  try {
    const response = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 2048,
      jsonMode: true,
    });

    return extractJSON<PreMeetingBrief>(response.text);
  } catch (err) {
    console.warn('[Meeting Center] AI pre-meeting brief failed, using template fallback:', err);
    return generatePreMeetingBriefFallback(params);
  }
}

function generatePreMeetingBriefFallback(params: PreMeetingParams): PreMeetingBrief {
  const portfolio = params.currentPortfolio;
  return {
    summary: `Meeting with ${params.clientName} to discuss ${params.proposalType.toLowerCase().replace(/_/g, ' ')} strategy.`,
    talkingPoints: [
      `Review current portfolio performance and allocation`,
      portfolio ? `Discuss ${portfolio.holdingCount} holdings and concentration risk` : 'Capture current portfolio holdings',
      `Align investment strategy with client goals`,
      `Present proposed portfolio solution`,
    ],
    clientConcerns: [
      'Market volatility and downside protection',
      'Tax efficiency of transitions',
      'Fee transparency',
    ],
    questionsToAsk: [
      'What are your primary financial goals for the next 1-3 years?',
      'How do you feel about your current portfolio allocation?',
      'Are there any life changes on the horizon we should plan for?',
    ],
    portfolioHighlights: portfolio
      ? [`Total portfolio value: $${(portfolio.totalValue / 100).toLocaleString()}`, `Top holdings: ${portfolio.topHoldings.join(', ')}`]
      : ['Capture current holdings to establish baseline'],
    suggestedAgenda: [
      'Introductions and context (5 min)',
      'Review current portfolio (10 min)',
      'Discuss risk profile and goals (10 min)',
      'Present proposed solution (15 min)',
      'Q&A and next steps (10 min)',
    ],
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Real-Time Insights
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Analyze a live meeting transcript to surface real-time insights for the advisor.
 * Identifies opportunities, warnings, compliance issues, and actionable suggestions.
 *
 * @param params - Transcript snippet and meeting context
 * @returns Array of insights with type, text, and confidence score
 *
 * @example
 * ```ts
 * const insights = await generateRealTimeInsights({
 *   transcript: "Client: I'm worried about losing 20% again like in 2022...",
 *   clientName: "John Smith",
 *   currentContext: "Discussing risk tolerance"
 * });
 * console.log(insights);
 * // [{ type: 'SUGGESTION', text: 'Address loss aversion — review downside protection strategies', confidence: 0.85 }]
 * ```
 */
export async function generateRealTimeInsights(
  params: RealTimeParams
): Promise<RealTimeInsight[]> {
  const systemPrompt = `You are an AI assistant monitoring a live advisor-client meeting. Analyze the transcript excerpt and surface actionable real-time insights.

Insight types:
- SUGGESTION: Recommended talking points or clarifications
- WARNING: Potential miscommunication or red flags
- OPPORTUNITY: Client signals an unarticulated need or opportunity
- COMPLIANCE: Regulatory or disclosure reminder

Output ONLY valid JSON array:
[
  { "type": "SUGGESTION|WARNING|OPPORTUNITY|COMPLIANCE", "text": "string", "confidence": number (0-1) },
  ...
]

Limit to 3-5 highest-priority insights.`;

  const userPrompt = `Client: ${params.clientName}
Context: ${params.currentContext}

Transcript:
${params.transcript}

Analyze for insights (suggestions, warnings, opportunities, compliance).`;

  try {
    const response = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      maxTokens: 1024,
      jsonMode: true,
    });

    return extractJSON<RealTimeInsight[]>(response.text);
  } catch (err) {
    console.warn('[Meeting Center] AI real-time insights failed, using fallback:', err);
    return generateRealTimeInsightsFallback(params);
  }
}

function generateRealTimeInsightsFallback(params: RealTimeParams): RealTimeInsight[] {
  const transcript = params.transcript.toLowerCase();
  const insights: RealTimeInsight[] = [];

  if (transcript.includes('lose') || transcript.includes('risk') || transcript.includes('worried')) {
    insights.push({
      type: 'SUGGESTION',
      text: 'Client expressing concern about risk — reinforce downside protection strategies and historical recovery periods',
      confidence: 0.75,
    });
  }

  if (transcript.includes('fee') || transcript.includes('cost') || transcript.includes('expense')) {
    insights.push({
      type: 'OPPORTUNITY',
      text: 'Client focused on fees — emphasize value-add services and all-in cost transparency',
      confidence: 0.70,
    });
  }

  if (transcript.includes('tax') || transcript.includes('gain') || transcript.includes('loss')) {
    insights.push({
      type: 'SUGGESTION',
      text: 'Tax conversation — consider phased transition strategies or tax-loss harvesting',
      confidence: 0.65,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'SUGGESTION',
      text: 'Continue active listening — no immediate action items detected',
      confidence: 0.50,
    });
  }

  return insights;
}

// ═════════════════════════════════════════════════════════════════════════════
// Post-Meeting Summary
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Generate a structured post-meeting summary from the full transcript.
 * Extracts key decisions, action items, next steps, and client sentiment.
 *
 * @param params - Full transcript and meeting identifiers
 * @returns Summary with action items, sentiment, and proposal updates
 *
 * @example
 * ```ts
 * const summary = await generatePostMeetingSummary({
 *   transcript: "...",
 *   clientName: "Emily Chen",
 *   proposalId: "prop_abc123"
 * });
 * console.log(summary.clientSentiment); // 'POSITIVE'
 * console.log(summary.actionItems); // [{ task: "Send updated proposal", owner: "ADVISOR", deadline: "2026-04-10" }]
 * ```
 */
export async function generatePostMeetingSummary(
  params: PostMeetingParams
): Promise<PostMeetingSummary> {
  const systemPrompt = `You are a senior wealth advisor's executive assistant. Generate a comprehensive post-meeting summary from the transcript.

Extract:
- Summary (2-3 sentences)
- Key decisions made
- Action items (with owner: ADVISOR|CLIENT|OPS, and optional deadline)
- Next steps
- Client sentiment (POSITIVE|NEUTRAL|CONCERNED|NEGATIVE)
- Proposal updates (specific changes needed)

Output ONLY valid JSON:
{
  "summary": "string",
  "keyDecisions": ["string", ...],
  "actionItems": [
    { "task": "string", "owner": "ADVISOR|CLIENT|OPS", "deadline": "YYYY-MM-DD or null" },
    ...
  ],
  "nextSteps": ["string", ...],
  "clientSentiment": "POSITIVE|NEUTRAL|CONCERNED|NEGATIVE",
  "proposalUpdates": ["string", ...]
}`;

  const userPrompt = `Client: ${params.clientName}
${params.proposalId ? `Proposal ID: ${params.proposalId}` : ''}

Full Transcript:
${params.transcript}

Generate a complete post-meeting summary with decisions, action items, sentiment, and next steps.`;

  try {
    const response = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      maxTokens: 2048,
      jsonMode: true,
    });

    return extractJSON<PostMeetingSummary>(response.text);
  } catch (err) {
    console.warn('[Meeting Center] AI post-meeting summary failed, using fallback:', err);
    return generatePostMeetingSummaryFallback(params);
  }
}

function generatePostMeetingSummaryFallback(params: PostMeetingParams): PostMeetingSummary {
  return {
    summary: `Meeting completed with ${params.clientName}. Discussed portfolio strategy and next steps.`,
    keyDecisions: [
      'Proceed with proposed portfolio allocation',
      'Schedule follow-up in 2 weeks',
    ],
    actionItems: [
      { task: 'Send updated proposal document', owner: 'ADVISOR' as TaskOwner },
      { task: 'Review and sign IAA', owner: 'CLIENT' as TaskOwner },
      { task: 'Initiate account opening process', owner: 'OPS' as TaskOwner },
    ],
    nextSteps: [
      'Advisor to send proposal by end of week',
      'Client to review and return signed documents',
      'Schedule implementation call',
    ],
    clientSentiment: 'NEUTRAL' as ClientSentiment,
    proposalUpdates: [
      'Update risk profile based on questionnaire responses',
      'Adjust allocation for tax-loss harvesting opportunities',
    ],
  };
}
