// ═══════════════════════════════════════════════════════════════════════
// Farther Focus — Intelligent Wealth Risk Profile System
// Complete type system for multi-axis risk profiling
// ═══════════════════════════════════════════════════════════════════════

// ── Wealth Tiers ─────────────────────────────────────────────────────

export type WealthTier = 'emerging' | 'mass_affluent' | 'hnw' | 'uhnw';

export const WEALTH_TIER_LABELS: Record<WealthTier, string> = {
  emerging: 'Emerging Investor',
  mass_affluent: 'Mass Affluent',
  hnw: 'HNW',
  uhnw: 'UHNW / Family Office',
};

export const WEALTH_TIER_DESCRIPTIONS: Record<WealthTier, string> = {
  emerging: 'Under $500K investable assets',
  mass_affluent: '$500K – $2M investable assets',
  hnw: '$2M – $10M investable assets',
  uhnw: '$10M+ investable assets',
};

// ── Client Intake Data ───────────────────────────────────────────────

export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh';
export type IncomeStability = 'very_stable' | 'stable' | 'variable' | 'highly_variable';

export interface ClientDemographics {
  age: number;
  maritalStatus: 'single' | 'married' | 'partnered' | 'divorced' | 'widowed';
  dependents: number;
  stateOfResidence: string;
}

export interface ClientFinancials {
  annualIncome: number;
  incomeStability: IncomeStability;
  totalNetWorth: number;
  liquidNetWorth: number;
  annualExpenses: number;
  debtObligations: number;
  emergencyReserveMonths: number;
}

export interface ClientTax {
  filingStatus: FilingStatus;
  marginalBracket: number;
  stateIncomeTaxRate: number;
}

export interface ClientGoal {
  name: string;
  targetAmount: number;
  timeHorizonYears: number;
  priority: 'essential' | 'important' | 'aspirational';
}

export interface ClientAlternatives {
  privateEquity: boolean;
  privateCredit: boolean;
  hedgeFunds: boolean;
  realEstateDirect: boolean;
  crypto: boolean;
  collectibles: boolean;
  concentratedStock: boolean;
}

export interface ClientIntake {
  wealthTier: WealthTier;
  demographics: ClientDemographics;
  financials: ClientFinancials;
  tax: ClientTax;
  goals: ClientGoal[];
  investmentExperienceYears: number;
  alternatives: ClientAlternatives;
}

// ── Question System ──────────────────────────────────────────────────

export type QuestionType = 'multiple_choice' | 'scale' | 'scenario';

export type QuestionAxis =
  | 'tolerance'
  | 'capacity'
  | 'bias'
  | 'complexity';

export type Category =
  | 'emotional_reaction'
  | 'loss_scenarios'
  | 'volatility_preference'
  | 'time_horizon'
  | 'liquidity_needs'
  | 'financial_cushion'
  | 'behavioral_bias'
  | 'alternatives_comfort'
  | 'knowledge'
  // Legacy categories (395-question bank)
  | 'loss_tolerance'
  | 'volatility'
  | 'goals'
  | 'behavior'
  | 'liquidity';

export type ComplianceTag = 'finra_2111' | 'reg_bi' | 'cfa_framework' | 'general' | 'finra' | 'cfp';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type RiskDimension =
  | 'time_horizon_score'
  | 'loss_tolerance_score'
  | 'volatility_comfort_score'
  | 'knowledge_score'
  | 'goal_risk_score'
  | 'behavioral_score'
  | 'liquidity_score';

export interface QuestionOption {
  value: number;
  label: string;
  score: number;
}

export interface RiskQuestion {
  id: number;
  questionText: string;
  questionType: QuestionType;
  axis?: QuestionAxis;
  category: Category;
  subcategory: string;
  options: QuestionOption[];
  weight: number;
  complianceTag: ComplianceTag;
  wealthTier?: WealthTier;
  biasDetection?: 'framing' | 'recency' | 'loss_aversion' | 'overconfidence';
  // Legacy fields (395-question bank)
  riskDimension?: RiskDimension;
  difficulty?: Difficulty;
}

export interface QuestionResponse {
  questionId: number;
  answerValue: number;
}

// ── Multi-Axis Scores ────────────────────────────────────────────────

export interface AxisScores {
  tolerance: number;    // 0–100: psychometric risk tolerance (willingness)
  capacity: number;     // 0–100: financial ability to bear risk
  need: number;         // required annual return to meet goals (%)
  biasIndex: number;    // 0–100: severity of detected biases
  complexity: number;   // 0–100: comfort with complex/alternative strategies
}

// ── Risk Bands & Portfolios ──────────────────────────────────────────

export type RiskBand = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const RISK_BAND_LABELS: Record<RiskBand, string> = {
  1: 'Capital Preservation',
  2: 'Conservative Income',
  3: 'Moderate Conservative',
  4: 'Moderate Growth',
  5: 'Balanced Growth',
  6: 'Aggressive Growth',
  7: 'Maximum Growth',
};

export const RISK_BAND_DESCRIPTIONS: Record<RiskBand, string> = {
  1: 'Focused on protecting capital with minimal volatility. Suitable for very short horizons or zero loss tolerance.',
  2: 'Primarily income-generating with modest growth. Accepts small fluctuations for steady yield.',
  3: 'Balanced toward stability with some growth exposure. Comfortable with moderate short-term losses.',
  4: 'Balanced growth and income. Accepts meaningful drawdowns for long-term appreciation.',
  5: 'Growth-oriented with diversified risk. Comfortable with significant market swings.',
  6: 'Aggressive growth with higher concentration. Accepts large drawdowns for maximum upside.',
  7: 'Maximum appreciation with highest volatility. Suitable for very long horizons and high capacity.',
};

export interface ModelAllocation {
  usEquity: number;
  intlEquity: number;
  emEquity: number;
  govBonds: number;
  corpBonds: number;
  highYield: number;
  reits: number;
  commodities: number;
  alternatives: number;
  crypto: number;
  cash: number;
}

export interface ModelPortfolio {
  band: RiskBand;
  label: string;
  allocation: ModelAllocation;
  expectedReturn: number;   // annualized %
  expectedVolatility: number; // annualized %
  maxDrawdown: number;       // worst historical %
  sharpeRatio: number;
}

// ── Backtesting ──────────────────────────────────────────────────────

export interface BacktestMetrics {
  cagr: number;
  volatility: number;
  maxDrawdown: number;
  worstYear: number;
  worst3Year: number;
  best3Year: number;
  percentNegativeYears: number;
  recoveryMonths: number;     // months to recover from max drawdown
}

export interface CrashScenario {
  name: string;
  period: string;
  loss: number;       // portfolio loss %
  recoveryMonths: number;
}

export interface BacktestResult {
  band: RiskBand;
  metrics: BacktestMetrics;
  crashScenarios: CrashScenario[];
  annualReturns: { year: number; return: number }[];
}

// ── Bias Detection ───────────────────────────────────────────────────

export interface DetectedBias {
  type: 'loss_aversion' | 'recency' | 'overconfidence' | 'framing' | 'herd';
  severity: 'low' | 'moderate' | 'high';
  description: string;
  advisorTalkingPoint: string;
}

// ── Contradiction / Inconsistency ────────────────────────────────────

export interface Inconsistency {
  dimensions: [string, string];
  severity: 'info' | 'warning' | 'critical';
  description: string;
  recommendation: string;
}

// ── Final Risk Profile ───────────────────────────────────────────────

export interface RiskProfile {
  // Scores
  axisScores: AxisScores;
  toleranceBand: RiskBand;
  capacityBand: RiskBand;
  recommendedBand: RiskBand;

  // Portfolio comparison (conservative / recommended / aggressive)
  conservativePortfolio: ModelPortfolio;
  recommendedPortfolio: ModelPortfolio;
  aggressivePortfolio: ModelPortfolio;

  // Backtesting
  conservativeBacktest: BacktestResult;
  recommendedBacktest: BacktestResult;
  aggressiveBacktest: BacktestResult;

  // Risk intelligence
  detectedBiases: DetectedBias[];
  inconsistencies: Inconsistency[];
  goalFeasibility: GoalFeasibility[];
  confidence: number; // 0–100

  // Compliance
  complianceNotes: string;
  questionCount: number;
  completedAt: string;
}

export interface GoalFeasibility {
  goalName: string;
  requiredReturn: number;
  recommendedReturn: number;
  feasible: boolean;
  shortfallNote: string;
}

// ── Category metadata ────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<Category, string> = {
  emotional_reaction: 'Emotional Reactions',
  loss_scenarios: 'Loss Scenarios',
  volatility_preference: 'Volatility Preference',
  time_horizon: 'Time Horizon',
  liquidity_needs: 'Liquidity Needs',
  financial_cushion: 'Financial Cushion',
  behavioral_bias: 'Behavioral Tendencies',
  alternatives_comfort: 'Alternatives Comfort',
  knowledge: 'Investment Knowledge',
  // Legacy categories
  loss_tolerance: 'Loss Tolerance',
  volatility: 'Volatility',
  goals: 'Goals',
  behavior: 'Behavior',
  liquidity: 'Liquidity',
};

export const AXIS_LABELS: Record<QuestionAxis, string> = {
  tolerance: 'Risk Tolerance',
  capacity: 'Risk Capacity',
  bias: 'Behavioral Bias',
  complexity: 'Complexity Comfort',
};

export const CATEGORY_TO_AXIS: Record<Category, QuestionAxis> = {
  emotional_reaction: 'tolerance',
  loss_scenarios: 'tolerance',
  volatility_preference: 'tolerance',
  time_horizon: 'capacity',
  liquidity_needs: 'capacity',
  financial_cushion: 'capacity',
  behavioral_bias: 'bias',
  alternatives_comfort: 'complexity',
  knowledge: 'complexity',
  // Legacy categories
  loss_tolerance: 'tolerance',
  volatility: 'tolerance',
  goals: 'tolerance',
  behavior: 'bias',
  liquidity: 'capacity',
};
