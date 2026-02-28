// Risk Profile System Types

export type QuestionType = 'multiple_choice' | 'scale' | 'scenario';

export type Category =
  | 'time_horizon'
  | 'loss_tolerance'
  | 'volatility'
  | 'knowledge'
  | 'goals'
  | 'behavior'
  | 'liquidity';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ComplianceTag = 'finra' | 'cfp' | 'general';

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
  category: Category;
  subcategory: string;
  options: QuestionOption[];
  riskDimension: RiskDimension;
  weight: number;
  complianceTag: ComplianceTag;
  difficulty: Difficulty;
}

export interface QuestionResponse {
  questionId: number;
  answerValue: number;
}

export type RiskProfileLevel =
  | 'Very Conservative'
  | 'Conservative'
  | 'Moderate'
  | 'Aggressive'
  | 'Very Aggressive';

export interface DimensionScores {
  time_horizon_score: number;
  loss_tolerance_score: number;
  volatility_comfort_score: number;
  knowledge_score: number;
  goal_risk_score: number;
  behavioral_score: number;
  liquidity_score: number;
}

export interface RecommendedAllocation {
  stocks: number;
  bonds: number;
  cash: number;
}

export interface Contradiction {
  dimensions: [string, string];
  description: string;
}

export interface RiskProfile {
  profile: RiskProfileLevel;
  level: number;
  overallScore: number;
  dimensionScores: DimensionScores;
  recommendedAllocation: RecommendedAllocation;
  confidence: number;
  contradictions: Contradiction[];
  questionCount: number;
}

export const CATEGORY_WEIGHTS: Record<Category, number> = {
  time_horizon: 0.20,
  loss_tolerance: 0.30,
  volatility: 0.15,
  knowledge: 0.10,
  goals: 0.10,
  behavior: 0.10,
  liquidity: 0.05,
};

export const CATEGORY_LABELS: Record<Category, string> = {
  time_horizon: 'Time Horizon',
  loss_tolerance: 'Loss Tolerance',
  volatility: 'Volatility Comfort',
  knowledge: 'Investment Knowledge',
  goals: 'Financial Goals',
  behavior: 'Behavioral Biases',
  liquidity: 'Liquidity & Concentration',
};

export const DIMENSION_FOR_CATEGORY: Record<Category, RiskDimension> = {
  time_horizon: 'time_horizon_score',
  loss_tolerance: 'loss_tolerance_score',
  volatility: 'volatility_comfort_score',
  knowledge: 'knowledge_score',
  goals: 'goal_risk_score',
  behavior: 'behavioral_score',
  liquidity: 'liquidity_score',
};

export const DIMENSION_LABELS: Record<RiskDimension, string> = {
  time_horizon_score: 'Time Horizon',
  loss_tolerance_score: 'Loss Tolerance',
  volatility_comfort_score: 'Volatility Comfort',
  knowledge_score: 'Investment Knowledge',
  goal_risk_score: 'Financial Goals',
  behavioral_score: 'Behavioral Biases',
  liquidity_score: 'Liquidity',
};
