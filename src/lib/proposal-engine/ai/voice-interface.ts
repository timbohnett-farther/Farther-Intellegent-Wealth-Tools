/**
 * Voice Interface — Voice-First Advisor Interactions
 *
 * Processes voice input and generates text-to-speech responses for advisor interactions.
 * Uses AI gateway for intent extraction and parameter parsing from transcripts.
 */

import { callAI, extractJSON } from '@/lib/ai/gateway';

// ============================================================================
// Types
// ============================================================================

export type VoiceSessionStatus = 'LISTENING' | 'PROCESSING' | 'RESPONDING' | 'IDLE';

export interface VoiceSession {
  sessionId: string;
  advisorId: string;
  clientId?: string;
  status: VoiceSessionStatus;
  transcript: string[];
  responses: string[];
  startedAt: string;
  lastActivityAt: string;
}

export type VoiceIntent =
  | 'CREATE_PROPOSAL'
  | 'CHECK_STATUS'
  | 'RUN_ANALYSIS'
  | 'GENERATE_PDF'
  | 'SEND_PROPOSAL'
  | 'ASK_QUESTION'
  | 'UNKNOWN';

export interface VoiceResponse {
  text: string;
  intent: VoiceIntent;
  confidence: number;
  suggestedAction?: string;
  parameters?: Record<string, string>;
}

export interface ProcessVoiceParams {
  audioBuffer?: Buffer;
  text?: string;
  sessionId: string;
}

export interface VoiceTTSResponse {
  audioUrl?: string;
  ssml?: string;
  text: string;
}

// ============================================================================
// In-Memory Store
// ============================================================================

const sessions = new Map<string, VoiceSession>();

// ============================================================================
// Voice Input Processing
// ============================================================================

export async function processVoiceInput(params: ProcessVoiceParams): Promise<VoiceResponse> {
  const session = sessions.get(params.sessionId);
  if (!session) {
    throw new Error(`Session ${params.sessionId} not found`);
  }

  session.status = 'PROCESSING';
  session.lastActivityAt = new Date().toISOString();

  try {
    // In production, this would transcribe audioBuffer using a speech-to-text API
    // For now, we use the provided text
    const transcript = params.text || '';

    if (!transcript.trim()) {
      return {
        text: "I didn't catch that. Could you please repeat?",
        intent: 'UNKNOWN',
        confidence: 0,
      };
    }

    session.transcript.push(transcript);

    // Use AI to extract intent and parameters
    const prompt = `You are a voice assistant for financial advisors. Analyze this voice input and extract:
1. The primary intent (CREATE_PROPOSAL, CHECK_STATUS, RUN_ANALYSIS, GENERATE_PDF, SEND_PROPOSAL, ASK_QUESTION, or UNKNOWN)
2. Confidence level (0-1)
3. Any parameters mentioned (client name, proposal type, etc.)
4. A suggested action if applicable

Voice input: "${transcript}"

Return JSON with: intent, confidence, parameters (object), suggestedAction (string or null)`;

    const aiResponse = await callAI({
      systemPrompt: 'You are a voice assistant for financial advisors.',
      userPrompt: prompt,
      temperature: 0.2,
    });
    const parsed = extractJSON<{
      intent: string;
      confidence: number;
      parameters?: Record<string, unknown>;
      suggestedAction?: string;
    }>(aiResponse.text);

    const response: VoiceResponse = {
      text: generateResponseText(parsed.intent, parsed.parameters),
      intent: parsed.intent as VoiceIntent,
      confidence: parsed.confidence || 0,
      suggestedAction: parsed.suggestedAction || undefined,
      parameters: parsed.parameters as Record<string, string> | undefined,
    };

    session.responses.push(response.text);
    session.status = 'RESPONDING';

    return response;
  } catch (err) {
    session.status = 'IDLE';
    throw err;
  }
}

// ============================================================================
// Response Text Generation
// ============================================================================

function generateResponseText(intent: string, parameters?: Record<string, unknown>): string {
  switch (intent) {
    case 'CREATE_PROPOSAL':
      return `I'll help you create a proposal${parameters?.clientName ? ` for ${parameters.clientName}` : ''}. What type of proposal would you like to generate?`;

    case 'CHECK_STATUS':
      return `Let me check the status of that proposal${parameters?.proposalId ? ` (ID: ${parameters.proposalId})` : ''}.`;

    case 'RUN_ANALYSIS':
      return `Running analytics${parameters?.analysisType ? ` for ${parameters.analysisType}` : ''}. This will take a moment.`;

    case 'GENERATE_PDF':
      return `I'll generate the PDF${parameters?.proposalId ? ` for proposal ${parameters.proposalId}` : ''}. One moment please.`;

    case 'SEND_PROPOSAL':
      return `Preparing to send the proposal${parameters?.clientEmail ? ` to ${parameters.clientEmail}` : ''}. Please confirm the recipient.`;

    case 'ASK_QUESTION':
      return `I'm here to help. What would you like to know?`;

    default:
      return "I'm not sure I understood that. Could you rephrase your request?";
  }
}

// ============================================================================
// Text-to-Speech Generation
// ============================================================================

export async function generateVoiceResponse(text: string): Promise<VoiceTTSResponse> {
  // Placeholder for TTS — would integrate with MiniMax TTS API in production
  // For now, return text with SSML markup for future TTS processing

  const ssml = `<speak>
  <prosody rate="medium" pitch="medium">
    ${escapeXML(text)}
  </prosody>
</speak>`;

  return {
    text,
    ssml,
    // audioUrl would be populated by TTS service
  };
}

function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// Session Management
// ============================================================================

export function startVoiceSession(advisorId: string, clientId?: string): VoiceSession {
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const session: VoiceSession = {
    sessionId,
    advisorId,
    clientId,
    status: 'IDLE',
    transcript: [],
    responses: [],
    startedAt: now,
    lastActivityAt: now,
  };

  sessions.set(sessionId, session);
  return session;
}

export function endVoiceSession(sessionId: string): VoiceSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  sessions.delete(sessionId);
  return session;
}

export function getSessionTranscript(sessionId: string): string[] {
  const session = sessions.get(sessionId);
  return session?.transcript || [];
}

export function getVoiceSession(sessionId: string): VoiceSession | null {
  return sessions.get(sessionId) || null;
}

// ============================================================================
// Advanced Voice Processing
// ============================================================================

export async function processMultiTurnConversation(
  sessionId: string,
  userInput: string
): Promise<VoiceResponse> {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Build conversation context from transcript history
  const conversationHistory = session.transcript
    .map((t, i) => `User: ${t}\nAssistant: ${session.responses[i] || ''}`)
    .join('\n');

  const prompt = `You are a voice assistant for financial advisors. Continue this conversation naturally:

${conversationHistory}
User: ${userInput}

Analyze the latest user input in context and return JSON with:
- intent: The primary intent (CREATE_PROPOSAL, CHECK_STATUS, RUN_ANALYSIS, etc.)
- confidence: Confidence level 0-1
- parameters: Any extracted parameters
- suggestedAction: What action to take next
- responseText: Natural conversational response text`;

  const aiResponse = await callAI({
    systemPrompt: 'You are a voice assistant for financial advisors.',
    userPrompt: prompt,
    temperature: 0.5,
  });
  const parsed = extractJSON<{
    intent: string;
    confidence: number;
    parameters?: Record<string, unknown>;
    suggestedAction?: string;
    responseText?: string;
  }>(aiResponse.text);

  session.transcript.push(userInput);
  session.responses.push(parsed.responseText || '');
  session.lastActivityAt = new Date().toISOString();

  return {
    text: parsed.responseText || generateResponseText(parsed.intent, parsed.parameters),
    intent: parsed.intent as VoiceIntent,
    confidence: parsed.confidence || 0,
    suggestedAction: parsed.suggestedAction || undefined,
    parameters: parsed.parameters as Record<string, string> | undefined,
  };
}
