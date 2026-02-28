// Risk Profile Question Bank — 395 questions across 7 categories
// Uses a builder pattern to generate variations efficiently

import type {
  RiskQuestion,
  QuestionOption,
  QuestionType,
  Category,
  RiskDimension,
  WealthTier,
  ComplianceTag,
} from './types';
import { DIMENSION_FOR_CATEGORY } from './types';

// ── Helpers ──────────────────────────────────────────────────────────

interface QuestionTemplate {
  stem: string;
  type: QuestionType;
  subcategory: string;
  options: QuestionOption[];
}

const WEALTH_TIERS: WealthTier[] = ['hnw', 'vhnw', 'uhnw'];
const COMPLIANCE_TAGS: ComplianceTag[] = ['finra', 'finra', 'finra', 'cfp', 'general'];

function buildCategory(
  category: Category,
  startId: number,
  targetCount: number,
  templates: QuestionTemplate[],
): RiskQuestion[] {
  const dimension = DIMENSION_FOR_CATEGORY[category];
  const questions: RiskQuestion[] = [];

  for (let i = 0; i < targetCount; i++) {
    const t = templates[i % templates.length];
    const variationIndex = Math.floor(i / templates.length);
    const wealthTier = WEALTH_TIERS[i % 3];
    const complianceTag = COMPLIANCE_TAGS[i % COMPLIANCE_TAGS.length];
    const weight = 1.0 + (i % 5) * 0.25; // 1.0, 1.25, 1.5, 1.75, 2.0

    // Modify stem slightly for variation rounds
    let questionText = t.stem;
    if (variationIndex === 1) {
      questionText = questionText.replace('you', 'your household');
    } else if (variationIndex === 2) {
      questionText = questionText.replace('your', "your family's");
    } else if (variationIndex === 3) {
      questionText = 'Considering your overall financial picture, ' + questionText.charAt(0).toLowerCase() + questionText.slice(1);
    } else if (variationIndex === 4) {
      questionText = 'From a long-term perspective, ' + questionText.charAt(0).toLowerCase() + questionText.slice(1);
    } else if (variationIndex === 5) {
      questionText = 'Thinking about your wealth goals, ' + questionText.charAt(0).toLowerCase() + questionText.slice(1);
    } else if (variationIndex === 6) {
      questionText = 'As you plan for the future, ' + questionText.charAt(0).toLowerCase() + questionText.slice(1);
    } else if (variationIndex >= 7) {
      questionText = `In the context of ${t.subcategory.replace(/_/g, ' ')}, ${questionText.charAt(0).toLowerCase()}${questionText.slice(1)}`;
    }

    questions.push({
      id: startId + i,
      questionText,
      questionType: t.type,
      category,
      subcategory: t.subcategory,
      options: t.options,
      riskDimension: dimension,
      weight: Math.round(weight * 100) / 100,
      complianceTag,
      wealthTier,
    });
  }

  return questions;
}

// ── Standard option sets ─────────────────────────────────────────────

const OPT_TIME_GENERAL: QuestionOption[] = [
  { value: 1, label: 'Less than 1 year', score: 1 },
  { value: 2, label: '1–3 years', score: 2 },
  { value: 3, label: '3–5 years', score: 3 },
  { value: 4, label: '5–10 years', score: 4 },
  { value: 5, label: 'More than 10 years', score: 5 },
];

const OPT_AGREE_5: QuestionOption[] = [
  { value: 1, label: 'Strongly disagree', score: 1 },
  { value: 2, label: 'Disagree', score: 2 },
  { value: 3, label: 'Neutral', score: 3 },
  { value: 4, label: 'Agree', score: 4 },
  { value: 5, label: 'Strongly agree', score: 5 },
];

const OPT_AGREE_5_INV: QuestionOption[] = [
  { value: 1, label: 'Strongly agree', score: 1 },
  { value: 2, label: 'Agree', score: 2 },
  { value: 3, label: 'Neutral', score: 3 },
  { value: 4, label: 'Disagree', score: 4 },
  { value: 5, label: 'Strongly disagree', score: 5 },
];

const OPT_FREQUENCY: QuestionOption[] = [
  { value: 1, label: 'Multiple times daily', score: 1 },
  { value: 2, label: 'Daily', score: 2 },
  { value: 3, label: 'Weekly', score: 3 },
  { value: 4, label: 'Monthly', score: 4 },
  { value: 5, label: 'Quarterly or less', score: 5 },
];

const OPT_KNOWLEDGE: QuestionOption[] = [
  { value: 1, label: 'No knowledge', score: 1 },
  { value: 2, label: 'Basic understanding', score: 2 },
  { value: 3, label: 'Intermediate', score: 3 },
  { value: 4, label: 'Advanced', score: 4 },
  { value: 5, label: 'Expert / Professional', score: 5 },
];

const OPT_LOSS_REACT: QuestionOption[] = [
  { value: 1, label: 'Sell everything immediately to stop losses', score: 1 },
  { value: 2, label: 'Sell a portion to reduce exposure', score: 2 },
  { value: 3, label: 'Hold and wait for recovery', score: 3 },
  { value: 4, label: 'Hold and look for opportunities', score: 4 },
  { value: 5, label: 'Buy more at lower prices', score: 5 },
];

const OPT_MAX_LOSS: QuestionOption[] = [
  { value: 1, label: 'Any loss is unacceptable', score: 1 },
  { value: 2, label: 'Up to 5% in a year', score: 2 },
  { value: 3, label: 'Up to 15% in a year', score: 3 },
  { value: 4, label: 'Up to 30% in a year', score: 4 },
  { value: 5, label: 'Over 30% if long-term gains are expected', score: 5 },
];

const OPT_RETURN_PREF: QuestionOption[] = [
  { value: 1, label: '2% return with almost no volatility', score: 1 },
  { value: 2, label: '4% return with low volatility', score: 2 },
  { value: 3, label: '7% return with moderate volatility', score: 3 },
  { value: 4, label: '10% return with significant volatility', score: 4 },
  { value: 5, label: '14%+ return with very high volatility', score: 5 },
];

const OPT_GOAL_PRIMARY: QuestionOption[] = [
  { value: 1, label: 'Preserve capital at all costs', score: 1 },
  { value: 2, label: 'Generate steady income', score: 2 },
  { value: 3, label: 'Balanced growth and income', score: 3 },
  { value: 4, label: 'Long-term capital appreciation', score: 4 },
  { value: 5, label: 'Maximum growth regardless of risk', score: 5 },
];

const OPT_LIKELIHOOD: QuestionOption[] = [
  { value: 1, label: 'Very unlikely', score: 1 },
  { value: 2, label: 'Unlikely', score: 2 },
  { value: 3, label: 'Possible', score: 3 },
  { value: 4, label: 'Likely', score: 4 },
  { value: 5, label: 'Very likely', score: 5 },
];

const OPT_PCT_NET_WORTH: QuestionOption[] = [
  { value: 1, label: 'Less than 10%', score: 1 },
  { value: 2, label: '10–25%', score: 2 },
  { value: 3, label: '25–50%', score: 3 },
  { value: 4, label: '50–75%', score: 4 },
  { value: 5, label: 'More than 75%', score: 5 },
];

// ── Category Templates ───────────────────────────────────────────────

const TIME_HORIZON_TEMPLATES: QuestionTemplate[] = [
  { stem: 'What is your primary investment time horizon?', type: 'multiple_choice', subcategory: 'general', options: OPT_TIME_GENERAL },
  { stem: 'When do you expect to begin drawing on your invested assets?', type: 'multiple_choice', subcategory: 'withdrawal', options: OPT_TIME_GENERAL },
  { stem: 'How many years until you plan to retire or transition out of active work?', type: 'multiple_choice', subcategory: 'retirement', options: [
    { value: 1, label: 'Already retired', score: 2 },
    { value: 2, label: 'Within 5 years', score: 2 },
    { value: 3, label: '5–10 years', score: 3 },
    { value: 4, label: '10–20 years', score: 4 },
    { value: 5, label: 'More than 20 years', score: 5 },
  ] },
  { stem: 'How long do you expect to hold this portfolio before needing significant withdrawals?', type: 'multiple_choice', subcategory: 'general', options: OPT_TIME_GENERAL },
  { stem: 'Do you anticipate needing to liquidate a major portion of your portfolio in the next 3 years?', type: 'multiple_choice', subcategory: 'withdrawal', options: OPT_AGREE_5_INV },
  { stem: 'How frequently do you expect to turn over positions in your portfolio?', type: 'multiple_choice', subcategory: 'turnover', options: [
    { value: 1, label: 'Very frequently (monthly)', score: 1 },
    { value: 2, label: 'Frequently (quarterly)', score: 2 },
    { value: 3, label: 'Occasionally (annually)', score: 3 },
    { value: 4, label: 'Rarely (every few years)', score: 4 },
    { value: 5, label: 'Buy and hold indefinitely', score: 5 },
  ] },
  { stem: 'Is your investment timeline tied to a specific goal like education or a real estate purchase?', type: 'multiple_choice', subcategory: 'goal_specific', options: [
    { value: 1, label: 'Yes, within 1 year', score: 1 },
    { value: 2, label: 'Yes, within 3 years', score: 2 },
    { value: 3, label: 'Yes, within 5–10 years', score: 3 },
    { value: 4, label: 'No specific timeline', score: 4 },
    { value: 5, label: 'This is multi-generational wealth', score: 5 },
  ] },
  { stem: 'Are you comfortable with investments that may take 10+ years to reach full potential?', type: 'multiple_choice', subcategory: 'general', options: OPT_AGREE_5 },
  { stem: 'Would you invest in a private fund with a 7-year lock-up period if expected returns were higher?', type: 'scenario', subcategory: 'goal_specific', options: OPT_AGREE_5 },
  { stem: 'How important is it that your portfolio can be fully liquidated within 30 days?', type: 'multiple_choice', subcategory: 'withdrawal', options: OPT_AGREE_5_INV },
];

const LOSS_TOLERANCE_TEMPLATES: QuestionTemplate[] = [
  { stem: 'If your portfolio lost 20% of its value in a single month, what would you do?', type: 'scenario', subcategory: 'drawdown', options: OPT_LOSS_REACT },
  { stem: 'What is the maximum percentage decline you could tolerate in a single year?', type: 'multiple_choice', subcategory: 'drawdown', options: OPT_MAX_LOSS },
  { stem: 'How would you feel if your portfolio dropped 25% during a market correction?', type: 'scenario', subcategory: 'emotional', options: [
    { value: 1, label: 'Extremely anxious — I would lose sleep', score: 1 },
    { value: 2, label: 'Very concerned — I would want to make changes', score: 2 },
    { value: 3, label: 'Uncomfortable but I would hold steady', score: 3 },
    { value: 4, label: 'Somewhat concerned but confident in recovery', score: 4 },
    { value: 5, label: 'Not worried — market corrections are normal', score: 5 },
  ] },
  { stem: 'During the 2008 financial crisis, markets fell roughly 50%. How would you have reacted?', type: 'scenario', subcategory: 'historical', options: OPT_LOSS_REACT },
  { stem: 'Would you accept a higher probability of short-term losses for potentially greater long-term gains?', type: 'multiple_choice', subcategory: 'tradeoff', options: OPT_AGREE_5 },
  { stem: 'If a trusted advisor recommended staying invested during a 30% decline, could you follow that advice?', type: 'scenario', subcategory: 'stress', options: OPT_AGREE_5 },
  { stem: 'How long could you tolerate your portfolio being underwater before wanting to make changes?', type: 'multiple_choice', subcategory: 'recovery', options: [
    { value: 1, label: 'Less than 1 month', score: 1 },
    { value: 2, label: '1–3 months', score: 2 },
    { value: 3, label: '3–12 months', score: 3 },
    { value: 4, label: '1–3 years', score: 4 },
    { value: 5, label: 'As long as needed — I trust the process', score: 5 },
  ] },
  { stem: 'Have you ever panic-sold investments during a market downturn?', type: 'multiple_choice', subcategory: 'emotional', options: [
    { value: 1, label: 'Yes, multiple times', score: 1 },
    { value: 2, label: 'Yes, once', score: 2 },
    { value: 3, label: 'No, but I strongly considered it', score: 3 },
    { value: 4, label: 'No, I remained calm', score: 4 },
    { value: 5, label: 'No — I actually bought more during downturns', score: 5 },
  ] },
  { stem: 'Which return/risk tradeoff would you prefer for your portfolio?', type: 'multiple_choice', subcategory: 'tradeoff', options: OPT_RETURN_PREF },
  { stem: 'If your portfolio lost 10% in value, how quickly would you expect it to recover before feeling anxious?', type: 'multiple_choice', subcategory: 'recovery', options: [
    { value: 1, label: 'Within 1 month', score: 1 },
    { value: 2, label: 'Within 3 months', score: 2 },
    { value: 3, label: 'Within 6 months', score: 3 },
    { value: 4, label: 'Within 1–2 years', score: 4 },
    { value: 5, label: 'I can wait as long as necessary', score: 5 },
  ] },
  { stem: 'Would you remain invested if your portfolio declined 40% and media predicted further declines?', type: 'scenario', subcategory: 'stress', options: OPT_AGREE_5 },
  { stem: 'How do you typically react when you see negative headlines about the stock market?', type: 'multiple_choice', subcategory: 'emotional', options: [
    { value: 1, label: 'Immediately review and consider selling', score: 1 },
    { value: 2, label: 'Feel anxious and monitor closely', score: 2 },
    { value: 3, label: 'Read the news but take no action', score: 3 },
    { value: 4, label: 'Generally ignore short-term noise', score: 4 },
    { value: 5, label: 'See it as a potential buying opportunity', score: 5 },
  ] },
  { stem: 'A concentrated stock position drops 35%. Would you double down, hold, or trim the position?', type: 'scenario', subcategory: 'drawdown', options: [
    { value: 1, label: 'Sell the entire position', score: 1 },
    { value: 2, label: 'Sell most of it', score: 2 },
    { value: 3, label: 'Hold the current position', score: 3 },
    { value: 4, label: 'Add a small amount', score: 4 },
    { value: 5, label: 'Significantly increase the position', score: 5 },
  ] },
];

const VOLATILITY_TEMPLATES: QuestionTemplate[] = [
  { stem: 'How often do you check your investment portfolio performance?', type: 'multiple_choice', subcategory: 'monitoring', options: OPT_FREQUENCY },
  { stem: 'Which scenario would you prefer: a stable 4% annual return, or a volatile portfolio averaging 10%?', type: 'scenario', subcategory: 'preference', options: [
    { value: 1, label: 'Strongly prefer the stable 4%', score: 1 },
    { value: 2, label: 'Lean toward 4% stable', score: 2 },
    { value: 3, label: 'Either would be fine', score: 3 },
    { value: 4, label: 'Lean toward volatile 10%', score: 4 },
    { value: 5, label: 'Strongly prefer the volatile 10%', score: 5 },
  ] },
  { stem: 'How comfortable are you seeing daily fluctuations of 2-3% in your portfolio value?', type: 'multiple_choice', subcategory: 'emotional', options: OPT_AGREE_5 },
  { stem: 'Would you prefer an investment that never loses money but returns only inflation, or one that could double but could also halve?', type: 'scenario', subcategory: 'preference', options: [
    { value: 1, label: 'Inflation-matching with certainty', score: 1 },
    { value: 2, label: 'Slight upside with minimal risk', score: 2 },
    { value: 3, label: 'Moderate upside with moderate risk', score: 3 },
    { value: 4, label: 'Significant upside with notable risk', score: 4 },
    { value: 5, label: 'Double-or-halve opportunity', score: 5 },
  ] },
  { stem: 'Do you find market volatility stressful even when you understand it is normal?', type: 'multiple_choice', subcategory: 'emotional', options: OPT_AGREE_5_INV },
  { stem: 'If your portfolio gained 15% one quarter and lost 10% the next, would you be satisfied with the net 5% gain?', type: 'scenario', subcategory: 'stability', options: OPT_AGREE_5 },
  { stem: 'Would you prefer a smoother return stream even if it means lower total returns over time?', type: 'multiple_choice', subcategory: 'stability', options: OPT_AGREE_5_INV },
  { stem: 'How do you react when your portfolio has a particularly good day with gains over 3%?', type: 'multiple_choice', subcategory: 'emotional', options: [
    { value: 1, label: 'Consider selling to lock in gains', score: 1 },
    { value: 2, label: 'Feel relieved and hope it continues', score: 2 },
    { value: 3, label: 'Pleased but not surprised', score: 3 },
    { value: 4, label: 'Barely notice — I focus on long-term', score: 4 },
    { value: 5, label: 'Wish I had invested even more', score: 5 },
  ] },
  { stem: 'How important is predictability of returns to your peace of mind?', type: 'multiple_choice', subcategory: 'stability', options: OPT_AGREE_5_INV },
  { stem: 'Would you be comfortable with an investment whose monthly returns ranged from -8% to +12%?', type: 'scenario', subcategory: 'preference', options: OPT_AGREE_5 },
];

const KNOWLEDGE_TEMPLATES: QuestionTemplate[] = [
  { stem: 'How would you rate your overall investment knowledge?', type: 'scale', subcategory: 'self_assessed', options: OPT_KNOWLEDGE },
  { stem: 'How many years of active investing experience do you have?', type: 'multiple_choice', subcategory: 'years', options: [
    { value: 1, label: 'None — this is new to me', score: 1 },
    { value: 2, label: '1–3 years', score: 2 },
    { value: 3, label: '3–10 years', score: 3 },
    { value: 4, label: '10–20 years', score: 4 },
    { value: 5, label: 'More than 20 years', score: 5 },
  ] },
  { stem: 'Which investment products have you personally invested in?', type: 'multiple_choice', subcategory: 'product_experience', options: [
    { value: 1, label: 'Savings accounts or CDs only', score: 1 },
    { value: 2, label: 'Mutual funds or ETFs', score: 2 },
    { value: 3, label: 'Individual stocks and bonds', score: 3 },
    { value: 4, label: 'Options, futures, or alternatives', score: 4 },
    { value: 5, label: 'All of the above plus private placements', score: 5 },
  ] },
  { stem: 'Do you understand the relationship between risk and expected return?', type: 'scale', subcategory: 'technical', options: OPT_KNOWLEDGE },
  { stem: 'How familiar are you with portfolio diversification concepts?', type: 'scale', subcategory: 'technical', options: OPT_KNOWLEDGE },
  { stem: 'Can you explain the difference between alpha and beta in portfolio management?', type: 'scale', subcategory: 'technical', options: OPT_KNOWLEDGE },
  { stem: 'How comfortable are you reading financial statements and annual reports?', type: 'scale', subcategory: 'self_assessed', options: OPT_KNOWLEDGE },
  { stem: 'Do you understand how options and derivatives work?', type: 'scale', subcategory: 'product_experience', options: OPT_KNOWLEDGE },
];

const GOALS_TEMPLATES: QuestionTemplate[] = [
  { stem: 'What is your primary financial goal for this portfolio?', type: 'multiple_choice', subcategory: 'growth', options: OPT_GOAL_PRIMARY },
  { stem: 'How important is it that your portfolio keeps pace with or beats inflation?', type: 'multiple_choice', subcategory: 'inflation', options: OPT_AGREE_5 },
  { stem: 'Do you plan to leave a significant financial legacy for heirs or charity?', type: 'multiple_choice', subcategory: 'legacy', options: OPT_AGREE_5 },
  { stem: 'How much do you rely on your investment portfolio for current income needs?', type: 'multiple_choice', subcategory: 'income', options: [
    { value: 1, label: 'Entirely — it is my primary income source', score: 1 },
    { value: 2, label: 'Significantly — it supplements my income', score: 2 },
    { value: 3, label: 'Moderately — some income comes from investments', score: 3 },
    { value: 4, label: 'Minimally — I have other income sources', score: 4 },
    { value: 5, label: 'Not at all — I reinvest all returns', score: 5 },
  ] },
  { stem: 'Is capital preservation more important to you than capital appreciation?', type: 'multiple_choice', subcategory: 'preservation', options: OPT_AGREE_5_INV },
  { stem: 'Are you willing to accept below-market returns in exchange for social or environmental impact?', type: 'multiple_choice', subcategory: 'growth', options: [
    { value: 1, label: 'Yes, impact is my top priority', score: 1 },
    { value: 2, label: 'Yes, I would accept somewhat lower returns', score: 2 },
    { value: 3, label: 'I want impact without sacrificing returns', score: 3 },
    { value: 4, label: 'Returns come first, impact is secondary', score: 4 },
    { value: 5, label: 'I focus entirely on returns', score: 5 },
  ] },
  { stem: 'How important is generating regular cash distributions from your investments?', type: 'multiple_choice', subcategory: 'income', options: OPT_AGREE_5_INV },
  { stem: 'Would you sacrifice current yield for higher expected total return over 10 years?', type: 'scenario', subcategory: 'growth', options: OPT_AGREE_5 },
];

const BEHAVIOR_TEMPLATES: QuestionTemplate[] = [
  { stem: 'When investments perform well, do you tend to sell quickly to lock in gains?', type: 'multiple_choice', subcategory: 'disposition', options: OPT_AGREE_5_INV },
  { stem: 'Do recent market events influence your investment decisions more than long-term data?', type: 'multiple_choice', subcategory: 'recency', options: OPT_AGREE_5_INV },
  { stem: 'Do you tend to follow what other successful investors are doing?', type: 'multiple_choice', subcategory: 'herd', options: OPT_AGREE_5_INV },
  { stem: 'How do you typically make investment decisions?', type: 'multiple_choice', subcategory: 'decision', options: [
    { value: 1, label: 'Based on gut feeling or emotions', score: 1 },
    { value: 2, label: 'Based on advice from friends/family', score: 2 },
    { value: 3, label: 'Based on media and news', score: 3 },
    { value: 4, label: 'Based on advisor recommendations', score: 4 },
    { value: 5, label: 'Based on thorough research and data', score: 5 },
  ] },
  { stem: 'Can you commit to a long-term investment strategy without making changes due to short-term events?', type: 'multiple_choice', subcategory: 'discipline', options: OPT_AGREE_5 },
  { stem: 'After a market decline, are you more likely to reduce or increase your equity exposure?', type: 'scenario', subcategory: 'recency', options: [
    { value: 1, label: 'Significantly reduce exposure', score: 1 },
    { value: 2, label: 'Slightly reduce exposure', score: 2 },
    { value: 3, label: 'Maintain current allocation', score: 3 },
    { value: 4, label: 'Slightly increase exposure', score: 4 },
    { value: 5, label: 'Significantly increase exposure', score: 5 },
  ] },
  { stem: 'Do you often regret investment decisions after making them?', type: 'multiple_choice', subcategory: 'disposition', options: OPT_AGREE_5_INV },
  { stem: 'Would you change your investment strategy based on a single bad quarter?', type: 'scenario', subcategory: 'discipline', options: OPT_AGREE_5_INV },
  { stem: 'How influenced are you by financial media when making portfolio decisions?', type: 'multiple_choice', subcategory: 'herd', options: OPT_AGREE_5_INV },
  { stem: 'Do you tend to hold losing investments too long hoping they will recover?', type: 'multiple_choice', subcategory: 'disposition', options: OPT_AGREE_5_INV },
];

const LIQUIDITY_TEMPLATES: QuestionTemplate[] = [
  { stem: 'Do you have an adequate emergency fund outside of this investment portfolio?', type: 'multiple_choice', subcategory: 'emergency', options: OPT_AGREE_5 },
  { stem: 'How soon might you need to withdraw a large sum (>20% of portfolio)?', type: 'multiple_choice', subcategory: 'withdrawal', options: [
    { value: 1, label: 'Within the next 6 months', score: 1 },
    { value: 2, label: 'Within 1 year', score: 2 },
    { value: 3, label: 'Within 1–3 years', score: 3 },
    { value: 4, label: 'Within 3–5 years', score: 4 },
    { value: 5, label: 'No foreseeable need', score: 5 },
  ] },
  { stem: 'What percentage of your total net worth is represented by this investment portfolio?', type: 'multiple_choice', subcategory: 'net_worth', options: OPT_PCT_NET_WORTH },
  { stem: 'Do you have significant concentrated stock positions (>20% of portfolio in one name)?', type: 'multiple_choice', subcategory: 'concentration', options: OPT_AGREE_5_INV },
  { stem: 'How comfortable are you with illiquid investments like private equity or real estate funds?', type: 'multiple_choice', subcategory: 'concentration', options: OPT_AGREE_5 },
  { stem: 'Do you have other reliable sources of income beyond this portfolio?', type: 'multiple_choice', subcategory: 'emergency', options: OPT_AGREE_5 },
  { stem: 'Would a 6-month liquidity lock on your investments cause financial difficulty?', type: 'scenario', subcategory: 'withdrawal', options: OPT_AGREE_5_INV },
];

// ── Build the full bank ──────────────────────────────────────────────

export const QUESTION_BANK: RiskQuestion[] = [
  ...buildCategory('time_horizon', 1, 70, TIME_HORIZON_TEMPLATES),
  ...buildCategory('loss_tolerance', 71, 100, LOSS_TOLERANCE_TEMPLATES),
  ...buildCategory('volatility', 171, 60, VOLATILITY_TEMPLATES),
  ...buildCategory('knowledge', 231, 40, KNOWLEDGE_TEMPLATES),
  ...buildCategory('goals', 271, 40, GOALS_TEMPLATES),
  ...buildCategory('behavior', 311, 50, BEHAVIOR_TEMPLATES),
  ...buildCategory('liquidity', 361, 35, LIQUIDITY_TEMPLATES),
];
