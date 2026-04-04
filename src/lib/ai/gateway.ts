// =============================================================================
// AI Gateway — Unified LLM Access Layer
// =============================================================================
//
// Single entry point for ALL LLM calls across the platform.
// Provider priority: Zolo (OpenAI-compatible) > Anthropic > error.
// Callers should catch errors and fall back to template-based generation.
// =============================================================================

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

// ── Configuration ────────────────────────────────────────────────────────────

const AI_TIMEOUT_MS = 60_000; // 60s for AI calls (can be slow)

const ZOLO_API_KEY = process.env.AI_ZOLO_KEY ?? '';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY ?? '';
const ZOLO_BASE_URL = 'https://api.aizolo.com/v1/chat/completions';
const ZOLO_MODEL = 'minimax-2.7';

const ANTHROPIC_API_KEY = process.env.AI_API_KEY ?? '';
const ANTHROPIC_BASE_URL = process.env.AI_BASE_URL ?? 'https://api.anthropic.com';
const ANTHROPIC_MODEL = process.env.AI_MODEL ?? 'claude-sonnet-4-20250514';

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

// ── Types ────────────────────────────────────────────────────────────────────

export interface AIRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AIDocumentRequest extends AIRequest {
  documents?: Array<{
    type: 'pdf' | 'image';
    data: string; // base64 encoded
    mimeType: string; // 'application/pdf' | 'image/jpeg' | 'image/png'
  }>;
}

export interface AIResponse {
  text: string;
  provider: 'zolo' | 'anthropic';
  model: string;
  tokensUsed?: number;
}

type Provider = 'zolo' | 'anthropic';

// ── Provider Detection ───────────────────────────────────────────────────────

export function isAIAvailable(): boolean {
  return MINIMAX_API_KEY.length > 0 || ZOLO_API_KEY.length > 0 || ANTHROPIC_API_KEY.length > 0;
}

export function getActiveProvider(): Provider {
  if (MINIMAX_API_KEY.length > 0 || ZOLO_API_KEY.length > 0) return 'zolo';
  if (ANTHROPIC_API_KEY.length > 0) return 'anthropic';
  throw new Error('[AI Gateway] No AI provider configured');
}

// ── JSON Extraction ──────────────────────────────────────────────────────────

/**
 * Extracts and parses JSON from an AI response string.
 * Handles code blocks, raw JSON objects, and arrays.
 */
export function extractJSON<T>(text: string): T {
  // Try code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim()) as T;
  }

  // Try raw JSON object or array
  const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]) as T;
  }

  throw new Error('[AI Gateway] No JSON found in AI response');
}

// ── Provider Implementations ─────────────────────────────────────────────────

async function callZolo(req: AIRequest | AIDocumentRequest): Promise<AIResponse> {
  const isDocRequest = 'documents' in req && req.documents && req.documents.length > 0;

  // Build user message content
  let userContent: any;

  if (isDocRequest) {
    // Multimodal request with documents
    const contentParts: any[] = [
      { type: 'text', text: req.userPrompt }
    ];

    // Add documents
    for (const doc of (req as AIDocumentRequest).documents!) {
      contentParts.push({
        type: doc.type === 'pdf' ? 'document' : 'image_url',
        [doc.type === 'pdf' ? 'document' : 'image_url']: {
          [doc.type === 'pdf' ? 'url' : 'url']: `data:${doc.mimeType};base64,${doc.data}`,
        },
      });
    }

    userContent = contentParts;
  } else {
    // Simple text request
    userContent = req.userPrompt;
  }

  const body: Record<string, unknown> = {
    model: ZOLO_MODEL,
    messages: [
      { role: 'system', content: req.systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: req.temperature ?? 0.3,
    max_tokens: req.maxTokens ?? 4096,
  };

  if (req.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  // Use MINIMAX_API_KEY if available, fallback to ZOLO_API_KEY
  const apiKey = MINIMAX_API_KEY || ZOLO_API_KEY;

  const response = await fetchWithTimeout(ZOLO_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  }, AI_TIMEOUT_MS);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Zolo API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('[AI Gateway] No content in Zolo response');
  }

  const tokensUsed = data.usage?.total_tokens;

  return {
    text,
    provider: 'zolo',
    model: data.model ?? ZOLO_MODEL,
    tokensUsed,
  };
}

async function callAnthropic(req: AIRequest): Promise<AIResponse> {
  const response = await fetchWithTimeout(`${ANTHROPIC_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: req.maxTokens ?? 4096,
      system: req.systemPrompt,
      messages: [
        { role: 'user', content: req.userPrompt },
      ],
      ...(req.temperature !== undefined && { temperature: req.temperature }),
    }),
  }, AI_TIMEOUT_MS);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
  if (!textBlock?.text) {
    throw new Error('[AI Gateway] No text content in Anthropic response');
  }

  const tokensUsed = data.usage
    ? (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0)
    : undefined;

  return {
    text: textBlock.text,
    provider: 'anthropic',
    model: ANTHROPIC_MODEL,
    tokensUsed,
  };
}

// ── Retry Logic ──────────────────────────────────────────────────────────────

async function callWithRetry(
  fn: (req: AIRequest) => Promise<AIResponse>,
  req: AIRequest,
  providerName: string,
): Promise<AIResponse> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn(req);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[AI Gateway] ${providerName} attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error(`[AI Gateway] ${providerName} failed after ${MAX_RETRIES + 1} attempts`);
}

// ── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Sends a prompt to the best available AI provider.
 * Tries Zolo first (if configured), then Anthropic, with retries on each.
 */
export async function callAI(req: AIRequest | AIDocumentRequest): Promise<AIResponse> {
  if (!isAIAvailable()) {
    throw new Error('[AI Gateway] No AI provider configured. Set MINIMAX_API_KEY, AI_ZOLO_KEY, or AI_API_KEY.');
  }

  const providers: Array<{ name: Provider; fn: (r: AIRequest) => Promise<AIResponse>; available: boolean }> = [
    { name: 'zolo', fn: callZolo, available: MINIMAX_API_KEY.length > 0 || ZOLO_API_KEY.length > 0 },
    { name: 'anthropic', fn: callAnthropic, available: ANTHROPIC_API_KEY.length > 0 },
  ];

  let lastError: Error | undefined;

  for (const provider of providers) {
    if (!provider.available) continue;

    try {
      const result = await callWithRetry(provider.fn, req, provider.name);
      console.log(`[AI Gateway] provider=${result.provider} model=${result.model} tokens=${result.tokensUsed ?? 'unknown'}`);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[AI Gateway] ${provider.name} exhausted, trying next provider: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error('[AI Gateway] All providers failed');
}

// ── Document Processing Helper ───────────────────────────────────────────────

/**
 * Specialized helper for document processing with vision.
 * Accepts documents in base64 format and returns extracted data.
 */
export async function callAIWithDocuments(req: AIDocumentRequest): Promise<AIResponse> {
  return callAI(req);
}
