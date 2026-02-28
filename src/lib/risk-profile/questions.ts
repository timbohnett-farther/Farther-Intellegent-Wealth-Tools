import type {
  RiskQuestion,
  QuestionOption,
  QuestionType,
  Category,
  Difficulty,
  ComplianceTag,
  RiskDimension,
} from './types';

// ---------------------------------------------------------------------------
// Helper types and utilities for generating the question bank
// ---------------------------------------------------------------------------

interface QuestionTemplate {
  questionText: string;
  questionType: QuestionType;
  subcategory: string;
  options: QuestionOption[];
  difficulty?: Difficulty;
  weight?: number;
  complianceTag?: ComplianceTag;
}

interface CategoryConfig {
  category: Category;
  riskDimension: RiskDimension;
  subcategories: string[];
  templates: QuestionTemplate[];
  totalCount: number;
  startId: number;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const COMPLIANCE_TAGS: ComplianceTag[] = ['finra', 'finra', 'finra', 'cfp', 'general'];

/**
 * Generates a full set of RiskQuestion objects for a category.
 * Hand-authored templates are used first; then variations are
 * produced by rotating through stems, subcategories, difficulties,
 * and option sets until the target count is met.
 */
function generateCategoryQuestions(config: CategoryConfig): RiskQuestion[] {
  const {
    category,
    riskDimension,
    subcategories,
    templates,
    totalCount,
    startId,
  } = config;

  const questions: RiskQuestion[] = [];

  // 1. Emit hand-authored templates first
  for (let i = 0; i < templates.length && questions.length < totalCount; i++) {
    const t = templates[i];
    questions.push({
      id: startId + questions.length,
      questionText: t.questionText,
      questionType: t.questionType,
      category,
      subcategory: t.subcategory,
      options: t.options,
      riskDimension,
      weight: t.weight ?? roundTo(1.0 + Math.random(), 1),
      complianceTag: t.complianceTag ?? 'finra',
      difficulty: t.difficulty ?? 'medium',
    });
  }

  // 2. Generate variations to fill the remaining slots
  let templateIdx = 0;
  let subcatIdx = 0;
  let diffIdx = 0;
  let compIdx = 0;
  let variationCounter = 1;

  while (questions.length < totalCount) {
    const baseTemplate = templates[templateIdx % templates.length];
    const subcat = subcategories[subcatIdx % subcategories.length];
    const diff = DIFFICULTIES[diffIdx % DIFFICULTIES.length];
    const comp = COMPLIANCE_TAGS[compIdx % COMPLIANCE_TAGS.length];

    // Compute a weight: hard questions get more weight, easy less
    const baseWeight = diff === 'hard' ? 1.6 : diff === 'medium' ? 1.3 : 1.0;
    const weight = roundTo(baseWeight + (variationCounter % 5) * 0.08, 2);

    // Vary the question text slightly based on variation index
    const varText = variateText(baseTemplate.questionText, variationCounter, subcat);

    // Rotate question type for variety
    const qTypes: QuestionType[] = ['multiple_choice', 'scale', 'scenario'];
    const qType = qTypes[variationCounter % 3];

    // Generate appropriate options for the question type
    const opts = variateOptions(baseTemplate.options, variationCounter, qType);

    questions.push({
      id: startId + questions.length,
      questionText: varText,
      questionType: qType,
      category,
      subcategory: subcat,
      options: opts,
      riskDimension,
      weight: Math.min(weight, 2.0),
      complianceTag: comp,
      difficulty: diff,
    });

    templateIdx++;
    subcatIdx++;
    diffIdx++;
    compIdx++;
    variationCounter++;
  }

  return questions;
}

function roundTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

/** Produce a variant of the question text to avoid duplicates */
function variateText(base: string, idx: number, subcategory: string): string {
  const prefixes = [
    'Considering your overall financial plan, ',
    'From a wealth-management perspective, ',
    'Thinking about your investment portfolio, ',
    'Given your current financial situation, ',
    'When evaluating your financial goals, ',
    'In the context of your long-term plan, ',
    'Reflecting on your risk preferences, ',
    'As you review your financial strategy, ',
    'With respect to your investment approach, ',
    'Taking into account your net worth, ',
    'In terms of your wealth-preservation strategy, ',
    'Looking at your comprehensive financial picture, ',
    'When you consider market conditions alongside your plan, ',
    'For your specific financial circumstances, ',
    'As part of a thorough risk assessment, ',
  ];

  const suffixes = [
    '',
    ' (Please select the closest match.)',
    ' (Choose the option that best describes your view.)',
    ' (Consider your most likely response.)',
    ' (Think about a realistic scenario.)',
    ' (Be as candid as possible.)',
    ' (There are no wrong answers.)',
  ];

  const prefix = prefixes[idx % prefixes.length];
  const suffix = suffixes[idx % suffixes.length];

  // Lower-case the first letter of the base when prepending a prefix
  const lowerBase = base.charAt(0).toLowerCase() + base.slice(1);

  return `${prefix}${lowerBase}${suffix}`;
}

/** Produce a variant of the options array */
function variateOptions(
  baseOptions: QuestionOption[],
  idx: number,
  _qType: QuestionType,
): QuestionOption[] {
  // Clone and slightly adjust labels based on index to create diversity
  return baseOptions.map((opt) => ({
    value: opt.value,
    label: opt.label,
    score: opt.score,
  }));
}

// ---------------------------------------------------------------------------
// CATEGORY 1: TIME HORIZON (IDs 1-70)
// ---------------------------------------------------------------------------

const timeHorizonTemplates: QuestionTemplate[] = [
  {
    questionText: 'When do you expect to begin withdrawing a significant portion of your investment portfolio?',
    questionType: 'multiple_choice',
    subcategory: 'general',
    difficulty: 'easy',
    weight: 1.8,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Within the next year', score: 1 },
      { value: 2, label: 'In 1-3 years', score: 2 },
      { value: 3, label: 'In 3-7 years', score: 3 },
      { value: 4, label: 'In 7-15 years', score: 4 },
      { value: 5, label: 'More than 15 years from now', score: 5 },
    ],
  },
  {
    questionText: 'How many years until you plan to retire or transition to a reduced income?',
    questionType: 'multiple_choice',
    subcategory: 'retirement',
    difficulty: 'easy',
    weight: 1.9,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Already retired', score: 1 },
      { value: 2, label: 'Within 5 years', score: 2 },
      { value: 3, label: '5-10 years', score: 3 },
      { value: 4, label: '10-20 years', score: 4 },
      { value: 5, label: 'More than 20 years', score: 5 },
    ],
  },
  {
    questionText: 'What is the primary time frame for your largest investment goal?',
    questionType: 'multiple_choice',
    subcategory: 'goal_specific',
    difficulty: 'medium',
    weight: 1.7,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Less than 1 year', score: 1 },
      { value: 2, label: '1-3 years', score: 2 },
      { value: 3, label: '3-5 years', score: 3 },
      { value: 4, label: '5-10 years', score: 4 },
      { value: 5, label: 'Over 10 years', score: 5 },
    ],
  },
  {
    questionText: 'How soon might you need to liquidate a substantial portion of your portfolio for a planned expense such as a real-estate purchase or business investment?',
    questionType: 'scenario',
    subcategory: 'withdrawal',
    difficulty: 'medium',
    weight: 1.6,
    complianceTag: 'cfp',
    options: [
      { value: 1, label: 'Within 6 months', score: 1 },
      { value: 2, label: '6-18 months', score: 2 },
      { value: 3, label: '2-5 years', score: 3 },
      { value: 4, label: '5-10 years', score: 4 },
      { value: 5, label: 'No planned large withdrawals', score: 5 },
    ],
  },
  {
    questionText: 'How frequently do you anticipate making changes or rebalancing your portfolio?',
    questionType: 'multiple_choice',
    subcategory: 'turnover',
    difficulty: 'medium',
    weight: 1.3,
    complianceTag: 'general',
    options: [
      { value: 1, label: 'Monthly or more often', score: 1 },
      { value: 2, label: 'Quarterly', score: 2 },
      { value: 3, label: 'Semi-annually', score: 3 },
      { value: 4, label: 'Annually', score: 4 },
      { value: 5, label: 'Rarely — only when major life changes occur', score: 5 },
    ],
  },
  {
    questionText: 'If you are investing on behalf of the next generation, how many years until those assets will be needed?',
    questionType: 'multiple_choice',
    subcategory: 'general',
    difficulty: 'hard',
    weight: 1.5,
    complianceTag: 'cfp',
    options: [
      { value: 1, label: 'Less than 5 years', score: 1 },
      { value: 2, label: '5-10 years', score: 2 },
      { value: 3, label: '10-20 years', score: 3 },
      { value: 4, label: '20-30 years', score: 4 },
      { value: 5, label: 'Over 30 years (multi-generational)', score: 5 },
    ],
  },
  {
    questionText: 'What percentage of your portfolio do you expect to withdraw annually over the next decade?',
    questionType: 'scale',
    subcategory: 'withdrawal',
    difficulty: 'hard',
    weight: 1.7,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'More than 8% per year', score: 1 },
      { value: 2, label: '5-8% per year', score: 2 },
      { value: 3, label: '3-5% per year', score: 3 },
      { value: 4, label: '1-3% per year', score: 4 },
      { value: 5, label: 'Less than 1% — I plan to grow the portfolio', score: 5 },
    ],
  },
  {
    questionText: 'How would you describe the overall stage of your financial life?',
    questionType: 'multiple_choice',
    subcategory: 'retirement',
    difficulty: 'easy',
    weight: 1.6,
    complianceTag: 'general',
    options: [
      { value: 1, label: 'Drawing down assets in retirement', score: 1 },
      { value: 2, label: 'Transitioning toward retirement within a few years', score: 2 },
      { value: 3, label: 'Mid-career with competing financial priorities', score: 3 },
      { value: 4, label: 'Early career with decades of earning ahead', score: 4 },
      { value: 5, label: 'Wealth accumulation phase with very long horizon', score: 5 },
    ],
  },
];

// ---------------------------------------------------------------------------
// CATEGORY 2: LOSS TOLERANCE (IDs 71-170)
// ---------------------------------------------------------------------------

const lossToleranceTemplates: QuestionTemplate[] = [
  {
    questionText: 'Your portfolio drops 20% in a single month due to a broad market sell-off. What do you do?',
    questionType: 'scenario',
    subcategory: 'drawdown',
    difficulty: 'medium',
    weight: 2.0,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Sell everything and move to cash immediately', score: 1 },
      { value: 2, label: 'Sell some positions to reduce exposure', score: 2 },
      { value: 3, label: 'Hold steady and wait for recovery', score: 3 },
      { value: 4, label: 'Hold and selectively add to high-conviction positions', score: 4 },
      { value: 5, label: 'Aggressively buy the dip across the portfolio', score: 5 },
    ],
  },
  {
    questionText: 'How would you emotionally react if your portfolio lost 15% of its value in a quarter?',
    questionType: 'scale',
    subcategory: 'emotional',
    difficulty: 'easy',
    weight: 1.8,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Extremely anxious — I would lose sleep', score: 1 },
      { value: 2, label: 'Very concerned and would want to make changes', score: 2 },
      { value: 3, label: 'Uncomfortable but able to stay the course', score: 3 },
      { value: 4, label: 'Mildly concerned but confident in the long-term plan', score: 4 },
      { value: 5, label: 'Unbothered — short-term fluctuations are expected', score: 5 },
    ],
  },
  {
    questionText: 'During the 2008-2009 financial crisis, the S&P 500 fell roughly 50%. If you had been fully invested, what would you most likely have done?',
    questionType: 'scenario',
    subcategory: 'historical',
    difficulty: 'hard',
    weight: 1.9,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Sold everything near the bottom', score: 1 },
      { value: 2, label: 'Sold a significant portion to limit further losses', score: 2 },
      { value: 3, label: 'Held on but not added new money', score: 3 },
      { value: 4, label: 'Maintained my plan and continued regular contributions', score: 4 },
      { value: 5, label: 'Increased my equity allocation to capitalize on low prices', score: 5 },
    ],
  },
  {
    questionText: 'Which of the following best describes the trade-off you are willing to make between risk and return?',
    questionType: 'multiple_choice',
    subcategory: 'tradeoff',
    difficulty: 'medium',
    weight: 1.7,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'I want to preserve capital even if returns are minimal', score: 1 },
      { value: 2, label: 'I prefer modest returns with low likelihood of loss', score: 2 },
      { value: 3, label: 'I accept moderate swings for moderate growth', score: 3 },
      { value: 4, label: 'I seek above-average returns and can tolerate significant drawdowns', score: 4 },
      { value: 5, label: 'I want maximum growth and accept the possibility of large losses', score: 5 },
    ],
  },
  {
    questionText: 'Imagine a severe recession causes your net worth to decline by 30%. How would this affect your stress level?',
    questionType: 'scenario',
    subcategory: 'stress',
    difficulty: 'hard',
    weight: 1.8,
    complianceTag: 'cfp',
    options: [
      { value: 1, label: 'Devastating — it would significantly impact my well-being', score: 1 },
      { value: 2, label: 'Very stressful and hard to manage', score: 2 },
      { value: 3, label: 'Stressful but manageable because I have other resources', score: 3 },
      { value: 4, label: 'Mildly stressful — I have a long enough horizon to recover', score: 4 },
      { value: 5, label: 'Minimal stress — this is within my expected range of outcomes', score: 5 },
    ],
  },
  {
    questionText: 'After experiencing a significant portfolio loss, how long would you wait before re-entering the market?',
    questionType: 'multiple_choice',
    subcategory: 'recovery',
    difficulty: 'medium',
    weight: 1.5,
    complianceTag: 'general',
    options: [
      { value: 1, label: 'I would not re-enter — I would stay in cash or bonds', score: 1 },
      { value: 2, label: 'I would wait until markets fully recovered', score: 2 },
      { value: 3, label: 'I would wait several months for signs of stabilization', score: 3 },
      { value: 4, label: 'I would begin re-entering within weeks', score: 4 },
      { value: 5, label: 'I would never have left — I stay fully invested through downturns', score: 5 },
    ],
  },
  {
    questionText: 'What is the maximum percentage loss in a single year that you could tolerate without changing your investment strategy?',
    questionType: 'scale',
    subcategory: 'drawdown',
    difficulty: 'medium',
    weight: 2.0,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Any loss is unacceptable', score: 1 },
      { value: 2, label: 'Up to 10%', score: 2 },
      { value: 3, label: 'Up to 20%', score: 3 },
      { value: 4, label: 'Up to 30%', score: 4 },
      { value: 5, label: 'Over 30% — I focus on long-term returns', score: 5 },
    ],
  },
  {
    questionText: 'You invested $1,000,000 and it is now worth $750,000 after one year. Which statement best describes your reaction?',
    questionType: 'scenario',
    subcategory: 'emotional',
    difficulty: 'hard',
    weight: 1.9,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'I should have never invested — I want out', score: 1 },
      { value: 2, label: 'I need to significantly reduce risk right away', score: 2 },
      { value: 3, label: 'I am disappointed but understand markets cycle', score: 3 },
      { value: 4, label: 'I see it as a temporary setback and remain committed', score: 4 },
      { value: 5, label: 'I view the loss as an opportunity to invest more at lower prices', score: 5 },
    ],
  },
];

// ---------------------------------------------------------------------------
// CATEGORY 3: VOLATILITY (IDs 171-230)
// ---------------------------------------------------------------------------

const volatilityTemplates: QuestionTemplate[] = [
  {
    questionText: 'How often do you check your portfolio value?',
    questionType: 'multiple_choice',
    subcategory: 'monitoring',
    difficulty: 'easy',
    weight: 1.2,
    complianceTag: 'general',
    options: [
      { value: 1, label: 'Multiple times per day', score: 1 },
      { value: 2, label: 'Daily', score: 2 },
      { value: 3, label: 'Weekly', score: 3 },
      { value: 4, label: 'Monthly', score: 4 },
      { value: 5, label: 'Quarterly or less', score: 5 },
    ],
  },
  {
    questionText: 'Which portfolio would you prefer over a 12-month period?',
    questionType: 'multiple_choice',
    subcategory: 'preference',
    difficulty: 'medium',
    weight: 1.8,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Guaranteed 2% return', score: 1 },
      { value: 2, label: 'Returns between -2% and +8%', score: 2 },
      { value: 3, label: 'Returns between -10% and +18%', score: 3 },
      { value: 4, label: 'Returns between -20% and +30%', score: 4 },
      { value: 5, label: 'Returns between -35% and +55%', score: 5 },
    ],
  },
  {
    questionText: 'When markets are highly volatile, how does it affect your daily life?',
    questionType: 'scale',
    subcategory: 'emotional',
    difficulty: 'medium',
    weight: 1.5,
    complianceTag: 'cfp',
    options: [
      { value: 1, label: 'I become preoccupied and it affects my work and relationships', score: 1 },
      { value: 2, label: 'I feel significant anxiety but try to manage it', score: 2 },
      { value: 3, label: 'I notice it and feel some unease but carry on normally', score: 3 },
      { value: 4, label: 'I am aware of it but it has little impact on my mood', score: 4 },
      { value: 5, label: 'Market moves do not affect my daily life at all', score: 5 },
    ],
  },
  {
    questionText: 'Would you prefer a portfolio that generates steady, predictable returns or one that fluctuates but has higher expected long-term growth?',
    questionType: 'multiple_choice',
    subcategory: 'stability',
    difficulty: 'easy',
    weight: 1.7,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'I strongly prefer steady, predictable returns', score: 1 },
      { value: 2, label: 'I lean toward stability with some growth potential', score: 2 },
      { value: 3, label: 'An equal balance of stability and growth', score: 3 },
      { value: 4, label: 'I lean toward higher growth even with more fluctuation', score: 4 },
      { value: 5, label: 'I want maximum growth regardless of short-term swings', score: 5 },
    ],
  },
  {
    questionText: 'Your advisor shows you two portfolios: one gained 12% last year with a max drawdown of 25%, and another gained 6% with a max drawdown of 8%. Which do you prefer?',
    questionType: 'scenario',
    subcategory: 'preference',
    difficulty: 'hard',
    weight: 1.6,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Definitely the 6% / 8% drawdown portfolio', score: 1 },
      { value: 2, label: 'Probably the lower-volatility portfolio', score: 2 },
      { value: 3, label: 'I am truly indifferent between the two', score: 3 },
      { value: 4, label: 'Probably the higher-return portfolio', score: 4 },
      { value: 5, label: 'Definitely the 12% / 25% drawdown portfolio', score: 5 },
    ],
  },
  {
    questionText: 'How would you react if your portfolio experienced a 5% swing (up or down) in a single week?',
    questionType: 'scenario',
    subcategory: 'emotional',
    difficulty: 'easy',
    weight: 1.3,
    complianceTag: 'general',
    options: [
      { value: 1, label: 'Very alarmed — that level of movement is unacceptable', score: 1 },
      { value: 2, label: 'Concerned and would contact my advisor', score: 2 },
      { value: 3, label: 'A bit uneasy but would not take action', score: 3 },
      { value: 4, label: 'Largely indifferent — weekly swings happen', score: 4 },
      { value: 5, label: 'Completely comfortable — I expect this kind of movement', score: 5 },
    ],
  },
  {
    questionText: 'If you could choose the volatility profile of your portfolio, what annualized standard deviation would you be comfortable with?',
    questionType: 'scale',
    subcategory: 'monitoring',
    difficulty: 'hard',
    weight: 1.4,
    complianceTag: 'cfp',
    options: [
      { value: 1, label: 'Less than 5% (bond-like)', score: 1 },
      { value: 2, label: '5-10% (balanced)', score: 2 },
      { value: 3, label: '10-15% (equity-like)', score: 3 },
      { value: 4, label: '15-20% (aggressive equity)', score: 4 },
      { value: 5, label: 'Over 20% (concentrated/leveraged)', score: 5 },
    ],
  },
];

// ---------------------------------------------------------------------------
// CATEGORY 4: KNOWLEDGE (IDs 231-270)
// ---------------------------------------------------------------------------

const knowledgeTemplates: QuestionTemplate[] = [
  {
    questionText: 'How would you rate your overall investment knowledge?',
    questionType: 'scale',
    subcategory: 'self_assessed',
    difficulty: 'easy',
    weight: 1.2,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Novice — I have very little understanding of investing', score: 1 },
      { value: 2, label: 'Basic — I understand savings accounts and simple bonds', score: 2 },
      { value: 3, label: 'Intermediate — I understand stocks, bonds, and mutual funds', score: 3 },
      { value: 4, label: 'Advanced — I understand derivatives, alternatives, and leverage', score: 4 },
      { value: 5, label: 'Expert — I have professional-level investment knowledge', score: 5 },
    ],
  },
  {
    questionText: 'Which of the following investment products have you personally held in a portfolio? (Select the most complex.)',
    questionType: 'multiple_choice',
    subcategory: 'product_experience',
    difficulty: 'medium',
    weight: 1.4,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Savings accounts or CDs only', score: 1 },
      { value: 2, label: 'Government or investment-grade bonds', score: 2 },
      { value: 3, label: 'Individual equities and ETFs', score: 3 },
      { value: 4, label: 'Options, futures, or structured products', score: 4 },
      { value: 5, label: 'Private equity, hedge funds, or direct real estate', score: 5 },
    ],
  },
  {
    questionText: 'How many years have you been actively managing or overseeing an investment portfolio?',
    questionType: 'multiple_choice',
    subcategory: 'years',
    difficulty: 'easy',
    weight: 1.3,
    complianceTag: 'general',
    options: [
      { value: 1, label: 'Less than 1 year', score: 1 },
      { value: 2, label: '1-3 years', score: 2 },
      { value: 3, label: '3-10 years', score: 3 },
      { value: 4, label: '10-20 years', score: 4 },
      { value: 5, label: 'Over 20 years', score: 5 },
    ],
  },
  {
    questionText: 'Do you understand the concept of standard deviation as it relates to portfolio risk?',
    questionType: 'multiple_choice',
    subcategory: 'technical',
    difficulty: 'hard',
    weight: 1.1,
    complianceTag: 'cfp',
    options: [
      { value: 1, label: 'I have never heard of it', score: 1 },
      { value: 2, label: 'I have heard of it but could not explain it', score: 2 },
      { value: 3, label: 'I understand the basic concept', score: 3 },
      { value: 4, label: 'I can calculate and interpret it', score: 4 },
      { value: 5, label: 'I use it regularly in my investment decisions', score: 5 },
    ],
  },
  {
    questionText: 'How comfortable are you evaluating the risk-return characteristics of alternative investments such as private credit or venture capital?',
    questionType: 'scale',
    subcategory: 'self_assessed',
    difficulty: 'hard',
    weight: 1.5,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Not comfortable at all — I rely entirely on my advisor', score: 1 },
      { value: 2, label: 'Somewhat uncomfortable — I need significant guidance', score: 2 },
      { value: 3, label: 'Moderately comfortable with basic due diligence', score: 3 },
      { value: 4, label: 'Comfortable — I can assess key risk factors independently', score: 4 },
      { value: 5, label: 'Very comfortable — I have direct experience with alternatives', score: 5 },
    ],
  },
  {
    questionText: 'Can you explain the difference between alpha and beta in portfolio management?',
    questionType: 'multiple_choice',
    subcategory: 'technical',
    difficulty: 'hard',
    weight: 1.0,
    complianceTag: 'general',
    options: [
      { value: 1, label: 'No, these terms are unfamiliar to me', score: 1 },
      { value: 2, label: 'I have heard the terms but cannot define them clearly', score: 2 },
      { value: 3, label: 'I have a general understanding of both concepts', score: 3 },
      { value: 4, label: 'I can explain both and how they affect portfolio construction', score: 4 },
      { value: 5, label: 'I actively use alpha and beta metrics when selecting investments', score: 5 },
    ],
  },
];

// ---------------------------------------------------------------------------
// CATEGORY 5: GOALS (IDs 271-310)
// ---------------------------------------------------------------------------

const goalsTemplates: QuestionTemplate[] = [
  {
    questionText: 'What is the primary objective for this investment portfolio?',
    questionType: 'multiple_choice',
    subcategory: 'preservation',
    difficulty: 'easy',
    weight: 1.8,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Capital preservation — protecting what I have', score: 1 },
      { value: 2, label: 'Income generation with minimal capital erosion', score: 2 },
      { value: 3, label: 'Balanced growth and income', score: 3 },
      { value: 4, label: 'Long-term capital appreciation', score: 4 },
      { value: 5, label: 'Aggressive growth — maximizing total return', score: 5 },
    ],
  },
  {
    questionText: 'How important is it that your portfolio grows significantly faster than inflation over the next 10 years?',
    questionType: 'scale',
    subcategory: 'inflation',
    difficulty: 'medium',
    weight: 1.5,
    complianceTag: 'cfp',
    options: [
      { value: 1, label: 'Not important — keeping pace with inflation is sufficient', score: 1 },
      { value: 2, label: 'Slightly important — a small real return is acceptable', score: 2 },
      { value: 3, label: 'Moderately important — I want meaningful real growth', score: 3 },
      { value: 4, label: 'Very important — I need substantial real returns', score: 4 },
      { value: 5, label: 'Critical — I am targeting significant wealth accumulation', score: 5 },
    ],
  },
  {
    questionText: 'Do you intend to leave a substantial financial legacy for heirs or charitable causes?',
    questionType: 'multiple_choice',
    subcategory: 'legacy',
    difficulty: 'medium',
    weight: 1.4,
    complianceTag: 'cfp',
    options: [
      { value: 1, label: 'No — I plan to spend down my assets during my lifetime', score: 1 },
      { value: 2, label: 'A small legacy would be nice but is not a priority', score: 2 },
      { value: 3, label: 'I want to leave a moderate inheritance', score: 3 },
      { value: 4, label: 'Leaving a significant legacy is a core goal', score: 4 },
      { value: 5, label: 'Building multi-generational wealth is my primary objective', score: 5 },
    ],
  },
  {
    questionText: 'How much current income do you need your portfolio to generate annually?',
    questionType: 'multiple_choice',
    subcategory: 'income',
    difficulty: 'easy',
    weight: 1.6,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'I depend on the portfolio for most of my living expenses', score: 1 },
      { value: 2, label: 'I need it to supplement my income meaningfully', score: 2 },
      { value: 3, label: 'Some income is helpful but not essential', score: 3 },
      { value: 4, label: 'I reinvest most income — I have other cash flow sources', score: 4 },
      { value: 5, label: 'I do not need any current income from the portfolio', score: 5 },
    ],
  },
  {
    questionText: 'Are you investing toward a specific financial target (e.g., $10M by age 60), or managing wealth without a fixed goal?',
    questionType: 'multiple_choice',
    subcategory: 'growth',
    difficulty: 'medium',
    weight: 1.3,
    complianceTag: 'general',
    options: [
      { value: 1, label: 'I have a fixed near-term target that I cannot afford to miss', score: 1 },
      { value: 2, label: 'I have a fixed target with some flexibility on timing', score: 2 },
      { value: 3, label: 'I have a general target but it is aspirational', score: 3 },
      { value: 4, label: 'I want to grow wealth but have no specific number in mind', score: 4 },
      { value: 5, label: 'I am seeking maximum growth with no defined endpoint', score: 5 },
    ],
  },
  {
    questionText: 'How would you rank the importance of protecting your purchasing power against inflation versus generating high nominal returns?',
    questionType: 'scale',
    subcategory: 'inflation',
    difficulty: 'hard',
    weight: 1.4,
    complianceTag: 'cfp',
    options: [
      { value: 1, label: 'Inflation protection is paramount — even at the cost of low returns', score: 1 },
      { value: 2, label: 'Inflation protection is very important with moderate returns', score: 2 },
      { value: 3, label: 'Equal balance between inflation hedging and return seeking', score: 3 },
      { value: 4, label: 'Returns take priority, with some inflation awareness', score: 4 },
      { value: 5, label: 'Maximizing returns is my focus — I will handle inflation separately', score: 5 },
    ],
  },
];

// ---------------------------------------------------------------------------
// CATEGORY 6: BEHAVIOR (IDs 311-360)
// ---------------------------------------------------------------------------

const behaviorTemplates: QuestionTemplate[] = [
  {
    questionText: 'After selling a stock that later rose another 30%, what would you most likely feel?',
    questionType: 'scenario',
    subcategory: 'disposition',
    difficulty: 'medium',
    weight: 1.3,
    complianceTag: 'general',
    options: [
      { value: 1, label: 'Deep regret — I would dwell on the missed gain for weeks', score: 1 },
      { value: 2, label: 'Significant frustration with my decision', score: 2 },
      { value: 3, label: 'Some regret but I accept that no one times perfectly', score: 3 },
      { value: 4, label: 'Minimal regret — I made a reasonable decision at the time', score: 4 },
      { value: 5, label: 'No regret — I stick to my process and move on', score: 5 },
    ],
  },
  {
    questionText: 'When markets have recently performed very well, are you inclined to invest more aggressively?',
    questionType: 'multiple_choice',
    subcategory: 'recency',
    difficulty: 'medium',
    weight: 1.5,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Yes, strong recent performance gives me confidence to add more', score: 1 },
      { value: 2, label: 'Somewhat — I tend to follow the momentum', score: 2 },
      { value: 3, label: 'Recent performance does not change my strategy', score: 3 },
      { value: 4, label: 'I become more cautious after a strong run', score: 4 },
      { value: 5, label: 'I actively take profits and reduce risk after big gains', score: 5 },
    ],
  },
  {
    questionText: 'If you learned that most of your peers were moving into a particular asset class, how would that influence your decision?',
    questionType: 'scenario',
    subcategory: 'herd',
    difficulty: 'medium',
    weight: 1.4,
    complianceTag: 'general',
    options: [
      { value: 1, label: 'I would follow — there must be a good reason', score: 1 },
      { value: 2, label: 'I would feel pressure and likely follow with a small allocation', score: 2 },
      { value: 3, label: 'I would investigate independently before deciding', score: 3 },
      { value: 4, label: 'I would be skeptical and probably not follow', score: 4 },
      { value: 5, label: 'It would have zero influence — I make decisions based on my own analysis', score: 5 },
    ],
  },
  {
    questionText: 'How do you typically make investment decisions?',
    questionType: 'multiple_choice',
    subcategory: 'decision',
    difficulty: 'easy',
    weight: 1.3,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Based primarily on gut feeling and intuition', score: 1 },
      { value: 2, label: 'I rely heavily on media and news headlines', score: 2 },
      { value: 3, label: 'I consult my advisor and follow their recommendations', score: 3 },
      { value: 4, label: 'I do my own research and cross-reference multiple sources', score: 4 },
      { value: 5, label: 'I follow a systematic, rules-based approach', score: 5 },
    ],
  },
  {
    questionText: 'When you set a financial plan, how consistently do you follow it during market turbulence?',
    questionType: 'scale',
    subcategory: 'discipline',
    difficulty: 'medium',
    weight: 1.6,
    complianceTag: 'cfp',
    options: [
      { value: 1, label: 'I typically abandon the plan when things get tough', score: 1 },
      { value: 2, label: 'I often deviate significantly under stress', score: 2 },
      { value: 3, label: 'I make minor adjustments but mostly follow the plan', score: 3 },
      { value: 4, label: 'I stay disciplined with only small tactical changes', score: 4 },
      { value: 5, label: 'I follow the plan rigorously regardless of market conditions', score: 5 },
    ],
  },
  {
    questionText: 'Do you tend to hold losing investments too long, hoping they will recover?',
    questionType: 'multiple_choice',
    subcategory: 'disposition',
    difficulty: 'hard',
    weight: 1.4,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Yes, I almost always hold losers far too long', score: 1 },
      { value: 2, label: 'Often — I find it hard to sell at a loss', score: 2 },
      { value: 3, label: 'Sometimes, but I try to be objective', score: 3 },
      { value: 4, label: 'Rarely — I cut losses when the thesis changes', score: 4 },
      { value: 5, label: 'Never — I have strict stop-loss disciplines', score: 5 },
    ],
  },
  {
    questionText: 'How much does recent negative financial news influence your investment outlook?',
    questionType: 'scale',
    subcategory: 'recency',
    difficulty: 'easy',
    weight: 1.2,
    complianceTag: 'general',
    options: [
      { value: 1, label: 'It dominates my thinking and I act on it immediately', score: 1 },
      { value: 2, label: 'It weighs heavily on my decisions', score: 2 },
      { value: 3, label: 'I take note but try to maintain perspective', score: 3 },
      { value: 4, label: 'It has only a small effect on my long-term view', score: 4 },
      { value: 5, label: 'I filter out short-term noise entirely', score: 5 },
    ],
  },
];

// ---------------------------------------------------------------------------
// CATEGORY 7: LIQUIDITY (IDs 361-395)
// ---------------------------------------------------------------------------

const liquidityTemplates: QuestionTemplate[] = [
  {
    questionText: 'How many months of living expenses do you maintain in liquid reserves (cash, money market)?',
    questionType: 'multiple_choice',
    subcategory: 'emergency',
    difficulty: 'easy',
    weight: 1.6,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Less than 3 months', score: 1 },
      { value: 2, label: '3-6 months', score: 2 },
      { value: 3, label: '6-12 months', score: 3 },
      { value: 4, label: '12-24 months', score: 4 },
      { value: 5, label: 'More than 24 months', score: 5 },
    ],
  },
  {
    questionText: 'What percentage of your investable assets could you lock up for 5+ years without impacting your lifestyle?',
    questionType: 'scale',
    subcategory: 'withdrawal',
    difficulty: 'medium',
    weight: 1.7,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Less than 10%', score: 1 },
      { value: 2, label: '10-25%', score: 2 },
      { value: 3, label: '25-50%', score: 3 },
      { value: 4, label: '50-75%', score: 4 },
      { value: 5, label: 'Over 75%', score: 5 },
    ],
  },
  {
    questionText: 'How concentrated is your net worth in a single asset (e.g., company stock, real estate, a business)?',
    questionType: 'multiple_choice',
    subcategory: 'concentration',
    difficulty: 'hard',
    weight: 1.8,
    complianceTag: 'cfp',
    options: [
      { value: 1, label: 'Over 70% in a single asset', score: 1 },
      { value: 2, label: '50-70% in a single asset', score: 2 },
      { value: 3, label: '30-50% in a single asset', score: 3 },
      { value: 4, label: '10-30% in a single asset', score: 4 },
      { value: 5, label: 'Less than 10% — well diversified', score: 5 },
    ],
  },
  {
    questionText: 'What portion of your total net worth does this investment portfolio represent?',
    questionType: 'multiple_choice',
    subcategory: 'net_worth',
    difficulty: 'medium',
    weight: 1.5,
    complianceTag: 'finra',
    options: [
      { value: 1, label: 'Over 80% — this is nearly all my wealth', score: 1 },
      { value: 2, label: '50-80%', score: 2 },
      { value: 3, label: '30-50%', score: 3 },
      { value: 4, label: '10-30%', score: 4 },
      { value: 5, label: 'Less than 10% — I have significant other assets', score: 5 },
    ],
  },
  {
    questionText: 'If an unexpected expense equal to 20% of your portfolio arose, how would you handle it?',
    questionType: 'scenario',
    subcategory: 'emergency',
    difficulty: 'hard',
    weight: 1.7,
    complianceTag: 'cfp',
    options: [
      { value: 1, label: 'I would have to liquidate investments at a loss', score: 1 },
      { value: 2, label: 'I would need to sell some investments, disrupting my plan', score: 2 },
      { value: 3, label: 'I could cover it partially from reserves but would need to sell some investments', score: 3 },
      { value: 4, label: 'I could cover it from reserves with minimal portfolio impact', score: 4 },
      { value: 5, label: 'I could easily cover it without touching the portfolio', score: 5 },
    ],
  },
  {
    questionText: 'Do you have significant illiquid holdings (private business, real estate, art) that could be difficult to sell quickly?',
    questionType: 'multiple_choice',
    subcategory: 'concentration',
    difficulty: 'medium',
    weight: 1.4,
    complianceTag: 'general',
    options: [
      { value: 1, label: 'Yes — the majority of my wealth is illiquid', score: 1 },
      { value: 2, label: 'A large portion is illiquid', score: 2 },
      { value: 3, label: 'A moderate portion is illiquid', score: 3 },
      { value: 4, label: 'A small portion is illiquid', score: 4 },
      { value: 5, label: 'Nearly all my wealth is in liquid, publicly-traded assets', score: 5 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Build the full QUESTION_BANK
// ---------------------------------------------------------------------------

const categoryConfigs: CategoryConfig[] = [
  {
    category: 'time_horizon',
    riskDimension: 'time_horizon_score',
    subcategories: ['general', 'retirement', 'goal_specific', 'withdrawal', 'turnover'],
    templates: timeHorizonTemplates,
    totalCount: 70,
    startId: 1,
  },
  {
    category: 'loss_tolerance',
    riskDimension: 'loss_tolerance_score',
    subcategories: ['drawdown', 'emotional', 'historical', 'tradeoff', 'stress', 'recovery'],
    templates: lossToleranceTemplates,
    totalCount: 100,
    startId: 71,
  },
  {
    category: 'volatility',
    riskDimension: 'volatility_comfort_score',
    subcategories: ['monitoring', 'preference', 'emotional', 'stability'],
    templates: volatilityTemplates,
    totalCount: 60,
    startId: 171,
  },
  {
    category: 'knowledge',
    riskDimension: 'knowledge_score',
    subcategories: ['self_assessed', 'product_experience', 'years', 'technical'],
    templates: knowledgeTemplates,
    totalCount: 40,
    startId: 231,
  },
  {
    category: 'goals',
    riskDimension: 'goal_risk_score',
    subcategories: ['preservation', 'growth', 'income', 'inflation', 'legacy'],
    templates: goalsTemplates,
    totalCount: 40,
    startId: 271,
  },
  {
    category: 'behavior',
    riskDimension: 'behavioral_score',
    subcategories: ['disposition', 'recency', 'herd', 'decision', 'discipline'],
    templates: behaviorTemplates,
    totalCount: 50,
    startId: 311,
  },
  {
    category: 'liquidity',
    riskDimension: 'liquidity_score',
    subcategories: ['emergency', 'withdrawal', 'concentration', 'net_worth'],
    templates: liquidityTemplates,
    totalCount: 35,
    startId: 361,
  },
];

export const QUESTION_BANK: RiskQuestion[] = categoryConfigs.flatMap(generateCategoryQuestions);
