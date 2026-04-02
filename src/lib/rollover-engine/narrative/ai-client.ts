// =============================================================================
// Rollover Engine — AI Client (Claude API wrapper)
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';

interface NarrativeAIResponse {
  executive_summary: string;
  detailed_analysis: string;
  recommendation_text: string;
  raw_text: string;
  model_id: string;
  token_usage: { input_tokens: number; output_tokens: number };
}

const MODEL_ID = 'claude-sonnet-4-20250514';

/**
 * Checks if the Claude API is configured.
 */
export function isNarrativeAIEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Generates a narrative using Claude API.
 */
export async function generateNarrativeAI(params: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<NarrativeAIResponse> {
  if (!isNarrativeAIEnabled()) {
    // Return mock response when API key not available
    return generateMockNarrative(params.userPrompt);
  }

  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: params.maxTokens ?? 4000,
    temperature: params.temperature ?? 0.3,
    system: params.systemPrompt,
    messages: [{ role: 'user', content: params.userPrompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n\n');

  // Parse sections from the response
  const sections = parseSections(text);

  return {
    executive_summary: sections.executive_summary,
    detailed_analysis: sections.detailed_analysis,
    recommendation_text: sections.recommendation,
    raw_text: text,
    model_id: MODEL_ID,
    token_usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

// ==================== Helpers ====================

function parseSections(text: string): {
  executive_summary: string;
  detailed_analysis: string;
  recommendation: string;
} {
  const lines = text.split('\n');
  let currentSection = '';
  const sections: Record<string, string[]> = {
    executive_summary: [],
    detailed_analysis: [],
    recommendation: [],
  };

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('executive summary')) {
      currentSection = 'executive_summary';
      continue;
    }
    if (lower.includes('detailed analysis')) {
      currentSection = 'detailed_analysis';
      continue;
    }
    if (lower.includes('recommendation') || lower.includes('key considerations')) {
      currentSection = 'recommendation';
      continue;
    }
    if (currentSection && sections[currentSection]) {
      sections[currentSection].push(line);
    }
  }

  return {
    executive_summary: sections.executive_summary.join('\n').trim() || text.substring(0, 500),
    detailed_analysis: sections.detailed_analysis.join('\n').trim() || text.substring(500, 2000),
    recommendation: sections.recommendation.join('\n').trim() || text.substring(2000),
  };
}

function generateMockNarrative(userPrompt: string): NarrativeAIResponse {
  return {
    executive_summary: 'Based on our comprehensive 10-factor analysis, this rollover analysis examines the merits of transferring your 401(k) assets to a Farther IRA. The analysis considers fee comparisons, investment quality, service levels, penalty-free access, creditor protection, RMD flexibility, employer stock considerations, plan stability, and special circumstances unique to your situation.',
    detailed_analysis: 'Our fee comparison reveals that the current plan expenses represent a significant cost that could be reduced through a Farther IRA. The investment quality assessment shows opportunities for improved diversification and tax-efficient investing. Service level improvements include dedicated advisor access, comprehensive financial planning integration, and estate coordination capabilities.',
    recommendation_text: 'The analysis suggests that the factors generally support consideration of a rollover to a Farther IRA, though several important considerations warrant discussion with your advisor. Key discussion points include the fee differential, investment flexibility, and any unique circumstances such as outstanding loans or employer stock.',
    raw_text: '[Mock narrative - Claude API key not configured]',
    model_id: 'mock',
    token_usage: { input_tokens: 0, output_tokens: 0 },
  };
}
