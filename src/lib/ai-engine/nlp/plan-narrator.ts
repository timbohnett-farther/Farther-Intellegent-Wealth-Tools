// ==================== PLAN NARRATOR ====================
// Generates plain-English executive summaries of financial plan results.
// Template-based generation with optional AI-enhanced version via gateway.

import type {
  PlanNarratorInput,
  PlanNarrative,
} from '../types';

import { callAI, isAIAvailable } from '../../ai/gateway';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural ?? singular + 's'}`;
}

/** Describe the success rate trend in plain English. */
function describeSuccessRateTrend(current: number, previous: number): string {
  const delta = current - previous;
  if (Math.abs(delta) < 0.01) {
    return 'remained stable';
  }
  if (delta > 0.05) {
    return `improved significantly from ${pct(previous)} to ${pct(current)}`;
  }
  if (delta > 0) {
    return `improved modestly from ${pct(previous)} to ${pct(current)}`;
  }
  if (delta < -0.05) {
    return `declined notably from ${pct(previous)} to ${pct(current)}`;
  }
  return `decreased slightly from ${pct(previous)} to ${pct(current)}`;
}

/** Describe the overall plan health. */
function describeOverallHealth(successRate: number): string {
  if (successRate >= 0.90) {
    return 'The plan is in excellent shape.';
  }
  if (successRate >= 0.80) {
    return 'The plan is on solid footing.';
  }
  if (successRate >= 0.70) {
    return 'The plan is in acceptable condition, though there is room for improvement.';
  }
  if (successRate >= 0.60) {
    return 'The plan has some areas of concern that warrant attention.';
  }
  return 'The plan requires immediate attention to improve its long-term sustainability.';
}

/** Describe the retirement timeline. */
function describeTimeline(clientAge: number, retirementYear: number, currentYear: number): string {
  const yearsToRetirement = retirementYear - currentYear;
  if (yearsToRetirement <= 0) {
    return `currently in retirement`;
  }
  if (yearsToRetirement <= 3) {
    return `approaching retirement in ${pluralize(yearsToRetirement, 'year')} (at age ${clientAge + yearsToRetirement})`;
  }
  if (yearsToRetirement <= 10) {
    return `${pluralize(yearsToRetirement, 'year')} from retirement (at age ${clientAge + yearsToRetirement})`;
  }
  return `${pluralize(yearsToRetirement, 'year')} from a planned retirement at age ${clientAge + yearsToRetirement}`;
}

/** Summarize goals. */
function describeGoals(goals: PlanNarratorInput['goalsSummary']): string {
  if (goals.length === 0) return '';

  const onTrack = goals.filter(g => g.status === 'on_track' || g.status === 'funded');
  const atRisk = goals.filter(g => g.status === 'at_risk');
  const underfunded = goals.filter(g => g.status === 'underfunded');

  const parts: string[] = [];

  if (onTrack.length > 0) {
    parts.push(`${pluralize(onTrack.length, 'goal')} ${onTrack.length === 1 ? 'is' : 'are'} on track`);
  }
  if (atRisk.length > 0) {
    const names = atRisk.map(g => g.goalName).join(', ');
    parts.push(`${pluralize(atRisk.length, 'goal')} ${atRisk.length === 1 ? 'is' : 'are'} at risk (${names})`);
  }
  if (underfunded.length > 0) {
    const names = underfunded.map(g => g.goalName).join(', ');
    parts.push(`${pluralize(underfunded.length, 'goal')} ${underfunded.length === 1 ? 'is' : 'are'} underfunded (${names})`);
  }

  return parts.join('; ') + '.';
}

/** Summarize alerts and insights. */
function describeAlerts(input: PlanNarratorInput): string {
  const alertCount = input.topAlerts.length;
  const insightCount = input.topInsights.length;

  if (alertCount === 0 && insightCount === 0) {
    return 'No immediate action items have been identified at this time.';
  }

  const parts: string[] = [];

  if (alertCount > 0) {
    const criticalAlerts = input.topAlerts.filter(a => a.severity === 'critical' || a.severity === 'high');
    if (criticalAlerts.length > 0) {
      parts.push(`There ${criticalAlerts.length === 1 ? 'is' : 'are'} ${pluralize(criticalAlerts.length, 'high-priority alert')} requiring attention`);
      // Include the top alert
      parts.push(`The most urgent item is: "${criticalAlerts[0].title}" — ${criticalAlerts[0].recommendedAction}`);
    } else {
      parts.push(`${pluralize(alertCount, 'alert')} ${alertCount === 1 ? 'has' : 'have'} been identified, all of moderate or lower priority`);
    }
  }

  if (insightCount > 0) {
    const topInsight = input.topInsights[0];
    if (topInsight && topInsight.estimatedImpact.amount > 0) {
      parts.push(`The top insight — "${topInsight.title}" — has an estimated ${topInsight.estimatedImpact.type} of ${formatCurrency(topInsight.estimatedImpact.amount)} (${topInsight.estimatedImpact.timeframe})`);
    }
  }

  return parts.join('. ') + '.';
}

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/**
 * Generates a plain-English executive summary of financial plan results.
 *
 * The narrative is template-based and does not make any external API calls.
 * It combines information about:
 * - Overall plan health (Monte Carlo success rate)
 * - Success rate trend (improving/declining)
 * - Retirement timeline
 * - Portfolio and net worth overview
 * - Goal funding status
 * - Top alerts and insights
 *
 * @param results - Plan summary data including alerts and insights
 * @returns A PlanNarrative with executive summary, timestamp, and model attribution
 *
 * @example
 * ```ts
 * const narrative = narratePlanSummary(results);
 * console.log(narrative.executiveSummary);
 * ```
 */
export function narratePlanSummary(results: PlanNarratorInput): PlanNarrative {
  const {
    clientName,
    clientAge,
    spouseAge,
    retirementYear,
    currentYear,
    successRate,
    previousSuccessRate,
    totalPortfolioValue,
    annualIncome,
    annualExpenses,
    netWorth,
    topAlerts,
    topInsights,
    goalsSummary,
  } = results;

  // ── Build executive summary paragraphs ─────────────────────────────────
  const paragraphs: string[] = [];

  // Opening paragraph: client overview and plan health
  const spouseClause = spouseAge !== null ? ` and spouse (age ${spouseAge})` : '';
  const timelineDesc = describeTimeline(clientAge, retirementYear, currentYear);
  const healthDesc = describeOverallHealth(successRate);
  const trendDesc = describeSuccessRateTrend(successRate, previousSuccessRate);

  paragraphs.push(
    `${clientName} (age ${clientAge})${spouseClause} is ${timelineDesc}. ` +
    `The Monte Carlo probability of plan success is ${pct(successRate)} and has ${trendDesc} since the last analysis. ` +
    healthDesc
  );

  // Financial overview paragraph
  const cashFlow = annualIncome - annualExpenses;
  const cashFlowDesc = cashFlow >= 0
    ? `a positive annual cash flow of ${formatCurrency(cashFlow)}`
    : `a cash flow deficit of ${formatCurrency(Math.abs(cashFlow))}/year`;

  paragraphs.push(
    `The total investment portfolio stands at ${formatCurrency(totalPortfolioValue)}, with a net worth of ${formatCurrency(netWorth)}. ` +
    `Annual income of ${formatCurrency(annualIncome)} against expenses of ${formatCurrency(annualExpenses)} produces ${cashFlowDesc}.`
  );

  // Goals paragraph
  if (goalsSummary.length > 0) {
    const goalsDesc = describeGoals(goalsSummary);
    paragraphs.push(`Of ${pluralize(goalsSummary.length, 'financial goal')} tracked in the plan, ${goalsDesc}`);
  }

  // Alerts and insights paragraph
  const alertsDesc = describeAlerts(results);
  paragraphs.push(alertsDesc);

  // Closing paragraph: next steps
  if (successRate < 0.80) {
    paragraphs.push(
      'Given the current success rate, a plan adjustment meeting is recommended. ' +
      'Key levers to explore include: increasing savings rates, adjusting retirement timing, ' +
      'reducing planned spending, or modifying the investment strategy.'
    );
  } else if (topInsights.length > 0 && topInsights[0].estimatedImpact.amount > 5_000) {
    paragraphs.push(
      `There are actionable opportunities to improve the plan further. ` +
      `The highest-value insight could generate ${formatCurrency(topInsights[0].estimatedImpact.amount)} in ${topInsights[0].estimatedImpact.type}. ` +
      `A brief review meeting is recommended to discuss these opportunities.`
    );
  } else {
    paragraphs.push(
      'The plan is progressing well. Continue with the current strategy and revisit during the next scheduled review.'
    );
  }

  const executiveSummary = paragraphs.join('\n\n');

  return {
    executiveSummary,
    generatedAt: new Date().toISOString(),
    modelUsed: 'template-v1',
  };
}

// ---------------------------------------------------------------------------
// AI-ENHANCED VERSION
// ---------------------------------------------------------------------------

const NARRATOR_SYSTEM_PROMPT = `You are a senior financial advisor writing a client-facing executive summary for a wealth management platform called "Farther Prism."

Your narrative must:
1. Be written in clear, professional English suitable for high-net-worth clients
2. Cover plan health (Monte Carlo success rate), portfolio overview, goal funding status, and key alerts/insights
3. Use specific numbers and percentages — never vague language
4. Be 3-4 paragraphs long
5. Close with a forward-looking recommendation (next steps or reassurance)
6. Maintain a confident but measured tone — acknowledge risks without causing alarm
7. Never use markdown formatting — plain text only`;

/**
 * AI-enhanced plan narrative generation.
 * Sends plan data to the AI gateway for a natural-language executive summary.
 * Falls back to the template-based `narratePlanSummary()` on any error.
 */
export async function narratePlanSummaryEnhanced(
  results: PlanNarratorInput,
): Promise<PlanNarrative> {
  if (!isAIAvailable()) {
    return narratePlanSummary(results);
  }

  try {
    const userPrompt = `Generate an executive summary for the following financial plan:

CLIENT: ${results.clientName}, age ${results.clientAge}${results.spouseAge !== null ? `, spouse age ${results.spouseAge}` : ''}
RETIREMENT YEAR: ${results.retirementYear} (current year: ${results.currentYear})
MONTE CARLO SUCCESS RATE: ${(results.successRate * 100).toFixed(1)}% (previous: ${(results.previousSuccessRate * 100).toFixed(1)}%)
TOTAL PORTFOLIO: $${results.totalPortfolioValue.toLocaleString()}
NET WORTH: $${results.netWorth.toLocaleString()}
ANNUAL INCOME: $${results.annualIncome.toLocaleString()}
ANNUAL EXPENSES: $${results.annualExpenses.toLocaleString()}

GOALS (${results.goalsSummary.length}):
${results.goalsSummary.map(g => `- ${g.goalName}: ${g.status} (${(g.fundedRatio * 100).toFixed(0)}% funded)`).join('\n') || 'None'}

TOP ALERTS (${results.topAlerts.length}):
${results.topAlerts.slice(0, 3).map(a => `- [${a.severity}] ${a.title}: ${a.recommendedAction}`).join('\n') || 'None'}

TOP INSIGHTS (${results.topInsights.length}):
${results.topInsights.slice(0, 3).map(i => `- ${i.title}: est. ${i.estimatedImpact.type} of $${i.estimatedImpact.amount.toLocaleString()} (${i.estimatedImpact.timeframe})`).join('\n') || 'None'}

Write a 3-4 paragraph executive summary.`;

    const response = await callAI({
      systemPrompt: NARRATOR_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.4,
      maxTokens: 2048,
    });

    return {
      executiveSummary: response.text.trim(),
      generatedAt: new Date().toISOString(),
      modelUsed: `${response.provider}/${response.model}`,
    };
  } catch (error) {
    console.warn('[PlanNarrator] AI generation failed, falling back to template:', error);
    return narratePlanSummary(results);
  }
}
