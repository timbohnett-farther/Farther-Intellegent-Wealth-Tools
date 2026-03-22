// ═══════════════════════════════════════════════════════════════════════
// Farther Focus — AI Service Layer
// Handles AI-powered adaptive question generation and risk profile
// scoring. Falls back to the static 395-question bank and scoring
// engine when the AI API key is not configured or calls fail.
// ═══════════════════════════════════════════════════════════════════════

import type {
  RiskQuestion,
  QuestionResponse,
  ClientIntake,
  RiskProfile,
  QuestionAxis,
  WealthTier,
} from './types';
import { CATEGORY_TO_AXIS, RISK_BAND_LABELS } from './types';

// ── Configuration (delegated to AI Gateway) ─────────────────────────

import { callAI, isAIAvailable } from '../ai/gateway';

export function isAIEnabled(): boolean {
  return isAIAvailable();
}

// ── Types ────────────────────────────────────────────────────────────

export interface AIQuestionContext {
  intake: ClientIntake;
  previousQuestions: RiskQuestion[];
  previousResponses: QuestionResponse[];
  questionNumber: number;
  totalQuestions: number;
}

export interface AIProfileContext {
  intake: ClientIntake;
  questions: RiskQuestion[];
  responses: QuestionResponse[];
}

interface AIProfileScores {
  axisScores: {
    tolerance: number;
    capacity: number;
    need: number;
    biasIndex: number;
    complexity: number;
  };
  toleranceBand: number;
  capacityBand: number;
  recommendedBand: number;
  detectedBiases: {
    type: string;
    severity: string;
    description: string;
    advisorTalkingPoint: string;
  }[];
  inconsistencies: {
    dimensions: [string, string];
    severity: string;
    description: string;
    recommendation: string;
  }[];
  goalFeasibility: {
    goalName: string;
    requiredReturn: number;
    recommendedReturn: number;
    feasible: boolean;
    shortfallNote: string;
  }[];
  confidence: number;
  complianceNotes: string;
}

// ── Axis Coverage Tracking ───────────────────────────────────────────

const TARGET_DISTRIBUTION: Record<QuestionAxis, number> = {
  tolerance: 5,
  capacity: 4,
  bias: 4,
  complexity: 2,
};

function getAxisCoverage(questions: RiskQuestion[]): Record<QuestionAxis, number> {
  const coverage: Record<QuestionAxis, number> = {
    tolerance: 0,
    capacity: 0,
    bias: 0,
    complexity: 0,
  };

  for (const q of questions) {
    const axis = q.axis ?? (q.category ? CATEGORY_TO_AXIS[q.category] : undefined);
    if (axis) {
      coverage[axis]++;
    }
  }

  return coverage;
}

// ── AI API Call (delegated to gateway) ─────────────────────────────

async function callAnthropicAPI(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await callAI({
    systemPrompt,
    userPrompt,
    maxTokens: 4096,
  });
  return response.text;
}

// ── Extract JSON from AI response ────────────────────────────────────

function extractJSON(text: string): string {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  throw new Error('No JSON found in AI response');
}

// ── Adaptive Question Generation ─────────────────────────────────────

const QUESTION_SYSTEM_PROMPT = `You are an expert financial advisor and psychometrician creating risk profiling questions for a wealth management platform called "Farther Focus."

Your questions must:
1. Be clear, specific, and avoid jargon inappropriate for the client's wealth tier
2. Have exactly 5 options scored 1-5 (1 = most conservative/risk-averse, 5 = most aggressive/risk-tolerant)
3. For bias detection questions: 1 = strongly biased behavior, 5 = rational/unbiased behavior
4. Use scenario-based questions for tolerance, factual questions for capacity, framing/consistency questions for bias, and knowledge questions for complexity
5. Scale sophistication to the client's wealth tier (emerging = simple, UHNW = institutional-grade)
6. Not repeat or closely paraphrase previously asked questions
7. Comply with FINRA 2111, Reg BI, and CFA Institute risk profiling standards

The 4 risk axes and target distribution (15 total):
- TOLERANCE (5 questions): Emotional reactions to loss, volatility comfort, risk-return tradeoffs
- CAPACITY (4 questions): Time horizon, liquidity needs, financial cushion, income stability
- BIAS (4 questions): Loss aversion, recency bias, overconfidence, framing effects, herd behavior
- COMPLEXITY (2 questions): Investment knowledge, alternatives comfort, derivatives understanding

Return ONLY a valid JSON object with no additional text.`;

export async function generateAdaptiveQuestion(
  context: AIQuestionContext,
): Promise<RiskQuestion> {
  const { intake, previousQuestions, previousResponses, questionNumber, totalQuestions } = context;
  const coverage = getAxisCoverage(previousQuestions);

  // Determine which axis needs the most coverage
  const axisNeeds = Object.entries(TARGET_DISTRIBUTION).map(([axis, target]) => ({
    axis: axis as QuestionAxis,
    remaining: target - (coverage[axis as QuestionAxis] || 0),
  }));
  axisNeeds.sort((a, b) => b.remaining - a.remaining);

  const tierDescriptions: Record<WealthTier, string> = {
    emerging: 'Emerging investor (<$500K). Use simple, relatable scenarios involving savings, 401(k)s, and modest portfolios.',
    mass_affluent: 'Mass affluent ($500K–$2M). Reference taxable brokerage accounts, RSUs, and moderate portfolio values.',
    hnw: 'High net worth ($2M–$10M). Use sophisticated scenarios involving concentrated positions, alternatives, and tax strategies.',
    uhnw: 'Ultra-high net worth ($10M+). Reference PE capital calls, hedge fund gates, family office dynamics, and institutional strategies.',
  };

  // Build previous Q&A context
  const qaContext = previousQuestions.map((q, i) => {
    const response = previousResponses.find(r => r.questionId === q.id);
    const selectedOption = response ? q.options.find(o => o.value === response.answerValue) : null;
    return `Q${i + 1} [${q.axis ?? CATEGORY_TO_AXIS[q.category] ?? 'unknown'}]: ${q.questionText}\n  Answer: ${selectedOption?.label ?? 'Not answered'} (score: ${selectedOption?.score ?? 'N/A'})`;
  }).join('\n\n');

  const userPrompt = `Generate question ${questionNumber} of ${totalQuestions} for this client.

CLIENT PROFILE:
- Wealth tier: ${intake.wealthTier} — ${tierDescriptions[intake.wealthTier]}
- Age: ${intake.demographics.age}, ${intake.demographics.maritalStatus}, ${intake.demographics.dependents} dependents
- Annual income: $${intake.financials.annualIncome.toLocaleString()}, stability: ${intake.financials.incomeStability}
- Liquid net worth: $${intake.financials.liquidNetWorth.toLocaleString()}
- Investment experience: ${intake.investmentExperienceYears} years
- Goals: ${intake.goals.map(g => `${g.name} ($${g.targetAmount.toLocaleString()}, ${g.timeHorizonYears}yr, ${g.priority})`).join('; ') || 'None specified'}

AXIS COVERAGE SO FAR:
- Tolerance: ${coverage.tolerance}/${TARGET_DISTRIBUTION.tolerance}
- Capacity: ${coverage.capacity}/${TARGET_DISTRIBUTION.capacity}
- Bias: ${coverage.bias}/${TARGET_DISTRIBUTION.bias}
- Complexity: ${coverage.complexity}/${TARGET_DISTRIBUTION.complexity}

PRIORITY AXIS: ${axisNeeds[0].axis} (needs ${axisNeeds[0].remaining} more questions)

${previousQuestions.length > 0 ? `PREVIOUS QUESTIONS AND ANSWERS:\n${qaContext}` : 'This is the first question.'}

Return a JSON object:
{
  "questionText": "...",
  "questionType": "multiple_choice" | "scale" | "scenario",
  "axis": "${axisNeeds[0].axis}",
  "category": "one of: emotional_reaction, loss_scenarios, volatility_preference, time_horizon, liquidity_needs, financial_cushion, behavioral_bias, alternatives_comfort, knowledge",
  "subcategory": "a brief descriptor",
  "options": [
    { "value": 1, "label": "...", "score": 1 },
    { "value": 2, "label": "...", "score": 2 },
    { "value": 3, "label": "...", "score": 3 },
    { "value": 4, "label": "...", "score": 4 },
    { "value": 5, "label": "...", "score": 5 }
  ],
  "weight": 1.0 to 2.0,
  "complianceTag": "finra_2111" | "reg_bi" | "cfa_framework" | "general",
  "biasDetection": null or "loss_aversion" | "recency" | "overconfidence" | "framing"
}`;

  const responseText = await callAnthropicAPI(QUESTION_SYSTEM_PROMPT, userPrompt);
  const json = extractJSON(responseText);
  const parsed = JSON.parse(json);

  // Validate and construct the RiskQuestion
  const question: RiskQuestion = {
    id: 1000 + questionNumber,
    questionText: parsed.questionText,
    questionType: parsed.questionType ?? 'multiple_choice',
    axis: parsed.axis ?? axisNeeds[0].axis,
    category: parsed.category ?? 'emotional_reaction',
    subcategory: parsed.subcategory ?? 'ai_generated',
    options: Array.isArray(parsed.options) ? parsed.options.map((o: { value: number; label: string; score: number }, i: number) => ({
      value: o.value ?? (i + 1),
      label: o.label ?? `Option ${i + 1}`,
      score: o.score ?? (i + 1),
    })) : [],
    weight: typeof parsed.weight === 'number' ? Math.min(Math.max(parsed.weight, 1.0), 2.0) : 1.5,
    complianceTag: parsed.complianceTag ?? 'general',
    wealthTier: intake.wealthTier,
    biasDetection: parsed.biasDetection ?? undefined,
  };

  // Ensure we have valid options
  if (question.options.length < 2) {
    throw new Error('AI returned insufficient options');
  }

  return question;
}

// ── AI-Powered Profile Generation ────────────────────────────────────

const PROFILE_SYSTEM_PROMPT = `You are an expert financial advisor, behavioral finance specialist, and compliance officer analyzing a client's risk profile for the "Farther Focus" wealth management platform.

Your analysis must:
1. Compute multi-axis scores based on questionnaire responses and financial data
2. Score tolerance (0-100) from psychological/emotional risk responses
3. Score capacity (0-100) blending questionnaire answers (40%) with computed financial capacity (60%): age factor, liquidity reserves, expense coverage, debt ratio, time horizon
4. Compute required return (need %) using goal amounts, current allocations, and time horizons
5. Compute bias index (0-100) from consistency of bias-detection question pairs
6. Score complexity (0-100) from knowledge and alternatives comfort responses
7. Map tolerance and capacity to 7 risk bands (0-14→1, 15-28→2, 29-42→3, 43-57→4, 58-71→5, 72-85→6, 86-100→7)
8. Recommended band = min(toleranceBand, capacityBand) — a client's risk exposure must not exceed their financial ability
9. Detect behavioral biases: loss_aversion, recency, overconfidence, framing, herd
10. Identify inconsistencies between stated preferences and financial situation
11. Assess goal feasibility against the recommended portfolio's expected return
12. Generate Reg BI-compliant documentation

Risk band labels: ${JSON.stringify(RISK_BAND_LABELS)}

Return ONLY a valid JSON object with no additional text.`;

export async function generateAIProfile(
  context: AIProfileContext,
): Promise<AIProfileScores> {
  const { intake, questions, responses } = context;

  // Build Q&A summary for the prompt
  const qaSummary = questions.map((q) => {
    const response = responses.find(r => r.questionId === q.id);
    const selectedOption = response ? q.options.find(o => o.value === response.answerValue) : null;
    const axis = q.axis ?? CATEGORY_TO_AXIS[q.category] ?? 'unknown';
    return {
      questionText: q.questionText,
      axis,
      category: q.category,
      biasDetection: q.biasDetection ?? null,
      weight: q.weight,
      selectedScore: selectedOption?.score ?? 0,
      selectedLabel: selectedOption?.label ?? 'Not answered',
    };
  });

  const userPrompt = `Analyze this client's risk profile and generate a comprehensive assessment.

CLIENT INTAKE:
- Age: ${intake.demographics.age}, ${intake.demographics.maritalStatus}, ${intake.demographics.dependents} dependents, ${intake.demographics.stateOfResidence}
- Wealth tier: ${intake.wealthTier}
- Annual income: $${intake.financials.annualIncome.toLocaleString()} (${intake.financials.incomeStability})
- Total net worth: $${intake.financials.totalNetWorth.toLocaleString()}
- Liquid net worth: $${intake.financials.liquidNetWorth.toLocaleString()}
- Annual expenses: $${intake.financials.annualExpenses.toLocaleString()}
- Debt obligations: $${intake.financials.debtObligations.toLocaleString()}
- Emergency reserves: ${intake.financials.emergencyReserveMonths} months
- Investment experience: ${intake.investmentExperienceYears} years
- Tax: ${intake.tax.filingStatus}, ${intake.tax.marginalBracket}% bracket, ${intake.tax.stateIncomeTaxRate}% state
- Goals: ${JSON.stringify(intake.goals)}
- Alternatives exposure: ${JSON.stringify(intake.alternatives)}

QUESTIONNAIRE RESPONSES (${questions.length} questions):
${qaSummary.map((q, i) => `${i + 1}. [${q.axis}/${q.category}${q.biasDetection ? `/bias:${q.biasDetection}` : ''}] (weight: ${q.weight})
   Q: ${q.questionText}
   A: ${q.selectedLabel} (score: ${q.selectedScore}/5)`).join('\n')}

Return a JSON object:
{
  "axisScores": {
    "tolerance": 0-100,
    "capacity": 0-100,
    "need": required annual return percentage,
    "biasIndex": 0-100 (higher = more biased),
    "complexity": 0-100
  },
  "toleranceBand": 1-7,
  "capacityBand": 1-7,
  "recommendedBand": 1-7 (must be min of toleranceBand, capacityBand),
  "detectedBiases": [
    {
      "type": "loss_aversion" | "recency" | "overconfidence" | "framing" | "herd",
      "severity": "low" | "moderate" | "high",
      "description": "Clear description of the detected bias",
      "advisorTalkingPoint": "How the advisor should discuss this with the client"
    }
  ],
  "inconsistencies": [
    {
      "dimensions": ["axis1", "axis2"],
      "severity": "info" | "warning" | "critical",
      "description": "What contradicts what",
      "recommendation": "What to do about it"
    }
  ],
  "goalFeasibility": [
    {
      "goalName": "...",
      "requiredReturn": percentage,
      "recommendedReturn": portfolio expected return percentage,
      "feasible": true/false,
      "shortfallNote": "Explanation"
    }
  ],
  "confidence": 0-100,
  "complianceNotes": "Full Reg BI compliance narrative (2-3 paragraphs covering: client profile, assessment results, recommendation rationale, behavioral findings, consistency checks, goal feasibility, regulatory framework citations)"
}`;

  const responseText = await callAnthropicAPI(PROFILE_SYSTEM_PROMPT, userPrompt);
  const json = extractJSON(responseText);
  const parsed = JSON.parse(json) as AIProfileScores;

  // Validate critical fields
  if (!parsed.axisScores || typeof parsed.recommendedBand !== 'number') {
    throw new Error('AI response missing required profile fields');
  }

  return parsed;
}
