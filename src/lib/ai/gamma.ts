// =============================================================================
// Gamma AI Service — Document & Presentation Generation
// =============================================================================
//
// Client for Gamma's public API for generating presentations and documents.
// Supports async generation with polling and PDF/PPTX export.
// =============================================================================

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

// ── Configuration ────────────────────────────────────────────────────────────

const GAMMA_API_KEY = process.env.GAMMA_API_KEY ?? '';
const GAMMA_BASE_URL = 'https://public-api.gamma.app/v1.0';
const GAMMA_FETCH_TIMEOUT_MS = 15_000; // 15s per request
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_MAX_WAIT_MS = 120_000;

// ── Types ────────────────────────────────────────────────────────────────────

export type GammaFormat = 'presentation' | 'document';
export type GammaExport = 'pdf' | 'pptx';

export interface GenerateDocumentOptions {
  inputText: string;
  format?: GammaFormat;
  numCards?: number;
  exportAs?: GammaExport;
}

export interface GammaGenerationResult {
  status: 'completed' | 'processing' | 'failed' | 'timeout';
  gammaUrl?: string;
  exportUrl?: string;
  error?: string;
}

// ── Availability ─────────────────────────────────────────────────────────────

export function isGammaAvailable(): boolean {
  return GAMMA_API_KEY.length > 0;
}

// ── API Helpers ──────────────────────────────────────────────────────────────

async function gammaFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetchWithTimeout(`${GAMMA_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': GAMMA_API_KEY,
      ...options.headers,
    },
  }, GAMMA_FETCH_TIMEOUT_MS);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Gamma API error ${response.status}: ${errorBody}`);
  }

  return response;
}

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Starts a new document/presentation generation in Gamma.
 * Returns the generation ID for polling.
 */
export async function generateDocument(options: GenerateDocumentOptions): Promise<string> {
  if (!isGammaAvailable()) {
    throw new Error('[Gamma] API key not configured. Set GAMMA_API_KEY.');
  }

  const body = {
    input_text: options.inputText,
    format: options.format ?? 'document',
    num_cards: options.numCards ?? 10,
    export_as: options.exportAs ?? 'pdf',
  };

  console.log(`[Gamma] Starting ${body.format} generation (${body.num_cards} cards, export: ${body.export_as})`);

  const response = await gammaFetch('/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const data = await response.json();
  const generationId = data.id ?? data.generation_id;

  if (!generationId) {
    throw new Error('[Gamma] No generation ID in response');
  }

  console.log(`[Gamma] Generation started: ${generationId}`);
  return generationId;
}

/**
 * Polls a Gamma generation until completion or timeout.
 * Returns the final status with URLs for the generated content.
 */
export async function pollGeneration(
  generationId: string,
  maxWaitMs: number = DEFAULT_MAX_WAIT_MS,
): Promise<GammaGenerationResult> {
  if (!isGammaAvailable()) {
    throw new Error('[Gamma] API key not configured. Set GAMMA_API_KEY.');
  }

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await gammaFetch(`/generate/${generationId}`);
    const data = await response.json();

    const status = data.status ?? data.state;

    if (status === 'completed' || status === 'done') {
      console.log(`[Gamma] Generation ${generationId} completed`);
      return {
        status: 'completed',
        gammaUrl: data.gamma_url ?? data.url,
        exportUrl: data.export_url ?? data.download_url,
      };
    }

    if (status === 'failed' || status === 'error') {
      console.error(`[Gamma] Generation ${generationId} failed: ${data.error ?? 'Unknown error'}`);
      return {
        status: 'failed',
        error: data.error ?? 'Generation failed',
      };
    }

    // Still processing — wait and poll again
    await new Promise(resolve => setTimeout(resolve, DEFAULT_POLL_INTERVAL_MS));
  }

  console.warn(`[Gamma] Generation ${generationId} timed out after ${maxWaitMs}ms`);
  return {
    status: 'timeout',
    error: `Generation timed out after ${maxWaitMs}ms`,
  };
}
