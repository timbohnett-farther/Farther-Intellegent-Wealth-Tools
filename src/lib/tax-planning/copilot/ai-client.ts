// =============================================================================
// AI Copilot & Citation Layer — AI Client Wrapper
// =============================================================================
//
// Wraps the Anthropic SDK for copilot-specific AI calls.
// Handles JSON parsing, token tracking, and enablement checks.
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';
import type { CopilotAiResponse } from './types';

// =====================================================================
// Client Initialization
// =====================================================================

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

// =====================================================================
// Enablement Check
// =====================================================================

/**
 * Check if the copilot AI service is enabled.
 * Returns false if the ANTHROPIC_API_KEY is not set.
 */
export function isCopilotEnabled(): boolean {
  return typeof process.env.ANTHROPIC_API_KEY === 'string'
    && process.env.ANTHROPIC_API_KEY.length > 0;
}

// =====================================================================
// AI Call
// =====================================================================

interface CallCopilotAiParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Call the Claude API for copilot generation.
 * Returns parsed JSON content with token usage.
 *
 * @throws Error if the API call fails or response cannot be parsed.
 */
export async function callCopilotAi(
  params: CallCopilotAiParams,
): Promise<CopilotAiResponse> {
  const client = getClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: params.maxTokens,
    system: params.systemPrompt,
    messages: [
      {
        role: 'user',
        content: params.userPrompt,
      },
    ],
    temperature: params.temperature,
  });

  // Extract text content
  const textBlock = response.content.find((c) => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  // Parse JSON response with fallback
  const parsed = extractJSON(textBlock.text);

  return {
    content: {
      answer_text: (parsed.answer_text as string) ?? textBlock.text,
      citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      formatted_output: (parsed.formatted_output as Record<string, unknown>) ?? undefined,
    },
    model_id: response.model,
    token_usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

// =====================================================================
// JSON Extraction Helper
// =====================================================================

/**
 * Extract JSON from AI response text.
 * Handles cases where JSON is wrapped in markdown code blocks.
 */
function extractJSON(text: string): Record<string, unknown> {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
  }

  // Try extracting from ```json ... ``` blocks
  const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch?.[1]) {
    try {
      return JSON.parse(jsonBlockMatch[1]);
    } catch {
      // Fall through
    }
  }

  // Try finding first { ... } block
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      // Fall through
    }
  }

  // Return the raw text as answer_text
  return { answer_text: text, citations: [] };
}
