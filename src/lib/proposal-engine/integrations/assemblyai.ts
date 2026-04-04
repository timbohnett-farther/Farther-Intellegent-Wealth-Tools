/**
 * AssemblyAI Integration — Meeting Transcription Service
 *
 * Transcribes advisor-client meetings and extracts structured intelligence
 * for proposal generation: client goals, risk preferences, time horizons,
 * liquidity needs, concerns, and action items.
 */

import { callAI } from '@/lib/ai/gateway';

// ============================================================================
// Types
// ============================================================================

export interface TranscriptionParams {
  audioUrl?: string;
  audioBuffer?: Buffer;
  language?: string;
  speakerLabels?: boolean;
}

export interface Utterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptionResult {
  transcriptId: string;
  text: string;
  utterances: Utterance[];
  duration: number;
  confidence: number;
  status: 'completed' | 'error';
  summary?: string;
  actionItems?: string[];
  keyTopics?: string[];
}

export interface MeetingIntelligence {
  clientGoals: string[];
  riskPreferences: string;
  timeHorizon: string;
  liquidityNeeds: string;
  concerns: string[];
  actionItems: string[];
  proposalRecommendations: string[];
}

interface AssemblyAIResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text: string;
  utterances?: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  audio_duration?: number;
  confidence?: number;
  summary?: string;
  auto_highlights_result?: {
    results: Array<{ text: string }>;
  };
  iab_categories_result?: {
    summary: Record<string, number>;
  };
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';

const TIMEOUT_MS = 300000; // 5 minutes for large audio files

// ============================================================================
// Core API Functions
// ============================================================================

/**
 * Transcribe meeting audio via AssemblyAI
 */
export async function transcribeMeeting(
  params: TranscriptionParams
): Promise<TranscriptionResult> {
  if (!ASSEMBLYAI_API_KEY) {
    console.warn('[assemblyai] Missing ASSEMBLYAI_API_KEY — returning mock transcription');
    return {
      transcriptId: 'mock-transcript-id',
      text: 'Mock transcription — configure ASSEMBLYAI_API_KEY for real transcription',
      utterances: [],
      duration: 0,
      confidence: 0,
      status: 'completed',
    };
  }

  try {
    // Step 1: Upload audio if buffer provided, otherwise use URL
    let audioUrl = params.audioUrl;
    if (params.audioBuffer && !audioUrl) {
      audioUrl = await uploadAudio(params.audioBuffer);
    }

    if (!audioUrl) {
      throw new Error('Either audioUrl or audioBuffer must be provided');
    }

    // Step 2: Create transcription job
    const transcriptId = await createTranscription(audioUrl, params);

    // Step 3: Poll for completion
    const result = await pollTranscriptionStatus(transcriptId);

    return result;
  } catch (err) {
    console.error('[assemblyai] Transcription failed:', err);
    throw err;
  }
}

/**
 * Get transcription status by ID
 */
export async function getTranscriptionStatus(
  transcriptId: string
): Promise<TranscriptionResult> {
  if (!ASSEMBLYAI_API_KEY) {
    return {
      transcriptId,
      text: 'Mock transcription status',
      utterances: [],
      duration: 0,
      confidence: 0,
      status: 'completed',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`, {
      headers: {
        Authorization: ASSEMBLYAI_API_KEY,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AssemblyAI status check failed: ${response.status} ${errorText}`);
    }

    const data: AssemblyAIResponse = await response.json();
    return mapAssemblyAIResponse(data);
  } catch (err) {
    console.error('[assemblyai] Status check failed:', err);
    throw err;
  }
}

/**
 * Extract structured meeting intelligence from transcript
 */
export async function extractMeetingIntelligence(
  transcript: string
): Promise<MeetingIntelligence> {
  const prompt = `Analyze this advisor-client meeting transcript and extract structured intelligence for investment proposal generation.

TRANSCRIPT:
${transcript}

Extract the following fields in JSON format:
{
  "clientGoals": ["array of specific financial goals mentioned"],
  "riskPreferences": "conservative|moderate|aggressive with supporting details",
  "timeHorizon": "short-term (0-3 years)|medium-term (3-10 years)|long-term (10+ years) with specifics",
  "liquidityNeeds": "description of cash flow needs, expected withdrawals, emergency reserves",
  "concerns": ["array of specific concerns or objections raised"],
  "actionItems": ["array of follow-up items mentioned"],
  "proposalRecommendations": ["array of specific strategies or products to include in proposal"]
}

RULES:
- Be specific — quote actual statements where possible
- If a field is unclear or not mentioned, use empty array or "Not specified"
- For riskPreferences, include supporting quotes from client
- For timeHorizon, note specific dates or milestones if mentioned
- For proposalRecommendations, focus on actionable strategies`;

  try {
    const response = await callAI({
      systemPrompt: 'You are a financial advisor AI assistant analyzing meeting transcripts.',
      userPrompt: prompt,
      temperature: 0.2,
      maxTokens: 2000,
      jsonMode: true,
    });

    // Parse JSON from response (may be wrapped in markdown code block)
    const jsonMatch = response.text.match(/```json\n([\s\S]+?)\n```/) ||
                     response.text.match(/\{[\s\S]+\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const intelligence: MeetingIntelligence = JSON.parse(
      jsonMatch[1] || jsonMatch[0]
    );

    return intelligence;
  } catch (err) {
    console.error('[assemblyai] Intelligence extraction failed:', err);
    throw err;
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function uploadAudio(buffer: Buffer): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: ASSEMBLYAI_API_KEY!,
      'Content-Type': 'application/octet-stream',
    },
    body: buffer as unknown as BodyInit,
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AssemblyAI upload failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.upload_url;
}

async function createTranscription(
  audioUrl: string,
  params: TranscriptionParams
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
    method: 'POST',
    headers: {
      Authorization: ASSEMBLYAI_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: params.language || 'en_us',
      speaker_labels: params.speakerLabels ?? true,
      auto_highlights: true,
      iab_categories: true,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AssemblyAI transcription failed: ${response.status} ${errorText}`);
  }

  const data: AssemblyAIResponse = await response.json();
  return data.id;
}

async function pollTranscriptionStatus(
  transcriptId: string,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<TranscriptionResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getTranscriptionStatus(transcriptId);

    if (result.status === 'completed') {
      return result;
    }

    if (result.status === 'error') {
      throw new Error('AssemblyAI transcription failed');
    }

    // Still processing — wait before retry
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Transcription timed out after max polling attempts');
}

function mapAssemblyAIResponse(data: AssemblyAIResponse): TranscriptionResult {
  if (data.status === 'error') {
    return {
      transcriptId: data.id,
      text: '',
      utterances: [],
      duration: 0,
      confidence: 0,
      status: 'error',
    };
  }

  if (data.status !== 'completed') {
    return {
      transcriptId: data.id,
      text: '',
      utterances: [],
      duration: 0,
      confidence: 0,
      status: 'completed', // Map processing to completed for polling
    };
  }

  const actionItems = data.auto_highlights_result?.results.map(r => r.text) || [];
  const keyTopics = data.iab_categories_result
    ? Object.keys(data.iab_categories_result.summary).slice(0, 5)
    : [];

  return {
    transcriptId: data.id,
    text: data.text || '',
    utterances: (data.utterances || []).map(u => ({
      speaker: u.speaker,
      text: u.text,
      start: u.start,
      end: u.end,
      confidence: u.confidence,
    })),
    duration: data.audio_duration || 0,
    confidence: data.confidence || 0,
    status: 'completed',
    summary: data.summary,
    actionItems,
    keyTopics,
  };
}
