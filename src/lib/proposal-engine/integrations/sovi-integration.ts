/**
 * Sovi.io Integration — Wealth Signals and Life Events
 *
 * Integration with Sovi.io for detecting wealth signals, life events, and optimal proposal timing.
 * Uses fetch-with-timeout for reliable API calls with graceful degradation.
 */

// ============================================================================
// Types
// ============================================================================

export type SoviSignalType =
  | 'LIFE_EVENT'
  | 'WEALTH_CHANGE'
  | 'CAREER_CHANGE'
  | 'REAL_ESTATE'
  | 'FAMILY_CHANGE'
  | 'MARKET_TRIGGER';

export type ProposalRelevance = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SoviSignal {
  signalId: string;
  clientId: string;
  signalType: SoviSignalType;
  confidence: number;
  title: string;
  description: string;
  detectedAt: string;
  actionSuggested: string;
  proposalRelevance: ProposalRelevance;
  metadata: Record<string, unknown>;
}

export type OptimalTiming = 'NOW' | 'SOON' | 'WAIT';

export interface TimingAssessment {
  optimalTiming: OptimalTiming;
  reasons: string[];
  signals: SoviSignal[];
  confidence: number;
  suggestedProposalType?: string;
}

export interface SoviSubscription {
  subscriptionId: string;
  active: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const SOVI_BASE_URL = process.env.SOVI_BASE_URL || 'https://api.sovi.io/v1';
const SOVI_API_KEY = process.env.SOVI_API_KEY;

// ============================================================================
// Fetch Helper with Timeout
// ============================================================================

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// API Helper
// ============================================================================

async function soviRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!SOVI_API_KEY) {
    throw new Error('SOVI_API_KEY not configured');
  }

  const url = `${SOVI_BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${SOVI_API_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetchWithTimeout(url, { ...options, headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sovi API error ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('Sovi API request timeout');
      }
      throw err;
    }
    throw new Error('Unknown Sovi API error');
  }
}

// ============================================================================
// Fetch Client Signals
// ============================================================================

export async function fetchClientSignals(clientId: string): Promise<SoviSignal[]> {
  if (!SOVI_API_KEY) {
    console.warn('SOVI_API_KEY not configured — returning empty signals');
    return [];
  }

  try {
    const response = await soviRequest<{ signals: SoviSignal[] }>(
      `/clients/${clientId}/signals`,
      { method: 'GET' }
    );

    return response.signals || [];
  } catch (err) {
    console.error('[fetchClientSignals]', err);
    // Graceful degradation — return empty array
    return [];
  }
}

// ============================================================================
// Assess Proposal Timing
// ============================================================================

export async function assessProposalTiming(clientId: string): Promise<TimingAssessment> {
  const signals = await fetchClientSignals(clientId);

  if (signals.length === 0) {
    return {
      optimalTiming: 'WAIT',
      reasons: ['No recent signals detected'],
      signals: [],
      confidence: 0.2,
    };
  }

  // Score timing based on signal types and recency
  const highRelevanceSignals = signals.filter(s => s.proposalRelevance === 'HIGH');
  const mediumRelevanceSignals = signals.filter(s => s.proposalRelevance === 'MEDIUM');

  const recentSignals = signals.filter(s => {
    const days = (Date.now() - new Date(s.detectedAt).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 30;
  });

  // Determine optimal timing
  let optimalTiming: OptimalTiming;
  let confidence: number;
  const reasons: string[] = [];

  if (highRelevanceSignals.length >= 2 && recentSignals.length >= 2) {
    optimalTiming = 'NOW';
    confidence = 0.85;
    reasons.push(`${highRelevanceSignals.length} high-relevance signals detected`);
    reasons.push(`${recentSignals.length} signals in last 30 days`);
  } else if (highRelevanceSignals.length >= 1 || recentSignals.length >= 3) {
    optimalTiming = 'SOON';
    confidence = 0.65;
    reasons.push(highRelevanceSignals.length > 0 ? 'High-relevance signal detected' : 'Multiple recent signals');
    reasons.push('Client showing engagement indicators');
  } else {
    optimalTiming = 'WAIT';
    confidence = 0.4;
    reasons.push('Signals present but timing not optimal');
    if (mediumRelevanceSignals.length > 0) {
      reasons.push('Monitor for additional high-relevance signals');
    }
  }

  // Suggest proposal type based on signal types
  const suggestedProposalType = inferProposalType(signals);

  return {
    optimalTiming,
    reasons,
    signals,
    confidence,
    suggestedProposalType,
  };
}

// ============================================================================
// Infer Proposal Type from Signals
// ============================================================================

function inferProposalType(signals: SoviSignal[]): string | undefined {
  const signalTypes = signals.map(s => s.signalType);

  // Prioritize based on signal type frequency
  if (signalTypes.includes('WEALTH_CHANGE')) {
    return 'Wealth Transition Proposal';
  }
  if (signalTypes.includes('CAREER_CHANGE')) {
    return 'Career Transition Proposal';
  }
  if (signalTypes.includes('REAL_ESTATE')) {
    return 'Real Estate Wealth Planning';
  }
  if (signalTypes.includes('FAMILY_CHANGE')) {
    return 'Family Wealth Structuring';
  }
  if (signalTypes.includes('LIFE_EVENT')) {
    return 'Life Event Financial Review';
  }
  if (signalTypes.includes('MARKET_TRIGGER')) {
    return 'Market Opportunity Proposal';
  }

  return undefined;
}

// ============================================================================
// Subscribe to Signals
// ============================================================================

export async function subscribeToSignals(
  clientIds: string[],
  webhookUrl: string
): Promise<SoviSubscription> {
  if (!SOVI_API_KEY) {
    throw new Error('SOVI_API_KEY not configured');
  }

  try {
    const response = await soviRequest<SoviSubscription>(
      '/subscriptions',
      {
        method: 'POST',
        body: JSON.stringify({
          clientIds,
          webhookUrl,
          signalTypes: [
            'LIFE_EVENT',
            'WEALTH_CHANGE',
            'CAREER_CHANGE',
            'REAL_ESTATE',
            'FAMILY_CHANGE',
            'MARKET_TRIGGER',
          ],
        }),
      }
    );

    return response;
  } catch (err) {
    console.error('[subscribeToSignals]', err);
    throw err;
  }
}

// ============================================================================
// Process Webhook Payload
// ============================================================================

export function processSignalWebhook(payload: Record<string, unknown>): SoviSignal | null {
  try {
    // Validate required fields
    if (!payload.signalId || !payload.clientId || !payload.signalType) {
      console.error('[processSignalWebhook] Missing required fields', payload);
      return null;
    }

    // Map webhook payload to SoviSignal type
    const signal: SoviSignal = {
      signalId: String(payload.signalId),
      clientId: String(payload.clientId),
      signalType: payload.signalType as SoviSignalType,
      confidence: Number(payload.confidence || 0),
      title: String(payload.title || 'Signal Detected'),
      description: String(payload.description || ''),
      detectedAt: String(payload.detectedAt || new Date().toISOString()),
      actionSuggested: String(payload.actionSuggested || 'Review client profile'),
      proposalRelevance: (payload.proposalRelevance as ProposalRelevance) || 'MEDIUM',
      metadata: (payload.metadata as Record<string, unknown>) || {},
    };

    return signal;
  } catch (err) {
    console.error('[processSignalWebhook] Error parsing payload', err);
    return null;
  }
}

// ============================================================================
// Signal Enrichment
// ============================================================================

export function enrichSignalWithProposalContext(signal: SoviSignal): {
  signal: SoviSignal;
  proposalOpportunity: boolean;
  suggestedActions: string[];
} {
  const suggestedActions: string[] = [];
  let proposalOpportunity = false;

  switch (signal.signalType) {
    case 'WEALTH_CHANGE':
      proposalOpportunity = true;
      suggestedActions.push('Create wealth transition proposal');
      suggestedActions.push('Schedule discovery call to discuss new assets');
      suggestedActions.push('Review tax implications');
      break;

    case 'CAREER_CHANGE':
      proposalOpportunity = signal.proposalRelevance === 'HIGH';
      suggestedActions.push('Review compensation package (equity, options, deferred comp)');
      suggestedActions.push('Update financial plan');
      if (signal.metadata.executiveRole) {
        suggestedActions.push('Discuss executive financial planning services');
      }
      break;

    case 'REAL_ESTATE':
      proposalOpportunity = true;
      suggestedActions.push('Create real estate wealth planning proposal');
      suggestedActions.push('Discuss 1031 exchange opportunities');
      suggestedActions.push('Review mortgage vs investment trade-offs');
      break;

    case 'FAMILY_CHANGE':
      proposalOpportunity = signal.proposalRelevance !== 'LOW';
      suggestedActions.push('Update estate planning documents');
      suggestedActions.push('Review beneficiary designations');
      if (signal.metadata.newChild) {
        suggestedActions.push('Discuss 529 college savings plan');
      }
      break;

    case 'LIFE_EVENT':
      proposalOpportunity = signal.proposalRelevance === 'HIGH';
      suggestedActions.push('Schedule comprehensive financial review');
      suggestedActions.push('Update financial plan');
      break;

    case 'MARKET_TRIGGER':
      proposalOpportunity = signal.confidence >= 0.7;
      suggestedActions.push('Review portfolio positioning');
      suggestedActions.push('Discuss rebalancing or tax loss harvesting');
      break;
  }

  return {
    signal,
    proposalOpportunity,
    suggestedActions,
  };
}

// ============================================================================
// Batch Signal Fetch
// ============================================================================

export async function fetchMultipleClientSignals(
  clientIds: string[]
): Promise<Map<string, SoviSignal[]>> {
  if (!SOVI_API_KEY) {
    console.warn('SOVI_API_KEY not configured — returning empty map');
    return new Map();
  }

  const signalMap = new Map<string, SoviSignal[]>();

  // Batch fetch in parallel (max 10 concurrent)
  const batches: string[][] = [];
  for (let i = 0; i < clientIds.length; i += 10) {
    batches.push(clientIds.slice(i, i + 10));
  }

  for (const batch of batches) {
    const promises = batch.map(async (clientId) => {
      const signals = await fetchClientSignals(clientId);
      return { clientId, signals };
    });

    const results = await Promise.allSettled(promises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        signalMap.set(result.value.clientId, result.value.signals);
      }
    }
  }

  return signalMap;
}
