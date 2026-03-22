// ═══════════════════════════════════════════════════════════════════════
// Farther Focus — Risk Profile Question Bank
// ~212 questions across 4 axes, 9 categories, and 4 wealth tiers
// 60 hand-crafted base questions (15 per tier) + builder variations
// ═══════════════════════════════════════════════════════════════════════

import type {
  RiskQuestion,
  QuestionOption,
  QuestionType,
  Category,
  WealthTier,
  ComplianceTag,
} from './types';
import { CATEGORY_TO_AXIS } from './types';

// ── Internal builder types ──────────────────────────────────────────

interface BaseQuestion {
  questionText: string;
  questionType: QuestionType;
  category: Category;
  subcategory: string;
  options: QuestionOption[];
  weight: number;
  complianceTag: ComplianceTag;
  wealthTier: WealthTier;
  biasDetection?: 'framing' | 'recency' | 'loss_aversion' | 'overconfidence';
}

// ── Variation builder ───────────────────────────────────────────────
// Takes 60 hand-crafted base questions and produces ~212 total by
// applying contextual prefixes and pronoun swaps. The original base
// question is always included as variation 0 (unmodified).

const VARIATION_PREFIXES: string[] = [
  'Considering your overall financial picture, ',
  'From a long-term perspective, ',
  'Thinking about your wealth goals, ',
  'Given your current financial situation, ',
  'When evaluating your portfolio strategy, ',
  'Looking at your complete financial picture, ',
  'With your investment objectives in mind, ',
  'Reflecting on your financial priorities, ',
];

const PRONOUN_SWAPS: [RegExp, string][] = [
  [/\byou /i, 'your household '],
  [/\byour portfolio/i, "your family's portfolio"],
  [/\byour investment/i, "your household's investment"],
];

function applyVariation(text: string, variationIndex: number): string {
  if (variationIndex === 0) return text;

  // Variations 1-3: try pronoun swaps
  if (variationIndex <= PRONOUN_SWAPS.length) {
    const [pattern, replacement] = PRONOUN_SWAPS[variationIndex - 1];
    if (pattern.test(text)) {
      return text.replace(pattern, replacement);
    }
  }

  // All other variations (or swap fallback): contextual prefix
  const prefixIdx = (variationIndex - 1) % VARIATION_PREFIXES.length;
  const prefix = VARIATION_PREFIXES[prefixIdx];
  return prefix + text.charAt(0).toLowerCase() + text.slice(1);
}

function getVariationCount(category: Category): number {
  const axis = CATEGORY_TO_AXIS[category];
  switch (axis) {
    case 'tolerance':
    case 'capacity':
      return 4;
    case 'bias':
    case 'complexity':
      return 3;
    default:
      return 3;
  }
}

/**
 * Builds the complete question bank from hand-crafted base questions.
 * Tolerance/capacity bases get 4 variations each (1 original + 3).
 * Bias/complexity bases get 3 variations each (1 original + 2).
 * Total: (32 x 4) + (28 x 3) = 128 + 84 = 212
 */
function buildFullBank(bases: BaseQuestion[]): RiskQuestion[] {
  const questions: RiskQuestion[] = [];
  let nextId = 1;

  for (const base of bases) {
    const variationCount = getVariationCount(base.category);

    for (let v = 0; v < variationCount; v++) {
      const questionText = applyVariation(base.questionText, v);
      // Originals keep full weight; variations get a slight reduction
      const weight = v === 0
        ? base.weight
        : Math.max(Math.round((base.weight - 0.05 * Math.min(v, 3)) * 100) / 100, 0.5);

      const question: RiskQuestion = {
        id: nextId++,
        questionText,
        questionType: base.questionType,
        axis: CATEGORY_TO_AXIS[base.category],
        category: base.category,
        subcategory: base.subcategory,
        options: base.options,
        weight,
        complianceTag: base.complianceTag,
        wealthTier: base.wealthTier,
      };

      if (base.biasDetection) {
        question.biasDetection = base.biasDetection;
      }

      questions.push(question);
    }
  }

  return questions;
}

// ═══════════════════════════════════════════════════════════════════════
// TIER 1: EMERGING (under $500K)
// Simple, relatable language. References $10K portfolios, 401(k),
// mutual funds, savings accounts. Accessible to first-time investors.
//
// 15 questions: 4 tolerance, 4 capacity, 4 bias, 3 complexity
// ═══════════════════════════════════════════════════════════════════════

const EMERGING_BASE: BaseQuestion[] = [
  // ── tolerance: emotional_reaction ─────────────────────────────────
  {
    questionText:
      'If your $10,000 investment dropped to $8,000 in one month, what would you do?',
    questionType: 'scenario',
    category: 'emotional_reaction',
    subcategory: 'drawdown_response',
    options: [
      { value: 1, label: 'Sell everything immediately to prevent further losses', score: 1 },
      { value: 2, label: 'Sell about half to reduce my risk', score: 2 },
      { value: 3, label: 'Do nothing and wait for it to recover', score: 3 },
      { value: 4, label: 'Hold steady and research what caused the drop', score: 4 },
      { value: 5, label: 'Add more money to buy at the lower price', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'finra_2111',
    wealthTier: 'emerging',
  },
  {
    questionText:
      'When you see news about a stock market crash, how do you feel about your 401(k)?',
    questionType: 'multiple_choice',
    category: 'emotional_reaction',
    subcategory: 'media_reaction',
    options: [
      { value: 1, label: 'Panicked — I want to move everything to cash', score: 1 },
      { value: 2, label: 'Very worried — I check my balance repeatedly', score: 2 },
      { value: 3, label: 'Concerned but I know it will likely recover', score: 3 },
      { value: 4, label: 'Calm — market ups and downs are normal', score: 4 },
      { value: 5, label: 'Excited — it is a chance to buy more through my contributions', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'reg_bi',
    wealthTier: 'emerging',
  },
  // ── tolerance: loss_scenarios ─────────────────────────────────────
  {
    questionText:
      'Imagine you invested $5,000 in a mutual fund and after one year it is worth $4,000. What would you most likely do?',
    questionType: 'scenario',
    category: 'loss_scenarios',
    subcategory: 'annual_loss',
    options: [
      { value: 1, label: 'Sell the fund and put the money in a savings account', score: 1 },
      { value: 2, label: 'Move to a more conservative fund', score: 2 },
      { value: 3, label: 'Keep the fund and wait for recovery', score: 3 },
      { value: 4, label: 'Keep it and add a little more each month', score: 4 },
      { value: 5, label: 'Double my investment — the fund is on sale', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'finra_2111',
    wealthTier: 'emerging',
  },
  // ── tolerance: volatility_preference ──────────────────────────────
  {
    questionText:
      'Which savings approach sounds most comfortable to you?',
    questionType: 'multiple_choice',
    category: 'volatility_preference',
    subcategory: 'risk_return_tradeoff',
    options: [
      { value: 1, label: 'A savings account earning 2% per year — steady and safe', score: 1 },
      { value: 2, label: 'A bond fund earning about 4% with small ups and downs', score: 2 },
      { value: 3, label: 'A balanced fund averaging 7% but swinging 10% in bad years', score: 3 },
      { value: 4, label: 'A stock fund averaging 10% but could drop 25% some years', score: 4 },
      { value: 5, label: 'An aggressive growth fund averaging 13% but could drop 40%', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'cfa_framework',
    wealthTier: 'emerging',
  },

  // ── capacity: time_horizon ────────────────────────────────────────
  {
    questionText:
      'When do you expect to need this money for a major goal like retirement, a home, or education?',
    questionType: 'multiple_choice',
    category: 'time_horizon',
    subcategory: 'goal_timeline',
    options: [
      { value: 1, label: 'Within the next year', score: 1 },
      { value: 2, label: '1 to 3 years', score: 2 },
      { value: 3, label: '3 to 7 years', score: 3 },
      { value: 4, label: '7 to 15 years', score: 4 },
      { value: 5, label: 'More than 15 years — I am investing for the long term', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'finra_2111',
    wealthTier: 'emerging',
  },
  // ── capacity: liquidity_needs ─────────────────────────────────────
  {
    questionText:
      'If you lost your job tomorrow, how many months could you cover expenses without touching your investments?',
    questionType: 'multiple_choice',
    category: 'liquidity_needs',
    subcategory: 'emergency_runway',
    options: [
      { value: 1, label: 'Less than 1 month', score: 1 },
      { value: 2, label: '1 to 3 months', score: 2 },
      { value: 3, label: '3 to 6 months', score: 3 },
      { value: 4, label: '6 to 12 months', score: 4 },
      { value: 5, label: 'More than a year — I have a solid emergency fund', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'reg_bi',
    wealthTier: 'emerging',
  },
  // ── capacity: financial_cushion ───────────────────────────────────
  {
    questionText:
      'How much of your total savings is represented by this investment account?',
    questionType: 'multiple_choice',
    category: 'financial_cushion',
    subcategory: 'portfolio_concentration',
    options: [
      { value: 1, label: 'Almost all of it — this is my only savings', score: 1 },
      { value: 2, label: 'About 75% of my savings', score: 2 },
      { value: 3, label: 'About 50% of my savings', score: 3 },
      { value: 4, label: 'About 25% of my savings', score: 4 },
      { value: 5, label: 'A small portion — I have substantial other assets', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'finra_2111',
    wealthTier: 'emerging',
  },
  // ── capacity: time_horizon (second) ───────────────────────────────
  {
    questionText:
      'How many years until you plan to retire?',
    questionType: 'multiple_choice',
    category: 'time_horizon',
    subcategory: 'retirement_horizon',
    options: [
      { value: 1, label: 'Already retired or within 2 years', score: 1 },
      { value: 2, label: '2 to 5 years', score: 2 },
      { value: 3, label: '5 to 15 years', score: 3 },
      { value: 4, label: '15 to 30 years', score: 4 },
      { value: 5, label: 'More than 30 years', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'reg_bi',
    wealthTier: 'emerging',
  },

  // ── bias: behavioral_bias / framing ───────────────────────────────
  {
    questionText:
      'Investment A has a 90% chance of keeping your money safe. Investment B has a 10% chance of losing your money. They are the same investment. Which sounds more appealing?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'framing_effect',
    options: [
      { value: 1, label: 'Strongly prefer A — it sounds much safer', score: 1 },
      { value: 2, label: 'Lean toward A', score: 2 },
      { value: 3, label: 'I realize they are the same thing', score: 3 },
      { value: 4, label: 'Lean toward B — I focus on probability', score: 4 },
      { value: 5, label: 'The framing does not affect me — I would analyze the actual numbers', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'emerging',
    biasDetection: 'framing',
  },
  // ── bias: behavioral_bias / recency ───────────────────────────────
  {
    questionText:
      'The stock market has risen strongly for the past 3 months. How does this affect your desire to invest more?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'recency_bias',
    options: [
      { value: 1, label: 'I want to invest a lot more — it seems like a sure thing', score: 1 },
      { value: 2, label: 'I am more interested in investing now', score: 2 },
      { value: 3, label: 'It does not change my plan', score: 3 },
      { value: 4, label: 'I am a bit cautious — what goes up might come down', score: 4 },
      { value: 5, label: 'Recent performance is irrelevant to my long-term strategy', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'emerging',
    biasDetection: 'recency',
  },
  // ── bias: behavioral_bias / loss_aversion ─────────────────────────
  {
    questionText:
      'Would you accept a coin flip bet where heads wins you $1,500 and tails loses you $1,000?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'loss_aversion',
    options: [
      { value: 1, label: 'Absolutely not — losing $1,000 would be devastating', score: 1 },
      { value: 2, label: 'Probably not — the potential loss bothers me more than the gain excites me', score: 2 },
      { value: 3, label: 'Maybe — it is mathematically favorable but emotionally hard', score: 3 },
      { value: 4, label: 'Probably yes — the expected value is positive', score: 4 },
      { value: 5, label: 'Definitely — I always take positive expected value bets', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'cfa_framework',
    wealthTier: 'emerging',
    biasDetection: 'loss_aversion',
  },
  // ── bias: behavioral_bias / overconfidence ────────────────────────
  {
    questionText:
      'How confident are you that you can pick investments that beat the overall stock market?',
    questionType: 'multiple_choice',
    category: 'behavioral_bias',
    subcategory: 'overconfidence',
    options: [
      { value: 1, label: 'Very confident — I have a good track record', score: 1 },
      { value: 2, label: 'Somewhat confident — I do my research', score: 2 },
      { value: 3, label: 'Uncertain — it is hard to beat the market consistently', score: 3 },
      { value: 4, label: 'Not very confident — I prefer index funds', score: 4 },
      { value: 5, label: 'Not confident at all — research shows most people cannot beat the market', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'general',
    wealthTier: 'emerging',
    biasDetection: 'overconfidence',
  },

  // ── complexity: alternatives_comfort ──────────────────────────────
  {
    questionText:
      'How comfortable would you be investing in something other than regular stocks, bonds, and mutual funds?',
    questionType: 'multiple_choice',
    category: 'alternatives_comfort',
    subcategory: 'general_comfort',
    options: [
      { value: 1, label: 'Not comfortable at all — I want to stick with what I know', score: 1 },
      { value: 2, label: 'Somewhat uncomfortable — I would need a lot of explanation', score: 2 },
      { value: 3, label: 'Neutral — I am open if the advisor recommends it', score: 3 },
      { value: 4, label: 'Somewhat comfortable — I like learning about new options', score: 4 },
      { value: 5, label: 'Very comfortable — I actively seek alternative investments', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'reg_bi',
    wealthTier: 'emerging',
  },
  // ── complexity: knowledge ─────────────────────────────────────────
  {
    questionText:
      'Which best describes your investment experience?',
    questionType: 'multiple_choice',
    category: 'knowledge',
    subcategory: 'experience_level',
    options: [
      { value: 1, label: 'I have never invested before', score: 1 },
      { value: 2, label: 'I have a 401(k) or IRA but do not actively manage it', score: 2 },
      { value: 3, label: 'I invest in mutual funds and ETFs on my own', score: 3 },
      { value: 4, label: 'I trade individual stocks and understand basic strategies', score: 4 },
      { value: 5, label: 'I have experience with options, margin, and advanced strategies', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'finra_2111',
    wealthTier: 'emerging',
  },
  // ── complexity: alternatives_comfort (second) ─────────────────────
  {
    questionText:
      'If your advisor suggested putting 10% of your portfolio into a real estate investment trust (REIT), how would you react?',
    questionType: 'scenario',
    category: 'alternatives_comfort',
    subcategory: 'reit_comfort',
    options: [
      { value: 1, label: 'No thanks — I only want stocks and bonds I understand', score: 1 },
      { value: 2, label: 'Hesitant — I would need to learn a lot before agreeing', score: 2 },
      { value: 3, label: 'Open to it if the advisor can explain the risks clearly', score: 3 },
      { value: 4, label: 'Interested — diversification into real estate sounds smart', score: 4 },
      { value: 5, label: 'Enthusiastic — I have already been thinking about REITs', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'reg_bi',
    wealthTier: 'emerging',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// TIER 2: MASS AFFLUENT ($500K-$2M)
// Moderate sophistication. References $500K portfolios, taxable
// accounts, stock options, RSUs, Roth conversions, sector ETFs.
//
// 15 questions: 4 tolerance, 4 capacity, 4 bias, 3 complexity
// ═══════════════════════════════════════════════════════════════════════

const MASS_AFFLUENT_BASE: BaseQuestion[] = [
  // ── tolerance: emotional_reaction ─────────────────────────────────
  {
    questionText:
      'If your $500,000 portfolio declined 20% in six months, losing $100,000, how would you react?',
    questionType: 'scenario',
    category: 'emotional_reaction',
    subcategory: 'drawdown_response',
    options: [
      { value: 1, label: 'Sell to cash — I cannot afford to lose more', score: 1 },
      { value: 2, label: 'Shift heavily toward bonds and conservative assets', score: 2 },
      { value: 3, label: 'Hold my current allocation and wait for recovery', score: 3 },
      { value: 4, label: 'Rebalance into the dip — stocks are cheaper now', score: 4 },
      { value: 5, label: 'Aggressively add to equities — this is a buying opportunity', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'finra_2111',
    wealthTier: 'mass_affluent',
  },
  {
    questionText:
      'Your company stock (20% of your portfolio) drops 30% after a disappointing earnings report. What is your first instinct?',
    questionType: 'scenario',
    category: 'emotional_reaction',
    subcategory: 'concentrated_position_reaction',
    options: [
      { value: 1, label: 'Sell the entire position immediately', score: 1 },
      { value: 2, label: 'Sell most of it to diversify', score: 2 },
      { value: 3, label: 'Hold and reassess at the next earnings cycle', score: 3 },
      { value: 4, label: 'Hold and set up a tax-loss harvesting opportunity', score: 4 },
      { value: 5, label: 'Buy more — I believe in the company long-term', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'reg_bi',
    wealthTier: 'mass_affluent',
  },
  // ── tolerance: loss_scenarios ─────────────────────────────────────
  {
    questionText:
      'During a prolonged bear market, your taxable investment account loses 25% over 18 months. You also have upcoming RSU vests. What approach do you take?',
    questionType: 'scenario',
    category: 'loss_scenarios',
    subcategory: 'bear_market_strategy',
    options: [
      { value: 1, label: 'Sell investments and sell RSUs on vest to raise cash', score: 1 },
      { value: 2, label: 'Hold investments but sell RSUs on vest to build reserves', score: 2 },
      { value: 3, label: 'Hold everything and maintain my existing plan', score: 3 },
      { value: 4, label: 'Hold investments, keep some RSUs, and use losses for tax-loss harvesting', score: 4 },
      { value: 5, label: 'Increase equity exposure and hold RSUs for long-term appreciation', score: 5 },
    ],
    weight: 1.75,
    complianceTag: 'reg_bi',
    wealthTier: 'mass_affluent',
  },
  // ── tolerance: volatility_preference ──────────────────────────────
  {
    questionText:
      'For your taxable brokerage account, which portfolio would you prefer?',
    questionType: 'multiple_choice',
    category: 'volatility_preference',
    subcategory: 'risk_return_tradeoff',
    options: [
      { value: 1, label: 'Municipal bonds yielding 3% tax-free — very stable', score: 1 },
      { value: 2, label: 'Balanced fund: 5-6% returns with 8% annual volatility', score: 2 },
      { value: 3, label: 'Diversified equity/bond mix: 8% returns with 15% volatility', score: 3 },
      { value: 4, label: 'Growth-tilted equity: 10% returns with 20% volatility', score: 4 },
      { value: 5, label: 'Concentrated growth: 12%+ returns with 25%+ volatility', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'cfa_framework',
    wealthTier: 'mass_affluent',
  },

  // ── capacity: time_horizon ────────────────────────────────────────
  {
    questionText:
      'Considering your financial goals — retirement, education, home purchase — what is your longest investment time horizon?',
    questionType: 'multiple_choice',
    category: 'time_horizon',
    subcategory: 'multi_goal_horizon',
    options: [
      { value: 1, label: 'Under 3 years — I have near-term needs', score: 1 },
      { value: 2, label: '3 to 5 years', score: 2 },
      { value: 3, label: '5 to 10 years', score: 3 },
      { value: 4, label: '10 to 20 years', score: 4 },
      { value: 5, label: '20+ years — I am building long-term wealth', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'finra_2111',
    wealthTier: 'mass_affluent',
  },
  // ── capacity: liquidity_needs ─────────────────────────────────────
  {
    questionText:
      'Over the next 3 years, do you anticipate needing to liquidate more than 20% of your portfolio for any reason (home, business, education)?',
    questionType: 'multiple_choice',
    category: 'liquidity_needs',
    subcategory: 'planned_withdrawals',
    options: [
      { value: 1, label: 'Yes, I will need more than 40% of the portfolio', score: 1 },
      { value: 2, label: 'Yes, roughly 20-40%', score: 2 },
      { value: 3, label: 'Possibly, but I could adjust timing', score: 3 },
      { value: 4, label: 'Unlikely — I have other cash sources', score: 4 },
      { value: 5, label: 'No foreseeable need — the portfolio can stay fully invested', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'finra_2111',
    wealthTier: 'mass_affluent',
  },
  // ── capacity: financial_cushion ───────────────────────────────────
  {
    questionText:
      'Beyond this portfolio, how would you describe your financial safety net (emergency fund, spouse income, real estate equity)?',
    questionType: 'multiple_choice',
    category: 'financial_cushion',
    subcategory: 'safety_net',
    options: [
      { value: 1, label: 'Minimal — this portfolio is the core of my finances', score: 1 },
      { value: 2, label: 'Modest — I have some savings but limited backup', score: 2 },
      { value: 3, label: 'Adequate — 6+ months expenses plus home equity', score: 3 },
      { value: 4, label: 'Strong — multiple income sources and substantial reserves', score: 4 },
      { value: 5, label: 'Very strong — significant real estate, business value, and liquid reserves', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'reg_bi',
    wealthTier: 'mass_affluent',
  },
  // ── capacity: time_horizon (second) ───────────────────────────────
  {
    questionText:
      'If you received stock options or RSUs with a 4-year vesting schedule, would that change how you think about your portfolio timeline?',
    questionType: 'scenario',
    category: 'time_horizon',
    subcategory: 'equity_compensation',
    options: [
      { value: 1, label: 'No — I need my portfolio liquid regardless of vesting schedules', score: 1 },
      { value: 2, label: 'Slightly — I might extend my timeline by a year or two', score: 2 },
      { value: 3, label: 'Moderately — the future vests give me more flexibility', score: 3 },
      { value: 4, label: 'Significantly — I can afford to take a longer view', score: 4 },
      { value: 5, label: 'Completely — my vesting income means this portfolio is truly long-term', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'general',
    wealthTier: 'mass_affluent',
  },

  // ── bias: behavioral_bias / framing ───────────────────────────────
  {
    questionText:
      'Your advisor presents two identical portfolios: Portfolio A "limits downside to 10% in bad years" while Portfolio B "captures 90% of upside in good years." Which appeals to you more?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'framing_effect',
    options: [
      { value: 1, label: 'Strongly prefer A — downside protection is critical', score: 1 },
      { value: 2, label: 'Lean toward A — limiting losses sounds better', score: 2 },
      { value: 3, label: 'I recognize this is framing and would analyze both equally', score: 3 },
      { value: 4, label: 'Lean toward B — I want to capture gains', score: 4 },
      { value: 5, label: 'Strongly prefer B — I focus on growth potential', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'mass_affluent',
    biasDetection: 'framing',
  },
  // ── bias: behavioral_bias / recency ───────────────────────────────
  {
    questionText:
      'Tech sector ETFs have outperformed the S&P 500 by 15% over the past year. How does this affect your allocation decision?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'recency_bias',
    options: [
      { value: 1, label: 'I want to shift heavily into tech — the trend is clear', score: 1 },
      { value: 2, label: 'I would increase my tech weighting somewhat', score: 2 },
      { value: 3, label: 'I stick with my target allocation regardless of recent performance', score: 3 },
      { value: 4, label: 'I might trim tech — mean reversion is real', score: 4 },
      { value: 5, label: 'Past year performance has zero impact on my forward-looking allocation', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'mass_affluent',
    biasDetection: 'recency',
  },
  // ── bias: behavioral_bias / loss_aversion ─────────────────────────
  {
    questionText:
      'You have a stock position with a $15,000 unrealized loss. Your advisor suggests selling to harvest the tax loss and reinvesting in a similar holding. How do you feel?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'loss_aversion',
    options: [
      { value: 1, label: 'I refuse to sell at a loss — it feels like admitting defeat', score: 1 },
      { value: 2, label: 'Reluctant — I want to wait until I at least break even', score: 2 },
      { value: 3, label: 'Uncomfortable, but I understand the tax benefit logic', score: 3 },
      { value: 4, label: 'I would sell — the tax savings are worth more than the emotional cost', score: 4 },
      { value: 5, label: 'I proactively look for tax-loss harvesting opportunities', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'reg_bi',
    wealthTier: 'mass_affluent',
    biasDetection: 'loss_aversion',
  },
  // ── bias: behavioral_bias / overconfidence ────────────────────────
  {
    questionText:
      'Over the past 5 years, how do you think your investment returns compared to the S&P 500 index?',
    questionType: 'multiple_choice',
    category: 'behavioral_bias',
    subcategory: 'overconfidence',
    options: [
      { value: 1, label: 'I am certain I significantly outperformed the index', score: 1 },
      { value: 2, label: 'I think I slightly beat the index', score: 2 },
      { value: 3, label: 'Roughly in line — hard to tell without checking', score: 3 },
      { value: 4, label: 'I probably underperformed slightly after fees and taxes', score: 4 },
      { value: 5, label: 'I honestly do not know and would need to measure it properly', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'mass_affluent',
    biasDetection: 'overconfidence',
  },

  // ── complexity: alternatives_comfort ──────────────────────────────
  {
    questionText:
      'Your advisor recommends allocating 15% of your portfolio to alternatives: a real estate fund, a commodity ETF, and a structured note. How do you respond?',
    questionType: 'scenario',
    category: 'alternatives_comfort',
    subcategory: 'multi_alt_exposure',
    options: [
      { value: 1, label: 'No — I want only publicly traded stocks and bonds', score: 1 },
      { value: 2, label: 'I would consider the real estate fund only — the others seem too exotic', score: 2 },
      { value: 3, label: 'Open to it if the advisor can clearly explain each one', score: 3 },
      { value: 4, label: 'Comfortable — I understand these and see the diversification benefit', score: 4 },
      { value: 5, label: 'I would want even more alternatives — 15% seems conservative', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'reg_bi',
    wealthTier: 'mass_affluent',
  },
  // ── complexity: knowledge ─────────────────────────────────────────
  {
    questionText:
      'How well do you understand the concepts of asset allocation, rebalancing, and tax-efficient investing?',
    questionType: 'scale',
    category: 'knowledge',
    subcategory: 'technical_literacy',
    options: [
      { value: 1, label: 'I have heard of them but could not explain them', score: 1 },
      { value: 2, label: 'Basic understanding — I know the general ideas', score: 2 },
      { value: 3, label: 'Intermediate — I can discuss them with my advisor', score: 3 },
      { value: 4, label: 'Advanced — I actively apply these concepts in my portfolio', score: 4 },
      { value: 5, label: 'Expert — I could teach these concepts to others', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'finra_2111',
    wealthTier: 'mass_affluent',
  },
  // ── complexity: knowledge (second) ────────────────────────────────
  {
    questionText:
      'Do you understand the tax implications of selling investments held less than one year versus more than one year?',
    questionType: 'multiple_choice',
    category: 'knowledge',
    subcategory: 'tax_knowledge',
    options: [
      { value: 1, label: 'I did not know there was a difference', score: 1 },
      { value: 2, label: 'I know short-term gains are taxed more but not the specifics', score: 2 },
      { value: 3, label: 'I understand short-term vs long-term capital gains rates', score: 3 },
      { value: 4, label: 'I factor holding periods into every buy and sell decision', score: 4 },
      { value: 5, label: 'I actively manage tax lots and consider wash sale rules', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'finra_2111',
    wealthTier: 'mass_affluent',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// TIER 3: HNW ($2M-$10M)
// Complex language. References $5M portfolios, concentrated positions,
// direct indexing, tax-loss harvesting at scale, private credit,
// municipal bond ladders, factor tilts.
//
// 15 questions: 4 tolerance, 4 capacity, 4 bias, 3 complexity
// ═══════════════════════════════════════════════════════════════════════

const HNW_BASE: BaseQuestion[] = [
  // ── tolerance: emotional_reaction ─────────────────────────────────
  {
    questionText:
      'Your $5M portfolio includes a concentrated stock position that has dropped 35%. Your advisor proposes a systematic diversification plan over 12 months. How do you feel about executing during weakness?',
    questionType: 'scenario',
    category: 'emotional_reaction',
    subcategory: 'concentrated_diversification',
    options: [
      { value: 1, label: 'I cannot sell at these prices — I want to wait for recovery first', score: 1 },
      { value: 2, label: 'I would sell a small portion but mostly hold for now', score: 2 },
      { value: 3, label: 'I trust the plan — systematic selling removes emotional timing', score: 3 },
      { value: 4, label: 'Good timing — I can harvest substantial tax losses during transition', score: 4 },
      { value: 5, label: 'I want to accelerate the plan — the concentration risk is now clear', score: 5 },
    ],
    weight: 1.75,
    complianceTag: 'reg_bi',
    wealthTier: 'hnw',
  },
  {
    questionText:
      'During a market correction, your direct-indexed portfolio triggers significant tax-loss harvesting, but the portfolio value is still down 18%. How does the tax benefit affect your emotional response?',
    questionType: 'scenario',
    category: 'emotional_reaction',
    subcategory: 'tax_aware_emotions',
    options: [
      { value: 1, label: 'The tax benefit is irrelevant — I am upset about the dollar losses', score: 1 },
      { value: 2, label: 'Slightly comforting, but the losses still dominate my thinking', score: 2 },
      { value: 3, label: 'The tax savings meaningfully offset my concern about the decline', score: 3 },
      { value: 4, label: 'I actually feel good — the after-tax outcome is far better than it looks', score: 4 },
      { value: 5, label: 'Market corrections are when tax-loss harvesting earns its keep — this is ideal', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'cfa_framework',
    wealthTier: 'hnw',
  },
  // ── tolerance: loss_scenarios ─────────────────────────────────────
  {
    questionText:
      'Your $5M portfolio drops to $3.5M during a severe recession. Simultaneously, your private equity fund issues a $200K capital call. How do you respond?',
    questionType: 'scenario',
    category: 'loss_scenarios',
    subcategory: 'multi_stress',
    options: [
      { value: 1, label: 'Liquidate public equities to meet the call and shift to cash', score: 1 },
      { value: 2, label: 'Meet the call from reserves and significantly de-risk the public portfolio', score: 2 },
      { value: 3, label: 'Meet the call from reserves and hold the public portfolio steady', score: 3 },
      { value: 4, label: 'Meet the call and view the PE investment as buying at distressed valuations', score: 4 },
      { value: 5, label: 'Meet the call, hold equities, and look for additional distressed opportunities', score: 5 },
    ],
    weight: 2.0,
    complianceTag: 'finra_2111',
    wealthTier: 'hnw',
  },
  // ── tolerance: volatility_preference ──────────────────────────────
  {
    questionText:
      'For your $5M portfolio, which allocation strategy appeals to you most?',
    questionType: 'multiple_choice',
    category: 'volatility_preference',
    subcategory: 'allocation_preference',
    options: [
      { value: 1, label: 'Municipal bond ladder + short-duration treasuries: ~3.5% after-tax, minimal volatility', score: 1 },
      { value: 2, label: '40/60 equity-bond with direct indexing: ~5.5% with 8% volatility', score: 2 },
      { value: 3, label: '60/30/10 equity-bond-alts: ~7.5% with 12% volatility', score: 3 },
      { value: 4, label: '75/15/10 equity-bond-alts with factor tilts: ~9% with 16% volatility', score: 4 },
      { value: 5, label: '85% equity with concentrated positions + 15% alternatives: ~11% with 22% volatility', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'cfa_framework',
    wealthTier: 'hnw',
  },

  // ── capacity: time_horizon ────────────────────────────────────────
  {
    questionText:
      'Given your overall wealth, what is the longest time horizon you would assign to any portion of your portfolio?',
    questionType: 'multiple_choice',
    category: 'time_horizon',
    subcategory: 'segmented_horizon',
    options: [
      { value: 1, label: 'Under 5 years — I may need all of it relatively soon', score: 1 },
      { value: 2, label: '5 to 10 years — I have some medium-term goals', score: 2 },
      { value: 3, label: '10 to 20 years — retirement and legacy planning', score: 3 },
      { value: 4, label: '20 to 30 years — multi-generational wealth building', score: 4 },
      { value: 5, label: '30+ years — perpetual family wealth or charitable foundation', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'finra_2111',
    wealthTier: 'hnw',
  },
  // ── capacity: liquidity_needs ─────────────────────────────────────
  {
    questionText:
      'What percentage of your $5M portfolio do you need readily accessible (liquidatable within 5 business days) for planned or emergency needs?',
    questionType: 'multiple_choice',
    category: 'liquidity_needs',
    subcategory: 'liquidity_ratio',
    options: [
      { value: 1, label: 'More than 50% — I have significant near-term obligations', score: 1 },
      { value: 2, label: '30 to 50% — I need substantial liquidity', score: 2 },
      { value: 3, label: '15 to 30% — moderate liquidity needs', score: 3 },
      { value: 4, label: '5 to 15% — limited needs beyond emergency reserves', score: 4 },
      { value: 5, label: 'Under 5% — my other assets cover any liquidity needs', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'reg_bi',
    wealthTier: 'hnw',
  },
  // ── capacity: financial_cushion ───────────────────────────────────
  {
    questionText:
      'If your investment portfolio lost 40% of its value, how would your lifestyle and financial obligations be affected?',
    questionType: 'scenario',
    category: 'financial_cushion',
    subcategory: 'lifestyle_resilience',
    options: [
      { value: 1, label: 'Severe impact — I would need to dramatically change my lifestyle', score: 1 },
      { value: 2, label: 'Significant impact — I would need to cut discretionary spending', score: 2 },
      { value: 3, label: 'Moderate impact — I could maintain essentials but defer some goals', score: 3 },
      { value: 4, label: 'Minimal impact — other assets and income sustain my lifestyle', score: 4 },
      { value: 5, label: 'No meaningful impact — this portfolio is growth capital above my needs', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'finra_2111',
    wealthTier: 'hnw',
  },
  // ── capacity: liquidity_needs (second) ────────────────────────────
  {
    questionText:
      'You are considering a private credit fund with a 3-year lock-up that offers 200 basis points above comparable liquid bonds. Your current illiquid allocation is 10%. Would you invest?',
    questionType: 'scenario',
    category: 'liquidity_needs',
    subcategory: 'illiquidity_premium',
    options: [
      { value: 1, label: 'No — I need full liquidity and 10% illiquid is already my limit', score: 1 },
      { value: 2, label: 'Unlikely — the premium is not enough for 3 years of lock-up', score: 2 },
      { value: 3, label: 'Maybe — I would need to model the impact on my overall liquidity', score: 3 },
      { value: 4, label: 'Likely — the yield premium justifies the illiquidity for this portion', score: 4 },
      { value: 5, label: 'Yes — I would increase my illiquid allocation even further', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'reg_bi',
    wealthTier: 'hnw',
  },

  // ── bias: behavioral_bias / framing ───────────────────────────────
  {
    questionText:
      'Your advisor shows two strategies with identical 10-year returns. Strategy A is described as "protected against 95% of historical drawdowns." Strategy B is described as "captured gains in 95% of historical rallies." Which do you instinctively prefer?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'framing_effect',
    options: [
      { value: 1, label: 'Strongly prefer A — drawdown protection is essential at this wealth level', score: 1 },
      { value: 2, label: 'Lean toward A — loss prevention resonates more with me', score: 2 },
      { value: 3, label: 'I recognize the framing and would evaluate both on the same metrics', score: 3 },
      { value: 4, label: 'Lean toward B — I want to participate in upside', score: 4 },
      { value: 5, label: 'Strongly prefer B — capturing rallies is how wealth compounds', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'hnw',
    biasDetection: 'framing',
  },
  // ── bias: behavioral_bias / recency ───────────────────────────────
  {
    questionText:
      'After 3 consecutive years of strong equity returns averaging 18% annually, your advisor recommends rebalancing by trimming equities to target. How do you respond?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'recency_bias',
    options: [
      { value: 1, label: 'Increase equities further — the trend is your friend', score: 1 },
      { value: 2, label: 'Keep the current overweight — why sell winners?', score: 2 },
      { value: 3, label: 'Rebalance back to target — discipline matters', score: 3 },
      { value: 4, label: 'Rebalance and slightly underweight equities — valuations may be stretched', score: 4 },
      { value: 5, label: 'Aggressively trim equities — mean reversion suggests returns will moderate', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'hnw',
    biasDetection: 'recency',
  },
  // ── bias: behavioral_bias / loss_aversion ─────────────────────────
  {
    questionText:
      'A position in your direct-indexed portfolio is down $150,000. Your advisor recommends selling for tax-loss harvesting and reinvesting in a correlated substitute. The expected tax savings are $55,000. What do you do?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'loss_aversion',
    options: [
      { value: 1, label: 'I will not sell at a loss regardless of the tax benefit', score: 1 },
      { value: 2, label: 'I would prefer to wait until the position recovers', score: 2 },
      { value: 3, label: 'I understand the logic but still find it emotionally difficult', score: 3 },
      { value: 4, label: 'I would sell — the $55K in tax savings is a guaranteed benefit', score: 4 },
      { value: 5, label: 'I actively seek these situations — crystallizing losses for tax alpha is core strategy', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'reg_bi',
    wealthTier: 'hnw',
    biasDetection: 'loss_aversion',
  },
  // ── bias: behavioral_bias / overconfidence ────────────────────────
  {
    questionText:
      'You have a strong conviction about a specific sector based on your professional expertise. Would you allocate more than 25% of your portfolio to that sector?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'overconfidence',
    options: [
      { value: 1, label: 'Yes, potentially 40%+ — my professional insight gives me an edge', score: 1 },
      { value: 2, label: 'Yes, around 25-30% — informed concentration is smart', score: 2 },
      { value: 3, label: 'Maybe 15-20% — I want a tilt but recognize limits', score: 3 },
      { value: 4, label: 'No — I would limit it to 10% regardless of conviction', score: 4 },
      { value: 5, label: 'Absolutely not — professional knowledge rarely translates to investment outperformance', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'hnw',
    biasDetection: 'overconfidence',
  },

  // ── complexity: alternatives_comfort ──────────────────────────────
  {
    questionText:
      'Your advisor proposes a private equity co-investment with a $250K minimum, 7-year horizon, and J-curve return pattern (negative returns years 1-3). How interested are you?',
    questionType: 'scenario',
    category: 'alternatives_comfort',
    subcategory: 'private_equity',
    options: [
      { value: 1, label: 'Not interested — illiquid, complex, and I cannot stomach negative early returns', score: 1 },
      { value: 2, label: 'Cautious — I would need extensive education before considering', score: 2 },
      { value: 3, label: 'Moderately interested — if it fits my plan and I understand the risks', score: 3 },
      { value: 4, label: 'Interested — I am comfortable with PE dynamics and want the diversification', score: 4 },
      { value: 5, label: 'Very interested — I want meaningful PE exposure and understand J-curve mechanics', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'reg_bi',
    wealthTier: 'hnw',
  },
  // ── complexity: knowledge ─────────────────────────────────────────
  {
    questionText:
      'How well do you understand: direct indexing, factor-based investing, tax-loss harvesting optimization, and alpha/beta separation?',
    questionType: 'scale',
    category: 'knowledge',
    subcategory: 'advanced_concepts',
    options: [
      { value: 1, label: 'I am unfamiliar with most of these terms', score: 1 },
      { value: 2, label: 'I have heard of them but could not explain the differences', score: 2 },
      { value: 3, label: 'I have a working understanding of most of these concepts', score: 3 },
      { value: 4, label: 'I understand them well and apply several in my portfolio', score: 4 },
      { value: 5, label: 'Expert-level — I could evaluate competing implementations of each', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'finra_2111',
    wealthTier: 'hnw',
  },
  // ── complexity: alternatives_comfort (second) ─────────────────────
  {
    questionText:
      'Would you be comfortable with 20% of your portfolio in strategies with limited transparency into underlying holdings (hedge funds, structured products)?',
    questionType: 'multiple_choice',
    category: 'alternatives_comfort',
    subcategory: 'opacity_comfort',
    options: [
      { value: 1, label: 'No — I need full transparency into every holding', score: 1 },
      { value: 2, label: 'Uncomfortable — I would limit this to under 5%', score: 2 },
      { value: 3, label: 'Acceptable if the manager has a strong track record', score: 3 },
      { value: 4, label: 'Comfortable — I evaluate managers on process and results, not holdings', score: 4 },
      { value: 5, label: 'Very comfortable — I would allocate more if risk-adjusted returns justify it', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'reg_bi',
    wealthTier: 'hnw',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// TIER 4: UHNW / Family Office ($10M+)
// Institutional-level language. References $50M+ portfolios, PE vintage
// years, hedge fund lockups and gates, crypto allocation, art/wine
// collections, capital calls, carried interest, multi-entity structures,
// GRAT/CLAT, direct deals, co-investments, secondary markets.
//
// 15 questions: 4 tolerance, 4 capacity, 4 bias, 3 complexity
// ═══════════════════════════════════════════════════════════════════════

const UHNW_BASE: BaseQuestion[] = [
  // ── tolerance: emotional_reaction ─────────────────────────────────
  {
    questionText:
      'Your family office portfolio of $50M is down 22% during a global deleveraging event. PE fund managers are calling capital, hedge fund positions have gated redemptions, and public equities are deeply underwater. How do you direct your investment committee?',
    questionType: 'scenario',
    category: 'emotional_reaction',
    subcategory: 'multi_crisis_response',
    options: [
      { value: 1, label: 'Liquidate all available public positions and pause all new commitments', score: 1 },
      { value: 2, label: 'Reduce public equity exposure significantly, meet only mandatory capital calls', score: 2 },
      { value: 3, label: 'Maintain allocation, meet capital calls from designated reserves, hold the line', score: 3 },
      { value: 4, label: 'Meet all calls, hold equities, and evaluate secondary market opportunities', score: 4 },
      { value: 5, label: 'Lean in aggressively — deploy additional capital into distressed opportunities', score: 5 },
    ],
    weight: 2.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'uhnw',
  },
  {
    questionText:
      'Your art and wine collection, valued at $8M, is marked down 30% at the next appraisal. Meanwhile, your liquid portfolio is performing well. How does this affect your overall risk posture?',
    questionType: 'scenario',
    category: 'emotional_reaction',
    subcategory: 'illiquid_asset_volatility',
    options: [
      { value: 1, label: 'Deeply unsettling — I want to reduce exposure to all volatile or subjectively valued assets', score: 1 },
      { value: 2, label: 'Concerning — I would pause further collectible acquisitions and de-risk elsewhere', score: 2 },
      { value: 3, label: 'Collectible valuations are inherently lumpy — this does not change my strategy', score: 3 },
      { value: 4, label: 'I view this as an opportunity to acquire quality pieces at better prices', score: 4 },
      { value: 5, label: 'Appraisal cycles are noise — I focus on 10+ year holding periods for collectibles', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'general',
    wealthTier: 'uhnw',
  },
  // ── tolerance: loss_scenarios ─────────────────────────────────────
  {
    questionText:
      'A PE fund in its third vintage year reports a -15% IRR due to write-downs. The GP requests a $2M capital call — their second this year. Your total PE commitment across funds is $20M. How do you proceed?',
    questionType: 'scenario',
    category: 'loss_scenarios',
    subcategory: 'pe_vintage_stress',
    options: [
      { value: 1, label: 'Explore selling the LP interest on the secondary market, even at a discount', score: 1 },
      { value: 2, label: 'Meet the call but pause all new PE fund commitments until performance improves', score: 2 },
      { value: 3, label: 'Meet the call — J-curve dynamics mean early write-downs are expected', score: 3 },
      { value: 4, label: 'Meet the call and view it as deploying capital at distressed entry points', score: 4 },
      { value: 5, label: 'Meet the call and actively seek additional PE co-investment opportunities', score: 5 },
    ],
    weight: 2.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'uhnw',
  },
  // ── tolerance: volatility_preference ──────────────────────────────
  {
    questionText:
      'For the liquid portion of your $50M+ portfolio, which risk-return profile do you target?',
    questionType: 'multiple_choice',
    category: 'volatility_preference',
    subcategory: 'institutional_allocation',
    options: [
      { value: 1, label: 'Absolute return: 4-5% with max 5% annual drawdown (treasuries, short-duration credit)', score: 1 },
      { value: 2, label: 'Conservative: 5-7% with 8-10% volatility (diversified multi-asset)', score: 2 },
      { value: 3, label: 'Balanced: 7-9% with 12-15% volatility (global equity core with alternatives overlay)', score: 3 },
      { value: 4, label: 'Growth: 9-12% with 18-22% volatility (equity-heavy with factor tilts and leverage)', score: 4 },
      { value: 5, label: 'Aggressive: 12%+ with 25%+ volatility (concentrated, leveraged, activist positions)', score: 5 },
    ],
    weight: 1.75,
    complianceTag: 'cfa_framework',
    wealthTier: 'uhnw',
  },

  // ── capacity: time_horizon ────────────────────────────────────────
  {
    questionText:
      'Your family wealth plan spans multiple generations. How do you think about investment time horizon for the core portfolio versus lifestyle reserves?',
    questionType: 'multiple_choice',
    category: 'time_horizon',
    subcategory: 'multi_generational',
    options: [
      { value: 1, label: 'Both should be conservative — preserving capital for heirs is paramount', score: 1 },
      { value: 2, label: 'Lifestyle reserves in short-duration; core portfolio on a 10-year horizon', score: 2 },
      { value: 3, label: 'Lifestyle reserves in bonds; core on a 20-year horizon with alternatives', score: 3 },
      { value: 4, label: 'Bucketed: 2-year spending needs in cash; balance on a 30+ year perpetual mandate', score: 4 },
      { value: 5, label: 'Endowment model: perpetual horizon for 90%+ of assets with illiquidity premium harvesting', score: 5 },
    ],
    weight: 1.75,
    complianceTag: 'finra_2111',
    wealthTier: 'uhnw',
  },
  // ── capacity: liquidity_needs ─────────────────────────────────────
  {
    questionText:
      'Your total portfolio is 40% illiquid (PE, real estate, private credit, collectibles). A unique direct deal requires a $5M commitment with a 10-year horizon, bringing illiquidity to 48%. How do you evaluate this?',
    questionType: 'scenario',
    category: 'liquidity_needs',
    subcategory: 'illiquidity_threshold',
    options: [
      { value: 1, label: 'Decline — 40% illiquid is already at my ceiling', score: 1 },
      { value: 2, label: 'Decline — but I would consider it if I could reduce other illiquid positions first', score: 2 },
      { value: 3, label: 'Evaluate carefully — model the impact on liquidity under various stress scenarios', score: 3 },
      { value: 4, label: 'Likely proceed — 48% illiquid is acceptable given my overall asset base', score: 4 },
      { value: 5, label: 'Proceed without hesitation — illiquidity premium is a core return driver', score: 5 },
    ],
    weight: 1.75,
    complianceTag: 'reg_bi',
    wealthTier: 'uhnw',
  },
  // ── capacity: financial_cushion ───────────────────────────────────
  {
    questionText:
      'If all illiquid investments (PE, private credit, real estate) hit their downside scenario (-30%) and public markets were also down 35%, how would this impact your family financial plan?',
    questionType: 'scenario',
    category: 'financial_cushion',
    subcategory: 'correlated_drawdown',
    options: [
      { value: 1, label: 'Catastrophic — it would jeopardize core financial security', score: 1 },
      { value: 2, label: 'Serious — we would need to significantly restructure spending and plans', score: 2 },
      { value: 3, label: 'Painful but manageable — we have reserves to weather a multi-year recovery', score: 3 },
      { value: 4, label: 'Uncomfortable but not threatening — our plan survives extreme scenarios', score: 4 },
      { value: 5, label: 'A setback, but total wealth and income are resilient enough to invest opportunistically', score: 5 },
    ],
    weight: 2.0,
    complianceTag: 'finra_2111',
    wealthTier: 'uhnw',
  },
  // ── capacity: financial_cushion (second) ──────────────────────────
  {
    questionText:
      'How many years of family lifestyle expenses could be sustained solely from liquid assets and reliable income streams, without selling any illiquid positions?',
    questionType: 'multiple_choice',
    category: 'financial_cushion',
    subcategory: 'liquidity_runway',
    options: [
      { value: 1, label: 'Less than 2 years', score: 1 },
      { value: 2, label: '2 to 5 years', score: 2 },
      { value: 3, label: '5 to 10 years', score: 3 },
      { value: 4, label: '10 to 20 years', score: 4 },
      { value: 5, label: '20+ years — our lifestyle is well within liquid capacity', score: 5 },
    ],
    weight: 1.5,
    complianceTag: 'reg_bi',
    wealthTier: 'uhnw',
  },

  // ── bias: behavioral_bias / framing ───────────────────────────────
  {
    questionText:
      'Your wealth advisor presents the same portfolio two ways: "This portfolio has historically preserved 85% of its value in the worst 1% of environments" versus "This portfolio has a 1% probability of losing 15% or more." Which framing influences your comfort more?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'framing_effect',
    options: [
      { value: 1, label: 'The preservation framing makes me much more comfortable', score: 1 },
      { value: 2, label: 'I lean toward the preservation framing but realize they are equivalent', score: 2 },
      { value: 3, label: 'I immediately recognize they are identical and evaluate on underlying metrics', score: 3 },
      { value: 4, label: 'I lean toward the probability framing — I want to understand tail risks precisely', score: 4 },
      { value: 5, label: 'Neither framing matters — I evaluate on expected return, vol, Sharpe, and max drawdown', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'uhnw',
    biasDetection: 'framing',
  },
  // ── bias: behavioral_bias / recency ───────────────────────────────
  {
    questionText:
      'Crypto assets have returned 150% over the past 18 months. Several peers at your family office network have allocated 5-10% to digital assets. How does this influence your allocation decision?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'recency_bias',
    options: [
      { value: 1, label: 'I want to allocate 10%+ immediately — institutional adoption is playing out', score: 1 },
      { value: 2, label: 'I am more inclined to start a position — recent returns validate the asset class', score: 2 },
      { value: 3, label: 'Recent returns do not change my prior assessment — I evaluate on fundamentals', score: 3 },
      { value: 4, label: 'I am more cautious after a 150% run — valuations may be stretched', score: 4 },
      { value: 5, label: 'Short-term performance and peer behavior are irrelevant to my systematic framework', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'uhnw',
    biasDetection: 'recency',
  },
  // ── bias: behavioral_bias / loss_aversion ─────────────────────────
  {
    questionText:
      'A direct real estate investment you personally championed is down $3M from the original $10M investment. Your advisor recommends selling and redeploying into a diversified real estate fund. How do you respond?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'loss_aversion',
    options: [
      { value: 1, label: 'I will not sell — I vetted this deal personally and it will come back', score: 1 },
      { value: 2, label: 'I want to hold until I at least recoup the original investment', score: 2 },
      { value: 3, label: 'Emotionally hard, but I understand the sunk cost argument', score: 3 },
      { value: 4, label: 'I would sell — forward-looking risk-adjusted returns matter more than my cost basis', score: 4 },
      { value: 5, label: 'Sell immediately — personal attachment to a deal is exactly the bias that destroys wealth', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'cfa_framework',
    wealthTier: 'uhnw',
    biasDetection: 'loss_aversion',
  },
  // ── bias: behavioral_bias / overconfidence ────────────────────────
  {
    questionText:
      'You made a successful direct investment that returned 5x in 4 years. How does this single outcome affect your view of your deal evaluation ability versus diversified fund structures?',
    questionType: 'scenario',
    category: 'behavioral_bias',
    subcategory: 'overconfidence',
    options: [
      { value: 1, label: 'It confirms I have excellent deal-sourcing ability — I want more direct deals', score: 1 },
      { value: 2, label: 'It gives me more confidence for similar opportunities', score: 2 },
      { value: 3, label: 'One outcome is not statistically meaningful — I maintain a balanced view', score: 3 },
      { value: 4, label: 'I recognize survivorship bias — my failures are less memorable than wins', score: 4 },
      { value: 5, label: 'A single 5x could easily be luck — I evaluate my full track record with proper benchmarks', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'cfa_framework',
    wealthTier: 'uhnw',
    biasDetection: 'overconfidence',
  },

  // ── complexity: alternatives_comfort ──────────────────────────────
  {
    questionText:
      'Your family office is evaluating a multi-strategy hedge fund: $5M minimum, 2-year hard lock-up, quarterly soft lock with 5% gate, 2/20 fees, levered 3x gross. How comfortable are you with this profile?',
    questionType: 'scenario',
    category: 'alternatives_comfort',
    subcategory: 'hedge_fund_complexity',
    options: [
      { value: 1, label: 'Not comfortable — the fees, leverage, and lock-up terms are unacceptable', score: 1 },
      { value: 2, label: 'Very cautious — I would need significant alpha generation to justify these terms', score: 2 },
      { value: 3, label: 'Moderately comfortable — standard terms for quality multi-strat if due diligence checks out', score: 3 },
      { value: 4, label: 'Comfortable — I focus on team, process, and risk management over headline terms', score: 4 },
      { value: 5, label: 'Very comfortable — I have extensive hedge fund experience and can evaluate terms and operational risk', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'reg_bi',
    wealthTier: 'uhnw',
  },
  // ── complexity: knowledge ─────────────────────────────────────────
  {
    questionText:
      'How well do you understand: GRAT/CLAT structures, carried interest taxation, PE secondaries pricing, total portfolio risk decomposition, and cryptocurrency custody risks?',
    questionType: 'scale',
    category: 'knowledge',
    subcategory: 'institutional_concepts',
    options: [
      { value: 1, label: 'I am unfamiliar with most of these concepts', score: 1 },
      { value: 2, label: 'I know some of these at a high level', score: 2 },
      { value: 3, label: 'Working understanding of most — enough to discuss with advisors', score: 3 },
      { value: 4, label: 'I understand all of these well and have experience with several', score: 4 },
      { value: 5, label: 'Expert-level across all — I can evaluate competing approaches and structures', score: 5 },
    ],
    weight: 1.0,
    complianceTag: 'finra_2111',
    wealthTier: 'uhnw',
  },
  // ── complexity: alternatives_comfort (second) ─────────────────────
  {
    questionText:
      'Your advisor proposes 5% in a tokenized private credit fund using blockchain settlement, daily NAV but quarterly redemptions, targeting emerging market infrastructure debt. How do you evaluate this?',
    questionType: 'scenario',
    category: 'alternatives_comfort',
    subcategory: 'frontier_complexity',
    options: [
      { value: 1, label: 'Too many novel risks — blockchain, EM debt, and illiquidity combined is excessive', score: 1 },
      { value: 2, label: 'Intriguing but I need a multi-year track record before committing', score: 2 },
      { value: 3, label: 'Open to it — I would evaluate credit quality, tokenization, and redemption terms independently', score: 3 },
      { value: 4, label: 'Interested — I am comfortable with each component and see the efficiency gains', score: 4 },
      { value: 5, label: 'Enthusiastic — this represents the future of alternative asset access', score: 5 },
    ],
    weight: 1.25,
    complianceTag: 'reg_bi',
    wealthTier: 'uhnw',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Assemble all 60 bases and build the ~212-question bank
// ═══════════════════════════════════════════════════════════════════════

const ALL_BASES: BaseQuestion[] = [
  ...EMERGING_BASE,
  ...MASS_AFFLUENT_BASE,
  ...HNW_BASE,
  ...UHNW_BASE,
];

export const QUESTION_BANK: RiskQuestion[] = buildFullBank(ALL_BASES);
