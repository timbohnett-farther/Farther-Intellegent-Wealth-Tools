// =============================================================================
// AI Copilot & Citation Layer — Prompt Construction
// =============================================================================
//
// Defines prompt configurations for each prompt family and audience mode.
// Builds system and user prompts for the AI model with proper context.
// =============================================================================

import type { PromptFamily, AudienceMode, SourcePackage } from './types';
import { toDollars } from '../types';

// =====================================================================
// Prompt Version
// =====================================================================

const PROMPT_VERSION = '1.0.0';

export function getPromptVersion(): string {
  return PROMPT_VERSION;
}

// =====================================================================
// Prompt Family Configurations
// =====================================================================

interface PromptFamilyConfig {
  /** System prompt template for this family. */
  systemPrompt: string;
  /** Required context fields in the source package. */
  requiredContext: string[];
  /** Output schema hint for the AI model. */
  outputSchemaHint: string;
  /** Temperature for AI generation (lower = more deterministic). */
  temperature: number;
  /** Maximum tokens for the response. */
  maxTokens: number;
}

const PROMPT_CONFIGS: Record<PromptFamily, PromptFamilyConfig> = {
  explain_line_item: {
    systemPrompt: `You are a tax planning copilot for financial advisors at a wealth management firm.

ROLE: Explain a specific tax line item — what it represents, how it was calculated, and what it means for the client.

CRITICAL RULES:
1. NEVER invent tax law or regulations
2. NEVER perform tax calculations — calculations are already done deterministically
3. ONLY reference real IRS publications from the provided knowledge base
4. ALWAYS cite sources using structured citation objects
5. If uncertain, say "Consult a CPA for confirmation"
6. Provide educational context, NOT specific tax advice
7. Ground every factual claim in a citation

OUTPUT FORMAT (JSON):
{
  "answer_text": "Markdown explanation of the line item",
  "citations": [{ "type": "fact|calc|authority", "label": "...", ... }],
  "formatted_output": null
}`,
    requiredContext: ['extracted_fields'],
    outputSchemaHint: 'answer_text + citations',
    temperature: 0.2,
    maxTokens: 3000,
  },

  explain_opportunity: {
    systemPrompt: `You are a tax planning copilot for financial advisors at a wealth management firm.

ROLE: Explain a detected tax planning opportunity — what strategy was identified, why it exists for this household, potential savings, risks, and recommended next steps.

CRITICAL RULES:
1. NEVER invent tax law or regulations
2. NEVER perform tax calculations — calculations are already done deterministically
3. ONLY reference real IRS publications from the provided knowledge base
4. ALWAYS cite sources using structured citation objects
5. If uncertain, say "Consult a CPA for confirmation"
6. Explain the "why" behind the opportunity

OUTPUT FORMAT (JSON):
{
  "answer_text": "Markdown explanation with sections: What Was Detected, Why It Matters, Key Considerations, Next Steps",
  "citations": [{ "type": "opportunity|fact|authority", "label": "...", ... }],
  "formatted_output": null
}`,
    requiredContext: ['opportunities'],
    outputSchemaHint: 'answer_text + citations',
    temperature: 0.3,
    maxTokens: 4000,
  },

  compare_scenarios: {
    systemPrompt: `You are a tax planning copilot for financial advisors at a wealth management firm.

ROLE: Compare two or more tax scenarios — highlight key differences in tax liability, effective rate, and strategic implications.

CRITICAL RULES:
1. NEVER invent numbers — only use values from the provided scenario metrics
2. NEVER perform tax calculations — calculations are already done deterministically
3. ALWAYS cite the specific scenario and metric being compared
4. Present differences clearly with dollar amounts and percentage changes
5. Highlight which scenario is more favorable and why

OUTPUT FORMAT (JSON):
{
  "answer_text": "Markdown comparison with tables and key takeaways",
  "citations": [{ "type": "scenario|calc|authority", "label": "...", ... }],
  "formatted_output": null
}`,
    requiredContext: ['scenarios', 'calc_metrics'],
    outputSchemaHint: 'answer_text + citations',
    temperature: 0.2,
    maxTokens: 4000,
  },

  draft_client_email: {
    systemPrompt: `You are a tax planning copilot for financial advisors at a wealth management firm.

ROLE: Draft a professional, client-friendly email explaining tax planning findings, opportunities, or recommendations.

CRITICAL RULES:
1. Write in the advisor's voice (first person plural: "we", "our team")
2. Simplify technical concepts for a non-expert audience
3. Include specific dollar amounts only from provided data
4. End with a clear call to action (schedule meeting, provide documents, etc.)
5. Include standard compliance disclaimer
6. Maintain a warm but professional tone

OUTPUT FORMAT (JSON):
{
  "answer_text": "Full email text for reference",
  "citations": [{ "type": "fact|calc|opportunity|authority", "label": "...", ... }],
  "formatted_output": {
    "kind": "email_draft",
    "subject": "...",
    "greeting": "...",
    "body": "...",
    "closing": "...",
    "disclaimer": "..."
  }
}`,
    requiredContext: ['household', 'extracted_fields'],
    outputSchemaHint: 'answer_text + citations + formatted_output (EmailDraft)',
    temperature: 0.4,
    maxTokens: 4000,
  },

  draft_cpa_note: {
    systemPrompt: `You are a tax planning copilot for financial advisors at a wealth management firm.

ROLE: Draft a technical note for the client's CPA with key tax figures, planning considerations, and coordination items.

CRITICAL RULES:
1. Use precise technical tax terminology
2. Include exact figures from provided data with citations
3. Reference specific IRS forms, lines, and publications
4. Organize by topic with clear action items
5. Flag any items that need CPA verification or input

OUTPUT FORMAT (JSON):
{
  "answer_text": "Full CPA note text for reference",
  "citations": [{ "type": "fact|calc|authority", "label": "...", ... }],
  "formatted_output": {
    "kind": "cpa_note",
    "subject": "...",
    "context": "...",
    "key_figures": [{ "label": "...", "value": "...", "source": "..." }],
    "action_items": ["..."],
    "technical_notes": "..."
  }
}`,
    requiredContext: ['household', 'extracted_fields', 'calc_metrics'],
    outputSchemaHint: 'answer_text + citations + formatted_output (CpaNote)',
    temperature: 0.2,
    maxTokens: 4000,
  },

  draft_meeting_prep: {
    systemPrompt: `You are a tax planning copilot for financial advisors at a wealth management firm.

ROLE: Prepare a meeting briefing document for an upcoming client review meeting, including agenda items, talking points with key numbers, and open questions.

CRITICAL RULES:
1. Organize content for a 30-60 minute meeting
2. Highlight the most impactful items first
3. Include specific numbers from provided data
4. Prepare answers to likely client questions
5. Flag topics that need further research

OUTPUT FORMAT (JSON):
{
  "answer_text": "Full meeting prep text for reference",
  "citations": [{ "type": "fact|calc|opportunity|authority", "label": "...", ... }],
  "formatted_output": {
    "kind": "meeting_prep",
    "meeting_title": "...",
    "agenda_items": ["..."],
    "talking_points": [{ "topic": "...", "detail": "...", "key_number": "..." }],
    "key_numbers": [{ "label": "...", "value": "..." }],
    "open_questions": ["..."]
  }
}`,
    requiredContext: ['household', 'extracted_fields', 'opportunities'],
    outputSchemaHint: 'answer_text + citations + formatted_output (MeetingPrep)',
    temperature: 0.3,
    maxTokens: 5000,
  },

  missing_data_review: {
    systemPrompt: `You are a tax planning copilot for financial advisors at a wealth management firm.

ROLE: Analyze the household's data completeness, identify critical missing fields, and recommend what additional data should be gathered.

CRITICAL RULES:
1. Only flag fields that are genuinely missing from the provided data
2. Prioritize by impact on tax planning accuracy
3. Suggest specific sources for obtaining missing data (client, CPA, custodian, etc.)
4. Calculate an overall data completeness percentage
5. Distinguish between critical gaps and nice-to-have data

OUTPUT FORMAT (JSON):
{
  "answer_text": "Summary of data completeness analysis",
  "citations": [{ "type": "fact|authority", "label": "...", ... }],
  "formatted_output": {
    "kind": "missing_data_report",
    "completeness_pct": 75,
    "critical_gaps": [{ "field": "...", "description": "...", "impact": "high|medium|low", "suggested_source": "..." }],
    "optional_gaps": [{ "field": "...", "description": "...", "benefit": "..." }],
    "recommendations": ["..."]
  }
}`,
    requiredContext: ['household', 'extracted_fields'],
    outputSchemaHint: 'answer_text + citations + formatted_output (MissingDataReport)',
    temperature: 0.2,
    maxTokens: 4000,
  },
};

// =====================================================================
// Audience Tone Modifiers
// =====================================================================

const AUDIENCE_MODIFIERS: Record<AudienceMode, string> = {
  advisor_internal: `AUDIENCE: Internal advisor team.
TONE: Direct, technical, action-oriented. Use industry jargon freely. Focus on actionable insights and next steps.`,

  client_friendly: `AUDIENCE: The client (non-expert in tax planning).
TONE: Warm, clear, jargon-free. Explain concepts simply. Use analogies where helpful. Emphasize what this means for them personally.`,

  cpa_technical: `AUDIENCE: The client's CPA or tax professional.
TONE: Precise, technical, reference-heavy. Use IRS form/line numbers. Include exact figures. Assume deep tax expertise.`,

  compliance_formal: `AUDIENCE: Compliance review team.
TONE: Formal, documented, conservative. Flag any assumptions. Include all relevant caveats and disclaimers. Cite regulatory sources.`,

  executive_summary: `AUDIENCE: Senior leadership or wealth management executives.
TONE: Concise, high-level, impact-focused. Lead with key numbers and outcomes. Minimize technical detail. Highlight strategic implications.`,
};

// =====================================================================
// Prompt Builders
// =====================================================================

/**
 * Get the prompt family configuration.
 */
export function getPromptConfig(family: PromptFamily): PromptFamilyConfig {
  return PROMPT_CONFIGS[family];
}

/**
 * Build the system prompt for a copilot request.
 * Combines the family-specific system prompt with the audience modifier.
 */
export function buildSystemPrompt(
  family: PromptFamily,
  audience: AudienceMode,
): string {
  const config = PROMPT_CONFIGS[family];
  const audienceModifier = AUDIENCE_MODIFIERS[audience];

  return `${config.systemPrompt}

${audienceModifier}

PROMPT VERSION: ${PROMPT_VERSION}

IMPORTANT: All monetary values in the provided data are in cents. Convert to dollars for display (divide by 100). Always include the disclaimer: "This analysis is for educational purposes. Consult a qualified tax professional before making any tax-related decisions."`;
}

/**
 * Build the user prompt with assembled context from the source package.
 */
export function buildUserPrompt(
  family: PromptFamily,
  userQuery: string,
  sourcePackage: SourcePackage,
  options?: {
    opportunityId?: string;
    scenarioId?: string;
    taxLineRef?: string;
  },
): string {
  const sections: string[] = [];

  // Header
  sections.push(`**User Request:** ${userQuery}`);
  sections.push(`**Prompt Family:** ${family}`);

  // Household context
  const hh = sourcePackage.household;
  sections.push(`\n**Household:** ${hh.display_name} (${hh.household_id})`);
  sections.push(`**Tax Year:** ${hh.tax_year}`);
  if (hh.filing_status) sections.push(`**Filing Status:** ${hh.filing_status}`);
  if (hh.primary_state) sections.push(`**State:** ${hh.primary_state}`);

  if (hh.persons.length > 0) {
    const personList = hh.persons
      .map((p) => `- ${p.first_name} ${p.last_name}${p.dob ? ` (DOB: ${p.dob})` : ''}`)
      .join('\n');
    sections.push(`\n**Household Members:**\n${personList}`);
  }

  // Extracted fields
  if (sourcePackage.extracted_fields.length > 0) {
    const fieldList = sourcePackage.extracted_fields
      .map((f) => {
        const value = f.value_cents != null
          ? `$${toDollars(f.value_cents).toLocaleString()}`
          : f.value_text ?? 'N/A';
        return `- ${f.tax_line_ref}: ${value} (confidence: ${(f.confidence * 100).toFixed(0)}%)`;
      })
      .join('\n');
    sections.push(`\n**Extracted Tax Data:**\n${fieldList}`);
  }

  // Calc metrics
  if (sourcePackage.calc_metrics) {
    const metrics = sourcePackage.calc_metrics;
    const metricList = Object.entries(metrics.metrics)
      .map(([key, val]) => `- ${key}: $${toDollars(val).toLocaleString()}`)
      .join('\n');
    sections.push(`\n**Computed Metrics (${metrics.status}):**\n${metricList}`);
  }

  // Opportunities
  if (sourcePackage.opportunities.length > 0) {
    const oppList = sourcePackage.opportunities
      .map((o) => {
        const val = o.estimated_value != null
          ? ` — est. $${o.estimated_value.toLocaleString()}`
          : '';
        return `- [${o.priority}] ${o.title}${val} (${o.confidence} confidence)`;
      })
      .join('\n');
    sections.push(`\n**Detected Opportunities:**\n${oppList}`);
  }

  // Scenarios
  if (sourcePackage.scenarios.length > 0) {
    const scenarioList = sourcePackage.scenarios
      .map((s) => {
        const base = s.is_baseline ? ' [BASELINE]' : '';
        const metricSummary = s.metrics
          ? Object.entries(s.metrics)
              .slice(0, 5)
              .map(([k, v]) => `${k}: $${toDollars(v).toLocaleString()}`)
              .join(', ')
          : 'no metrics';
        return `- ${s.name}${base}: ${metricSummary}`;
      })
      .join('\n');
    sections.push(`\n**Scenarios:**\n${scenarioList}`);
  }

  // Policy summary
  if (sourcePackage.policy_summary) {
    sections.push(`\n**Policy Year:** ${sourcePackage.policy_summary.tax_year}`);
  }

  // Specific context for focused prompts
  if (options?.taxLineRef) {
    sections.push(`\n**Focus Line Item:** ${options.taxLineRef}`);
  }
  if (options?.opportunityId) {
    const opp = sourcePackage.opportunities.find(
      (o) => o.opportunity_id === options.opportunityId,
    );
    if (opp) {
      sections.push(
        `\n**Focus Opportunity:** ${opp.title} (${opp.category})`,
      );
    }
  }
  if (options?.scenarioId) {
    const scenario = sourcePackage.scenarios.find(
      (s) => s.scenario_id === options.scenarioId,
    );
    if (scenario) {
      sections.push(`\n**Focus Scenario:** ${scenario.name}`);
    }
  }

  return sections.join('\n');
}
