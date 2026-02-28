// Risk Profile Question Bank — Multi-axis, wealth-tier-scaled questions
// Axes: tolerance, capacity, bias, complexity

import type {
  RiskQuestion,
  QuestionOption,
  QuestionType,
  Category,
  QuestionAxis,
  WealthTier,
  ComplianceTag,
} from './types';
import { CATEGORY_TO_AXIS } from './types';

// ── Helpers ──────────────────────────────────────────────────────────

interface QuestionTemplate {
  stem: string;
  type: QuestionType;
  category: Category;
  subcategory: string;
  options: QuestionOption[];
  biasDetection?: 'framing' | 'recency' | 'loss_aversion' | 'overconfidence';
}

const WEALTH_TIERS: WealthTier[] = ['emerging', 'mass_affluent', 'hnw', 'uhnw'];
const COMPLIANCE_TAGS: ComplianceTag[] = ['finra_2111', 'finra_2111', 'reg_bi', 'cfa_framework', 'general'];

function buildQuestions(
  startId: number,
  templates: QuestionTemplate[],
  tier: WealthTier,
): RiskQuestion[] {
  return templates.map((t, i) => ({
    id: startId + i,
    questionText: t.stem,
    questionType: t.type,
    axis: CATEGORY_TO_AXIS[t.category],
    category: t.category,
    subcategory: t.subcategory,
    options: t.options,
    weight: 1.0 + (i % 4) * 0.33,
    complianceTag: COMPLIANCE_TAGS[i % COMPLIANCE_TAGS.length],
    wealthTier: tier,
    biasDetection: t.biasDetection,
  }));
}

// ── Standard option sets ─────────────────────────────────────────────

const OPT_AGREE: QuestionOption[] = [
  { value: 1, label: 'Strongly disagree', score: 1 },
  { value: 2, label: 'Disagree', score: 2 },
  { value: 3, label: 'Neutral', score: 3 },
  { value: 4, label: 'Agree', score: 4 },
  { value: 5, label: 'Strongly agree', score: 5 },
];

const OPT_AGREE_INV: QuestionOption[] = [
  { value: 1, label: 'Strongly agree', score: 1 },
  { value: 2, label: 'Agree', score: 2 },
  { value: 3, label: 'Neutral', score: 3 },
  { value: 4, label: 'Disagree', score: 4 },
  { value: 5, label: 'Strongly disagree', score: 5 },
];

const OPT_LOSS_REACT: QuestionOption[] = [
  { value: 1, label: 'Sell everything immediately', score: 1 },
  { value: 2, label: 'Sell a portion to reduce exposure', score: 2 },
  { value: 3, label: 'Hold and wait for recovery', score: 3 },
  { value: 4, label: 'Hold and look for opportunities', score: 4 },
  { value: 5, label: 'Buy more at lower prices', score: 5 },
];

const OPT_KNOWLEDGE: QuestionOption[] = [
  { value: 1, label: 'No knowledge', score: 1 },
  { value: 2, label: 'Basic understanding', score: 2 },
  { value: 3, label: 'Intermediate', score: 3 },
  { value: 4, label: 'Advanced', score: 4 },
  { value: 5, label: 'Expert / Professional', score: 5 },
];

// ── EMERGING TIER templates (< $500K) ────────────────────────────────

const EMERGING_TEMPLATES: QuestionTemplate[] = [
  // TOLERANCE (5)
  { stem: 'If your $10,000 investment dropped to $8,000, what would you do?', type: 'scenario', category: 'loss_scenarios', subcategory: 'drawdown', options: OPT_LOSS_REACT },
  { stem: 'How would you feel seeing your savings account balance fluctuate by $500 per week?', type: 'scenario', category: 'emotional_reaction', subcategory: 'daily', options: [
    { value: 1, label: 'Very anxious — I would want to move to cash', score: 1 },
    { value: 2, label: 'Uncomfortable — I would check it frequently', score: 2 },
    { value: 3, label: 'Slightly uneasy but I would leave it alone', score: 3 },
    { value: 4, label: 'Not bothered — fluctuations are normal', score: 4 },
    { value: 5, label: 'Excited — it means my money is working', score: 5 },
  ] },
  { stem: 'Would you prefer a guaranteed 3% return or a chance at 10% with the possibility of losing 5%?', type: 'scenario', category: 'volatility_preference', subcategory: 'tradeoff', options: [
    { value: 1, label: 'Definitely the guaranteed 3%', score: 1 },
    { value: 2, label: 'Lean toward the guaranteed return', score: 2 },
    { value: 3, label: 'Either would be acceptable', score: 3 },
    { value: 4, label: 'Lean toward the chance at 10%', score: 4 },
    { value: 5, label: 'Definitely take the chance at 10%', score: 5 },
  ] },
  { stem: 'If your 401(k) balance dropped 15% during a market correction, would you change your contribution strategy?', type: 'scenario', category: 'loss_scenarios', subcategory: 'behavioral', options: OPT_AGREE_INV },
  { stem: 'How comfortable are you with the idea that your investments could lose money in any given year?', type: 'multiple_choice', category: 'emotional_reaction', subcategory: 'general', options: OPT_AGREE },
  // CAPACITY (4)
  { stem: 'How many years until you expect to need this money for a major goal?', type: 'multiple_choice', category: 'time_horizon', subcategory: 'general', options: [
    { value: 1, label: 'Less than 1 year', score: 1 },
    { value: 2, label: '1–3 years', score: 2 },
    { value: 3, label: '3–5 years', score: 3 },
    { value: 4, label: '5–10 years', score: 4 },
    { value: 5, label: 'More than 10 years', score: 5 },
  ] },
  { stem: 'If you lost your job tomorrow, how many months could you cover expenses without touching investments?', type: 'multiple_choice', category: 'financial_cushion', subcategory: 'emergency', options: [
    { value: 1, label: 'Less than 1 month', score: 1 },
    { value: 2, label: '1–3 months', score: 2 },
    { value: 3, label: '3–6 months', score: 3 },
    { value: 4, label: '6–12 months', score: 4 },
    { value: 5, label: 'More than 12 months', score: 5 },
  ] },
  { stem: 'How likely is it you will need to withdraw a large portion of your investments in the next 2 years?', type: 'multiple_choice', category: 'liquidity_needs', subcategory: 'withdrawal', options: OPT_AGREE_INV },
  { stem: 'Do you have other reliable sources of income besides your investments?', type: 'multiple_choice', category: 'financial_cushion', subcategory: 'income', options: OPT_AGREE },
  // BIAS (4)
  { stem: 'After seeing a friend make money on a popular stock, would you be more inclined to buy it too?', type: 'scenario', category: 'behavioral_bias', subcategory: 'herd', options: OPT_AGREE_INV, biasDetection: 'framing' },
  { stem: 'When an investment goes up 20%, do you tend to sell it to "lock in gains"?', type: 'multiple_choice', category: 'behavioral_bias', subcategory: 'disposition', options: OPT_AGREE_INV, biasDetection: 'loss_aversion' },
  { stem: 'After a market drop, are you more likely to think "this will keep falling" than "this is a buying opportunity"?', type: 'scenario', category: 'behavioral_bias', subcategory: 'recency', options: OPT_AGREE_INV, biasDetection: 'recency' },
  { stem: 'How confident are you that you can pick investments that beat the market?', type: 'scale', category: 'behavioral_bias', subcategory: 'overconfidence', options: OPT_AGREE, biasDetection: 'overconfidence' },
  // COMPLEXITY (2)
  { stem: 'How would you rate your understanding of stocks, bonds, and mutual funds?', type: 'scale', category: 'knowledge', subcategory: 'self_assessed', options: OPT_KNOWLEDGE },
  { stem: 'Would you consider investing in something you don\'t fully understand if a trusted advisor recommended it?', type: 'multiple_choice', category: 'alternatives_comfort', subcategory: 'trust', options: OPT_AGREE },
];

// ── MASS AFFLUENT TIER templates ($500K–$2M) ─────────────────────────

const MASS_AFFLUENT_TEMPLATES: QuestionTemplate[] = [
  // TOLERANCE (5)
  { stem: 'If your $500,000 portfolio declined 20% in six months, how would you react?', type: 'scenario', category: 'loss_scenarios', subcategory: 'drawdown', options: OPT_LOSS_REACT },
  { stem: 'How would you feel if your taxable brokerage account dropped $100,000 in a quarter?', type: 'scenario', category: 'emotional_reaction', subcategory: 'dollar_impact', options: [
    { value: 1, label: 'Extremely anxious — I would lose sleep', score: 1 },
    { value: 2, label: 'Very concerned — I would call my advisor', score: 2 },
    { value: 3, label: 'Uncomfortable but I would hold steady', score: 3 },
    { value: 4, label: 'Concerned but confident in recovery', score: 4 },
    { value: 5, label: 'Not worried — corrections are normal', score: 5 },
  ] },
  { stem: 'Which return/risk profile would you prefer for your portfolio over the next 10 years?', type: 'scenario', category: 'volatility_preference', subcategory: 'tradeoff', options: [
    { value: 1, label: '3% return with almost no volatility', score: 1 },
    { value: 2, label: '5% return with low volatility', score: 2 },
    { value: 3, label: '7% return with moderate volatility', score: 3 },
    { value: 4, label: '10% return with significant volatility', score: 4 },
    { value: 5, label: '13%+ return with very high volatility', score: 5 },
  ] },
  { stem: 'In 2022, a balanced portfolio lost roughly 15-20%. If that happened to you, would you stay invested?', type: 'scenario', category: 'loss_scenarios', subcategory: 'historical', options: OPT_AGREE },
  { stem: 'Would you accept a higher chance of short-term losses for potentially greater long-term gains?', type: 'multiple_choice', category: 'emotional_reaction', subcategory: 'tradeoff', options: OPT_AGREE },
  // CAPACITY (4)
  { stem: 'When do you expect to begin drawing significantly on your invested assets?', type: 'multiple_choice', category: 'time_horizon', subcategory: 'withdrawal', options: [
    { value: 1, label: 'Within 1 year', score: 1 },
    { value: 2, label: '1–3 years', score: 2 },
    { value: 3, label: '3–7 years', score: 3 },
    { value: 4, label: '7–15 years', score: 4 },
    { value: 5, label: 'More than 15 years', score: 5 },
  ] },
  { stem: 'Could you cover 2 years of living expenses without touching your investment portfolio?', type: 'multiple_choice', category: 'financial_cushion', subcategory: 'reserves', options: OPT_AGREE },
  { stem: 'How likely is it you will need to liquidate investments for a large purchase (home, business) in the next 3 years?', type: 'multiple_choice', category: 'liquidity_needs', subcategory: 'major_purchase', options: OPT_AGREE_INV },
  { stem: 'What portion of your total net worth is in liquid, investable assets?', type: 'multiple_choice', category: 'financial_cushion', subcategory: 'concentration', options: [
    { value: 1, label: 'Less than 20%', score: 1 },
    { value: 2, label: '20–40%', score: 2 },
    { value: 3, label: '40–60%', score: 3 },
    { value: 4, label: '60–80%', score: 4 },
    { value: 5, label: 'More than 80%', score: 5 },
  ] },
  // BIAS (4)
  { stem: 'Imagine your portfolio lost $75,000 this quarter. Now imagine it gained $75,000. Which feeling is stronger — the pain of loss or the joy of gain?', type: 'scenario', category: 'behavioral_bias', subcategory: 'loss_aversion', options: [
    { value: 1, label: 'The loss pain is much stronger', score: 1 },
    { value: 2, label: 'The loss pain is somewhat stronger', score: 2 },
    { value: 3, label: 'About equal', score: 3 },
    { value: 4, label: 'The gain joy is somewhat stronger', score: 4 },
    { value: 5, label: 'The gain joy is much stronger', score: 5 },
  ], biasDetection: 'loss_aversion' },
  { stem: 'After a strong bull market year, do you feel more confident your portfolio will keep rising?', type: 'multiple_choice', category: 'behavioral_bias', subcategory: 'recency', options: OPT_AGREE_INV, biasDetection: 'recency' },
  { stem: 'Do you believe you have above-average ability to time the market compared to other investors?', type: 'scale', category: 'behavioral_bias', subcategory: 'overconfidence', options: OPT_AGREE, biasDetection: 'overconfidence' },
  { stem: 'Would you be more willing to invest $50,000 framed as "potential to double" versus "risk of losing half"?', type: 'scenario', category: 'behavioral_bias', subcategory: 'framing', options: OPT_AGREE_INV, biasDetection: 'framing' },
  // COMPLEXITY (2)
  { stem: 'How comfortable are you with tax-loss harvesting, RSUs, and stock option strategies?', type: 'scale', category: 'knowledge', subcategory: 'tax_strategies', options: OPT_KNOWLEDGE },
  { stem: 'Would you consider allocating 10-15% of your portfolio to alternative investments like REITs or private funds?', type: 'multiple_choice', category: 'alternatives_comfort', subcategory: 'alts', options: OPT_AGREE },
];

// ── HNW TIER templates ($2M–$10M) ────────────────────────────────────

const HNW_TEMPLATES: QuestionTemplate[] = [
  // TOLERANCE (5)
  { stem: 'Your $5M portfolio drops 30% in a severe correction — a loss of $1.5M on paper. What do you do?', type: 'scenario', category: 'loss_scenarios', subcategory: 'severe', options: OPT_LOSS_REACT },
  { stem: 'A concentrated stock position worth $800K has dropped 35%. Would you harvest the loss, hold, or add to the position?', type: 'scenario', category: 'loss_scenarios', subcategory: 'concentrated', options: [
    { value: 1, label: 'Sell the entire position', score: 1 },
    { value: 2, label: 'Harvest the loss and diversify', score: 2 },
    { value: 3, label: 'Hold and monitor closely', score: 3 },
    { value: 4, label: 'Hold — I believe in the company long-term', score: 4 },
    { value: 5, label: 'Add more at the lower price', score: 5 },
  ] },
  { stem: 'How comfortable are you with a portfolio that could swing ±15% in any given year?', type: 'multiple_choice', category: 'volatility_preference', subcategory: 'annual_range', options: OPT_AGREE },
  { stem: 'If a trusted advisor recommended staying fully invested during a 40% market decline, could you follow that advice?', type: 'scenario', category: 'emotional_reaction', subcategory: 'advisor_trust', options: OPT_AGREE },
  { stem: 'Would you remain invested if financial media unanimously predicted further declines after a 25% drop?', type: 'scenario', category: 'emotional_reaction', subcategory: 'media_influence', options: OPT_AGREE },
  // CAPACITY (4)
  { stem: 'Is your investment portfolio generational wealth that you do not plan to spend in your lifetime?', type: 'multiple_choice', category: 'time_horizon', subcategory: 'multi_gen', options: OPT_AGREE },
  { stem: 'Could your household maintain its lifestyle for 3+ years solely from income and reserves, without touching investments?', type: 'multiple_choice', category: 'financial_cushion', subcategory: 'coverage', options: OPT_AGREE },
  { stem: 'Do you have upcoming capital commitments (business expansion, real estate, education) that require portfolio liquidity?', type: 'multiple_choice', category: 'liquidity_needs', subcategory: 'commitments', options: OPT_AGREE_INV },
  { stem: 'How dependent are you on portfolio income (dividends, distributions) for current living expenses?', type: 'multiple_choice', category: 'liquidity_needs', subcategory: 'income_dependency', options: OPT_AGREE_INV },
  // BIAS (4)
  { stem: 'After 2023\'s strong market recovery, did you increase your equity allocation or wish you had invested more during the 2022 downturn?', type: 'scenario', category: 'behavioral_bias', subcategory: 'recency', options: OPT_AGREE, biasDetection: 'recency' },
  { stem: 'Do you find yourself anchoring investment decisions to the price you originally paid rather than current fundamentals?', type: 'multiple_choice', category: 'behavioral_bias', subcategory: 'anchoring', options: OPT_AGREE_INV, biasDetection: 'loss_aversion' },
  { stem: 'Would you describe your investment decision-making as primarily data-driven or primarily intuition-driven?', type: 'multiple_choice', category: 'behavioral_bias', subcategory: 'decision_process', options: [
    { value: 1, label: 'Entirely intuition and gut feeling', score: 1 },
    { value: 2, label: 'Mostly intuition with some data', score: 2 },
    { value: 3, label: 'Balance of both', score: 3 },
    { value: 4, label: 'Mostly data with some intuition', score: 4 },
    { value: 5, label: 'Entirely data and process-driven', score: 5 },
  ], biasDetection: 'overconfidence' },
  { stem: 'When presented with two identical investments — one framed as "80% chance of success" and the other as "20% chance of failure" — would your preference change?', type: 'scenario', category: 'behavioral_bias', subcategory: 'framing', options: OPT_AGREE_INV, biasDetection: 'framing' },
  // COMPLEXITY (2)
  { stem: 'How comfortable are you with private equity, hedge fund, or private credit investments with multi-year lockup periods?', type: 'scale', category: 'alternatives_comfort', subcategory: 'lockup', options: OPT_AGREE },
  { stem: 'Do you understand how options strategies, leverage, and derivatives can be used for hedging and income generation?', type: 'scale', category: 'knowledge', subcategory: 'derivatives', options: OPT_KNOWLEDGE },
];

// ── UHNW TIER templates ($10M+) ──────────────────────────────────────

const UHNW_TEMPLATES: QuestionTemplate[] = [
  // TOLERANCE (5)
  { stem: 'Your family office portfolio is $50M with 20% in PE that has J-curve exposure. A $3M capital call arrives during a market downturn. How does this affect your liquid portfolio strategy?', type: 'scenario', category: 'loss_scenarios', subcategory: 'capital_call', options: [
    { value: 1, label: 'Sell equities to meet the call and reduce PE commitment', score: 1 },
    { value: 2, label: 'Reluctantly meet the call but reduce future commitments', score: 2 },
    { value: 3, label: 'Meet the call from reserves — it was planned for', score: 3 },
    { value: 4, label: 'Meet the call and view it as buying at attractive valuations', score: 4 },
    { value: 5, label: 'Meet the call and consider increasing the PE program', score: 5 },
  ] },
  { stem: 'In a 2008-style event, your total portfolio (including illiquid alts) could decline 40–50%. Assuming a 5+ year recovery timeline, how do you respond?', type: 'scenario', category: 'emotional_reaction', subcategory: 'systemic_crisis', options: OPT_LOSS_REACT },
  { stem: 'Your art collection and crypto allocation together represent 15% of net worth and are highly volatile. Are you comfortable with this concentration in non-traditional assets?', type: 'scenario', category: 'volatility_preference', subcategory: 'alt_concentration', options: OPT_AGREE },
  { stem: 'A hedge fund in your portfolio gates redemptions during a liquidity crisis. You cannot access those funds for 12+ months. How does this affect your confidence?', type: 'scenario', category: 'loss_scenarios', subcategory: 'liquidity_event', options: [
    { value: 1, label: 'Extremely shaken — I would exit all hedge fund positions at first opportunity', score: 1 },
    { value: 2, label: 'Very concerned — I would reduce hedge fund exposure significantly', score: 2 },
    { value: 3, label: 'Uncomfortable but I understand the mechanics', score: 3 },
    { value: 4, label: 'Not ideal but I sized the allocation with this possibility in mind', score: 4 },
    { value: 5, label: 'Expected risk — my portfolio is structured to handle illiquidity', score: 5 },
  ] },
  { stem: 'Would you maintain a 5% Bitcoin/crypto allocation through a 70% drawdown if your long-term thesis remains intact?', type: 'scenario', category: 'emotional_reaction', subcategory: 'crypto_vol', options: OPT_AGREE },
  // CAPACITY (4)
  { stem: 'Is your wealth structured for multi-generational transfer with a 30+ year investment horizon?', type: 'multiple_choice', category: 'time_horizon', subcategory: 'dynastic', options: OPT_AGREE },
  { stem: 'Could your family maintain its lifestyle indefinitely from trust distributions and business income alone, without any portfolio returns?', type: 'multiple_choice', category: 'financial_cushion', subcategory: 'independence', options: OPT_AGREE },
  { stem: 'Do you have material unfunded commitments — capital calls, charitable pledges, or entity obligations — that require liquidity over the next 3 years?', type: 'multiple_choice', category: 'liquidity_needs', subcategory: 'commitments', options: OPT_AGREE_INV },
  { stem: 'What percentage of your total assets are illiquid (PE, real estate, operating businesses, art)?', type: 'multiple_choice', category: 'liquidity_needs', subcategory: 'illiquidity', options: [
    { value: 1, label: 'More than 70% illiquid', score: 1 },
    { value: 2, label: '50–70% illiquid', score: 2 },
    { value: 3, label: '30–50% illiquid', score: 3 },
    { value: 4, label: '15–30% illiquid', score: 4 },
    { value: 5, label: 'Less than 15% illiquid', score: 5 },
  ] },
  // BIAS (4)
  { stem: 'After a PE fund delivers 3x returns, do you find yourself overweighting that manager\'s next fund regardless of strategy changes?', type: 'scenario', category: 'behavioral_bias', subcategory: 'recency', options: OPT_AGREE_INV, biasDetection: 'recency' },
  { stem: 'Do you feel your investment judgment is better than most institutional investors?', type: 'scale', category: 'behavioral_bias', subcategory: 'overconfidence', options: OPT_AGREE, biasDetection: 'overconfidence' },
  { stem: 'Would you evaluate a co-investment opportunity differently if framed as "top-quartile expected performance" versus "one-in-four chance of capital loss"?', type: 'scenario', category: 'behavioral_bias', subcategory: 'framing', options: OPT_AGREE_INV, biasDetection: 'framing' },
  { stem: 'Do you hold onto underperforming direct investments (real estate, businesses) longer than you should because of the emotional attachment?', type: 'multiple_choice', category: 'behavioral_bias', subcategory: 'endowment', options: OPT_AGREE_INV, biasDetection: 'loss_aversion' },
  // COMPLEXITY (2)
  { stem: 'How comfortable are you evaluating PE fund terms — carried interest, preferred return, GP co-invest, vintage diversification, and J-curve dynamics?', type: 'scale', category: 'alternatives_comfort', subcategory: 'pe_terms', options: OPT_KNOWLEDGE },
  { stem: 'Do you understand the risk characteristics of structured products, options overlays, and tax-efficient lending strategies like box spreads?', type: 'scale', category: 'knowledge', subcategory: 'institutional', options: OPT_KNOWLEDGE },
];

// ── Build the full bank ──────────────────────────────────────────────

export const QUESTION_BANK: RiskQuestion[] = [
  ...buildQuestions(1, EMERGING_TEMPLATES, 'emerging'),
  ...buildQuestions(100, MASS_AFFLUENT_TEMPLATES, 'mass_affluent'),
  ...buildQuestions(200, HNW_TEMPLATES, 'hnw'),
  ...buildQuestions(300, UHNW_TEMPLATES, 'uhnw'),
];
