/**
 * Quarterly Risk Check-In System — Automated Client Re-Assessment
 *
 * Automated periodic risk profile re-assessment for existing clients.
 * Generates personalized check-in questions based on current market
 * conditions, processes client responses, and flags allocation changes
 * or portfolio drift requiring advisor review.
 *
 * WORKFLOW:
 * 1. Advisor triggers quarterly check-in → generateRiskCheckIn()
 * 2. Client receives 5 targeted questions via portal/email
 * 3. Client submits responses → processCheckInResponses()
 * 4. System calculates updated risk score and recommended action
 * 5. If action = REBALANCE or FULL_REVIEW, alert advisor
 *
 * @module proposal-engine/client/risk-checkin
 */

import { randomUUID } from 'crypto';
import { callAI } from '@/lib/ai/gateway';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Parameters for generating a quarterly risk check-in.
 */
export interface CheckInParams {
  /** UUID of the client. */
  clientId: string;
  /** Client display name. */
  clientName: string;
  /** Current risk tolerance score (1-100). */
  currentRiskScore: number;
  /** Current portfolio allocation breakdown. */
  currentAllocation: {
    /** Equity percentage (0-100). */
    equity: number;
    /** Fixed income percentage (0-100). */
    fixedIncome: number;
    /** Alternatives percentage (0-100). */
    alternatives: number;
    /** Cash percentage (0-100). */
    cash: number;
  };
  /** Optional market conditions context (e.g., "high volatility", "rising rates"). */
  marketConditions?: string;
  /** ISO 8601 date of the last check-in, or null if first check-in. */
  lastCheckInDate?: string;
}

/**
 * Generated risk check-in with personalized questions.
 */
export interface RiskCheckIn {
  /** UUID for this check-in. */
  checkInId: string;
  /** UUID of the client this check-in is for. */
  clientId: string;
  /** Array of check-in questions. */
  questions: CheckInQuestion[];
  /** ISO 8601 timestamp when the check-in was generated. */
  generatedAt: string;
  /** ISO 8601 date when the check-in is due. */
  dueDate: string;
  /** Current status of the check-in. */
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
}

/**
 * A single check-in question.
 */
export interface CheckInQuestion {
  /** Unique question ID within this check-in. */
  id: string;
  /** Question text to display to the client. */
  text: string;
  /** Input type for the question. */
  type: 'SCALE' | 'YES_NO' | 'MULTIPLE_CHOICE';
  /** Available options for MULTIPLE_CHOICE questions. */
  options?: Array<{ value: string; label: string }>;
}

/**
 * Result of processing check-in responses.
 */
export interface CheckInResult {
  /** Updated risk tolerance score (1-100). */
  updatedRiskScore: number;
  /** Change in risk score (updated - current). */
  scoreDelta: number;
  /** Whether the recommended allocation has changed. */
  allocationChange: boolean;
  /** Recommended advisor action. */
  recommendedAction: 'NO_CHANGE' | 'MINOR_ADJUSTMENT' | 'REBALANCE' | 'FULL_REVIEW';
  /** Summary of the check-in results for the advisor. */
  summary: string;
}

/**
 * Overdue check-in item for advisor dashboard.
 */
export interface OverdueCheckIn {
  /** UUID of the client. */
  clientId: string;
  /** Client display name. */
  clientName: string;
  /** ISO 8601 date of the last completed check-in. */
  lastCheckIn: string;
  /** Number of days past the due date. */
  daysPastDue: number;
  /** Current risk score. */
  currentRiskScore: number;
}

// ── In-Memory Store (Production: Use Database) ──────────────────────────────

interface StoredCheckIn extends RiskCheckIn {
  clientName: string;
  currentRiskScore: number;
  responses?: Array<{ questionId: string; answer: string | number }>;
  completedAt?: string;
}

const checkInStore = new Map<string, StoredCheckIn>();

// ── Question Generation ─────────────────────────────────────────────────────

/**
 * Generates a personalized quarterly risk check-in.
 *
 * Uses AI to create 5 targeted questions based on the client's current
 * risk profile, portfolio allocation, market conditions, and time since
 * last check-in. Questions assess behavioral risk tolerance drift.
 *
 * @param params - Check-in generation parameters
 * @returns Generated check-in with personalized questions
 *
 * @example
 * ```typescript
 * const checkIn = await generateRiskCheckIn({
 *   clientId: 'client-123',
 *   clientName: 'Jane Doe',
 *   currentRiskScore: 65,
 *   currentAllocation: { equity: 70, fixedIncome: 20, alternatives: 5, cash: 5 },
 *   marketConditions: 'High volatility, rising rates',
 * });
 * // Send checkIn.questions to client via portal/email
 * ```
 */
export async function generateRiskCheckIn(params: CheckInParams): Promise<RiskCheckIn> {
  const {
    clientId,
    clientName,
    currentRiskScore,
    currentAllocation,
    marketConditions,
    lastCheckInDate,
  } = params;

  // Default questions if AI is unavailable
  const defaultQuestions: CheckInQuestion[] = [
    {
      id: 'Q1',
      text: 'Over the past 3 months, how comfortable have you felt with market volatility?',
      type: 'SCALE',
    },
    {
      id: 'Q2',
      text: 'Has your investment time horizon changed since our last review?',
      type: 'YES_NO',
    },
    {
      id: 'Q3',
      text: 'How would you react if your portfolio declined 15% in the next month?',
      type: 'MULTIPLE_CHOICE',
      options: [
        { value: 'SELL_ALL', label: 'Sell everything immediately' },
        { value: 'SELL_SOME', label: 'Sell some holdings to reduce risk' },
        { value: 'HOLD', label: 'Hold steady and wait for recovery' },
        { value: 'BUY_MORE', label: 'Buy more at lower prices' },
      ],
    },
    {
      id: 'Q4',
      text: 'Has your income or employment situation changed significantly?',
      type: 'YES_NO',
    },
    {
      id: 'Q5',
      text: 'Are you comfortable with your current portfolio allocation?',
      type: 'SCALE',
    },
  ];

  let questions: CheckInQuestion[] = defaultQuestions;

  // Try to generate personalized questions via AI
  try {
    const systemPrompt = `You are a senior financial advisor generating personalized quarterly risk tolerance check-in questions.`;

    const userPrompt = `Generate 5 targeted check-in questions for this client:

Client: ${clientName}
Current Risk Score: ${currentRiskScore}/100
Current Allocation: ${currentAllocation.equity}% equity, ${currentAllocation.fixedIncome}% fixed income, ${currentAllocation.alternatives}% alternatives, ${currentAllocation.cash}% cash
Market Conditions: ${marketConditions ?? 'Normal volatility'}
Last Check-In: ${lastCheckInDate ?? 'First check-in'}

Return ONLY a JSON array of 5 questions in this format:
[
  {
    "id": "Q1",
    "text": "Question text here",
    "type": "SCALE" | "YES_NO" | "MULTIPLE_CHOICE",
    "options": [{"value": "...", "label": "..."}]  // only for MULTIPLE_CHOICE
  },
  ...
]

Focus on:
- Recent behavioral changes
- Response to current market conditions
- Time horizon shifts
- Comfort with current allocation
- Life events that might affect risk tolerance`;

    const response = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.5,
      maxTokens: 2048,
      jsonMode: true,
    });

    const parsed = JSON.parse(response.text);
    if (Array.isArray(parsed) && parsed.length === 5) {
      questions = parsed;
      console.log(`[Risk Check-In] Generated AI questions for ${clientName}`);
    }
  } catch (err) {
    console.warn('[Risk Check-In] AI generation failed, using default questions:', err);
  }

  // Create check-in
  const checkInId = randomUUID();
  const generatedAt = new Date().toISOString();
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days

  const checkIn: RiskCheckIn = {
    checkInId,
    clientId,
    questions,
    generatedAt,
    dueDate,
    status: 'PENDING',
  };

  // Store in memory (production: persist to database)
  checkInStore.set(checkInId, {
    ...checkIn,
    clientName,
    currentRiskScore,
  });

  console.log(`[Risk Check-In] Generated check-in ${checkInId} for client ${clientId}`);
  return checkIn;
}

// ── Response Processing ─────────────────────────────────────────────────────

/**
 * Processes client responses to a risk check-in.
 *
 * Analyzes responses to determine:
 * - Updated risk tolerance score
 * - Whether allocation should change
 * - Recommended advisor action (no change, minor adjustment, rebalance, full review)
 *
 * @param params - Check-in ID and client responses
 * @returns Check-in result with updated risk score and recommended action
 *
 * @example
 * ```typescript
 * const result = processCheckInResponses({
 *   checkInId: 'checkin-123',
 *   responses: [
 *     { questionId: 'Q1', answer: 3 },
 *     { questionId: 'Q2', answer: 'NO' },
 *     { questionId: 'Q3', answer: 'HOLD' },
 *   ],
 * });
 * if (result.recommendedAction === 'FULL_REVIEW') {
 *   // Alert advisor for portfolio review
 * }
 * ```
 */
export function processCheckInResponses(params: {
  checkInId: string;
  responses: Array<{ questionId: string; answer: string | number }>;
}): CheckInResult {
  const { checkInId, responses } = params;

  const checkIn = checkInStore.get(checkInId);
  if (!checkIn) {
    throw new Error(`Check-in ${checkInId} not found`);
  }

  // Simple heuristic scoring (production: use more sophisticated model)
  const currentRiskScore = checkIn.currentRiskScore;
  let scoreAdjustment = 0;

  for (const response of responses) {
    const { questionId, answer } = response;

    // Scale questions (1-5): convert to -10 to +10 score adjustment
    if (typeof answer === 'number') {
      const normalized = ((answer - 3) / 2) * 10; // -10 to +10
      scoreAdjustment += normalized;
    }

    // YES_NO questions
    if (answer === 'YES') {
      // Assume "yes" to change questions = more conservative
      scoreAdjustment -= 5;
    }

    // MULTIPLE_CHOICE questions
    if (typeof answer === 'string') {
      if (answer === 'SELL_ALL') scoreAdjustment -= 15;
      if (answer === 'SELL_SOME') scoreAdjustment -= 7;
      if (answer === 'HOLD') scoreAdjustment += 0;
      if (answer === 'BUY_MORE') scoreAdjustment += 10;
    }
  }

  // Calculate updated risk score (clamped 1-100)
  const updatedRiskScore = Math.max(1, Math.min(100, currentRiskScore + scoreAdjustment));
  const scoreDelta = updatedRiskScore - currentRiskScore;

  // Determine if allocation should change
  const allocationChange = Math.abs(scoreDelta) >= 10;

  // Recommend action based on score delta
  let recommendedAction: CheckInResult['recommendedAction'];
  if (Math.abs(scoreDelta) < 5) {
    recommendedAction = 'NO_CHANGE';
  } else if (Math.abs(scoreDelta) < 10) {
    recommendedAction = 'MINOR_ADJUSTMENT';
  } else if (Math.abs(scoreDelta) < 20) {
    recommendedAction = 'REBALANCE';
  } else {
    recommendedAction = 'FULL_REVIEW';
  }

  // Generate summary
  const direction = scoreDelta > 0 ? 'more aggressive' : 'more conservative';
  const summary = `Risk score changed from ${currentRiskScore} to ${updatedRiskScore} (${scoreDelta > 0 ? '+' : ''}${scoreDelta}). Client appears ${direction}. ${
    allocationChange
      ? 'Allocation adjustment recommended.'
      : 'Current allocation still appropriate.'
  }`;

  // Update check-in status
  checkIn.status = 'COMPLETED';
  checkIn.responses = responses;
  checkIn.completedAt = new Date().toISOString();
  checkInStore.set(checkInId, checkIn);

  console.log(`[Risk Check-In] Processed responses for ${checkInId}: action=${recommendedAction}`);

  return {
    updatedRiskScore,
    scoreDelta,
    allocationChange,
    recommendedAction,
    summary,
  };
}

// ── Overdue Check-Ins ───────────────────────────────────────────────────────

/**
 * Retrieves overdue check-ins for an advisor's clients.
 *
 * Returns clients whose check-in due date has passed and status is still PENDING.
 * Sorted by days past due (most overdue first).
 *
 * @param advisorId - UUID of the advisor (not used in in-memory impl, but needed for DB query)
 * @returns Array of overdue check-in items
 *
 * @example
 * ```typescript
 * const overdue = getOverdueCheckIns('advisor-123');
 * for (const item of overdue) {
 *   console.log(`${item.clientName}: ${item.daysPastDue} days overdue`);
 * }
 * ```
 */
export function getOverdueCheckIns(advisorId: string): OverdueCheckIn[] {
  const now = new Date().toISOString();
  const overdueItems: OverdueCheckIn[] = [];

  for (const checkIn of checkInStore.values()) {
    if (checkIn.status === 'PENDING' && now > checkIn.dueDate) {
      const dueDate = new Date(checkIn.dueDate);
      const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      overdueItems.push({
        clientId: checkIn.clientId,
        clientName: checkIn.clientName,
        lastCheckIn: checkIn.generatedAt,
        daysPastDue,
        currentRiskScore: checkIn.currentRiskScore,
      });

      // Update status to OVERDUE
      checkIn.status = 'OVERDUE';
      checkInStore.set(checkIn.checkInId, checkIn);
    }
  }

  // Sort by days past due (most overdue first)
  overdueItems.sort((a, b) => b.daysPastDue - a.daysPastDue);

  return overdueItems;
}
