// ==================== EMAIL COMPOSER ====================
// Template-based email generation from plan insights, with optional
// AI-enhanced version via the AI gateway.

import type {
  PlanInsight,
  AdvisorInfo,
  ClientInfo,
  DraftEmail,
} from '../types';

import { callAI, extractJSON, isAIAvailable } from '../../ai/gateway';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

/** Get the client's preferred greeting name. */
function greetingName(client: ClientInfo): string {
  return client.preferredName ?? client.firstName;
}

/** Map insight category to a client-friendly subject line prefix. */
function subjectPrefix(category: string): string {
  const prefixes: Record<string, string> = {
    tax: 'Tax Planning Update',
    retirement: 'Retirement Planning Update',
    estate: 'Estate Planning Update',
    insurance: 'Insurance Review',
    investment: 'Portfolio Update',
    social_security: 'Social Security Planning',
    healthcare: 'Medicare Planning Update',
    cash_flow: 'Cash Flow Update',
    opportunity: 'Planning Opportunity',
    compliance: 'Compliance Update',
  };
  return prefixes[category] ?? 'Financial Planning Update';
}

/** Map insight type to a tone-appropriate opening line. */
function openingLine(insight: PlanInsight, clientName: string): string {
  switch (insight.type) {
    case 'alert':
      return `I wanted to bring an important item to your attention regarding your financial plan.`;
    case 'opportunity':
      return `I've identified an opportunity that could benefit your financial situation, and I wanted to share it with you.`;
    case 'anomaly':
      return `During my review of your financial plan, I noticed a change that I'd like to discuss with you.`;
    case 'recommendation':
      return `Based on my analysis of your financial plan, I have a recommendation I'd like to share with you.`;
    case 'informational':
    default:
      return `I have an update regarding your financial plan that I'd like to share with you.`;
  }
}

/** Generate the body section explaining the insight. */
function insightExplanation(insight: PlanInsight): string {
  const lines: string[] = [];

  // Main explanation
  lines.push(insight.summary);
  lines.push('');

  // Impact statement
  if (insight.estimatedImpact.amount > 0) {
    const impactVerb = insight.estimatedImpact.type === 'savings'
      ? 'save approximately'
      : insight.estimatedImpact.type === 'gain'
        ? 'potentially gain approximately'
        : insight.estimatedImpact.type === 'risk_reduction'
          ? 'reduce risk exposure by approximately'
          : 'avoid approximately';

    lines.push(
      `By addressing this, we could ${impactVerb} ${formatCurrency(insight.estimatedImpact.amount)} (${insight.estimatedImpact.timeframe}).`
    );
    lines.push('');
  }

  return lines.join('\n');
}

/** Generate recommended next steps section. */
function nextStepsSection(insight: PlanInsight): string {
  const actions = insight.actions.filter(
    a => a.type === 'schedule_meeting' || a.type === 'run_analysis'
  );

  if (actions.length === 0) {
    return 'I would like to schedule a brief call to discuss this in more detail and determine the best course of action for your situation.';
  }

  const hasMeeting = actions.some(a => a.type === 'schedule_meeting');
  const hasAnalysis = actions.some(a => a.type === 'run_analysis');

  if (hasMeeting && hasAnalysis) {
    return 'I recommend we schedule a brief meeting to review the analysis I\'ve prepared and discuss the best path forward. Would any time this week or next work for a 20-30 minute conversation?';
  }
  if (hasMeeting) {
    return 'I\'d like to schedule a meeting to discuss this in more detail. Would any time this week or next work for a brief conversation?';
  }
  return 'I\'ve prepared some additional analysis on this topic and would be happy to walk you through it at your convenience. Shall I send over the details, or would you prefer to discuss over a call?';
}

/** Generate the closing section. */
function closingSection(advisor: AdvisorInfo): string {
  return [
    `Please don't hesitate to reach out if you have any questions before we connect.`,
    '',
    'Best regards,',
    advisor.name,
    advisor.title,
    advisor.firmName,
    advisor.phone,
    advisor.email,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/**
 * Composes a professional draft email from a plan insight.
 *
 * The email is template-based and produces a polished first draft that the
 * advisor can review and personalize before sending. The tone adapts to the
 * insight type (alert vs. opportunity vs. informational).
 *
 * Email structure:
 * 1. Personalized greeting
 * 2. Context-appropriate opening line
 * 3. Insight explanation and impact
 * 4. Recommended next steps
 * 5. Professional closing with advisor contact info
 *
 * @param insight - The plan insight to compose an email about
 * @param advisor - Advisor information for the signature
 * @param client - Client information for personalization
 * @returns A DraftEmail ready for advisor review
 *
 * @example
 * ```ts
 * const email = composeClientEmail(insight, advisorInfo, clientInfo);
 * // email.isDraft === true — advisor reviews before sending
 * ```
 */
export function composeClientEmail(
  insight: PlanInsight,
  advisor: AdvisorInfo,
  client: ClientInfo,
): DraftEmail {
  const clientGreeting = greetingName(client);
  const subject = `${subjectPrefix(insight.category)}: ${insight.title}`;
  const opening = openingLine(insight, clientGreeting);
  const explanation = insightExplanation(insight);
  const nextSteps = nextStepsSection(insight);
  const closing = closingSection(advisor);

  const bodyParts: string[] = [
    `Dear ${clientGreeting},`,
    '',
    opening,
    '',
    explanation,
    nextSteps,
    '',
    closing,
  ];

  const body = bodyParts.join('\n');

  return {
    to: client.email,
    from: advisor.email,
    subject,
    body,
    isDraft: true,
    insightId: insight.id,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// AI-ENHANCED VERSION
// ---------------------------------------------------------------------------

const EMAIL_SYSTEM_PROMPT = `Compose a professional advisor-to-client email about a financial planning insight.

Rules:
1. Use a warm but professional tone appropriate for a wealth management relationship
2. Open with a personalized greeting using the client's preferred name
3. Explain the insight clearly without excessive jargon
4. Include specific numbers (dollar amounts, percentages) when available
5. Suggest a clear next step (meeting, call, or review)
6. Close with the advisor's full contact information
7. Keep the email concise — 150-250 words in the body

Return ONLY a JSON object with this structure:
{
  "subject": "Email subject line",
  "body": "Full email body text"
}`;

/**
 * AI-enhanced email composition from a plan insight.
 * Falls back to the template-based `composeClientEmail()` on any error.
 */
export async function composeClientEmailEnhanced(
  insight: PlanInsight,
  advisor: AdvisorInfo,
  client: ClientInfo,
): Promise<DraftEmail> {
  if (!isAIAvailable()) {
    return composeClientEmail(insight, advisor, client);
  }

  try {
    const clientName = client.preferredName ?? client.firstName;

    const userPrompt = `Compose an email for this insight:

ADVISOR: ${advisor.name}, ${advisor.title} at ${advisor.firmName}
  Email: ${advisor.email} | Phone: ${advisor.phone}

CLIENT: ${clientName} ${client.lastName} (email: ${client.email})

INSIGHT:
  Type: ${insight.type}
  Category: ${insight.category}
  Title: ${insight.title}
  Summary: ${insight.summary}
  Impact: ${insight.estimatedImpact.type} of $${insight.estimatedImpact.amount.toLocaleString()} (${insight.estimatedImpact.timeframe})

Available actions: ${insight.actions.map(a => a.label).join(', ') || 'Schedule a meeting'}`;

    const response = await callAI({
      systemPrompt: EMAIL_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.5,
      maxTokens: 1024,
      jsonMode: true,
    });

    const parsed = extractJSON<{ subject: string; body: string }>(response.text);

    return {
      to: client.email,
      from: advisor.email,
      subject: parsed.subject,
      body: parsed.body,
      isDraft: true,
      insightId: insight.id,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('[EmailComposer] AI generation failed, falling back to template:', error);
    return composeClientEmail(insight, advisor, client);
  }
}
