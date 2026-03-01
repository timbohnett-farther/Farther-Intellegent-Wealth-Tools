// ==================== AI PLANNING INTELLIGENCE ENGINE — SHARED TYPES ====================
// Stage 4: AI intelligence layer for the Farther Prism financial planning platform.
// These types are self-contained and do not depend on any external framework.

// ==================== ALERT & INSIGHT TYPES ====================

/** Severity levels for plan alerts, ordered from informational to critical. */
export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/** Broad categories that group related alerts. */
export type AlertCategory =
  | 'tax'
  | 'retirement'
  | 'estate'
  | 'insurance'
  | 'investment'
  | 'cash_flow'
  | 'social_security'
  | 'healthcare'
  | 'compliance'
  | 'opportunity';

/** A single alert produced when a monitored condition triggers. */
export interface PlanAlert {
  /** Machine-readable trigger identifier, e.g. "roth_conversion_window". */
  triggerId: string;
  /** Alert severity — drives UI treatment and notification urgency. */
  severity: AlertSeverity;
  /** Category for grouping in the advisor dashboard. */
  category: AlertCategory;
  /** Short human-readable title. */
  title: string;
  /** Longer description explaining the situation. */
  description: string;
  /** Plain-English recommended next step. */
  recommendedAction: string;
  /** Estimated dollar impact if the alert is addressed (positive = savings/gain). */
  estimatedImpact: number;
  /** Optional deadline by which the action should be taken (ISO date string). */
  deadline: string | null;
  /** Whether the system can auto-execute an action (e.g. rebalance). */
  autoActionAvailable: boolean;
}

/** The type of insight — distinguishes proactive vs. reactive vs. informational. */
export type InsightType = 'alert' | 'opportunity' | 'anomaly' | 'recommendation' | 'informational';

/** An action the advisor can take directly from an insight card. */
export interface InsightAction {
  /** Button / link label shown in the UI. */
  label: string;
  /** Action type that the front-end routes. */
  type: 'navigate_to_module' | 'open_form' | 'run_analysis' | 'schedule_meeting';
  /** Target path, form ID, or analysis key. */
  target: string;
}

/** Estimated financial impact of acting on an insight. */
export interface EstimatedImpact {
  /** Whether the impact is a savings, gain, or risk avoidance. */
  type: 'savings' | 'gain' | 'risk_reduction' | 'cost_avoidance';
  /** Dollar amount of the impact. */
  amount: number;
  /** Time horizon over which the impact accrues, e.g. "annual", "lifetime", "5-year". */
  timeframe: string;
}

/** A ranked, actionable insight surfaced to the advisor. */
export interface PlanInsight {
  /** Unique insight identifier. */
  id: string;
  /** Display rank (1 = most important). Assigned by the ranking algorithm. */
  rank: number;
  /** Category for grouping. */
  category: AlertCategory;
  /** Insight type. */
  type: InsightType;
  /** Short headline. */
  title: string;
  /** One-sentence summary. */
  summary: string;
  /** Multi-paragraph detail with supporting numbers. */
  detail: string;
  /** Estimated financial impact. */
  estimatedImpact: EstimatedImpact;
  /** Actionable buttons / links the advisor can follow. */
  actions: InsightAction[];
  /** Whether this insight was produced by the AI engine (vs. rule-based). */
  aiGenerated: boolean;
  /** Whether the advisor has dismissed this insight. */
  dismissed: boolean;
}

// ==================== PLAN MONITOR TYPES ====================

/** Input data structure consumed by the plan monitor. */
export interface PlanMonitorInput {
  planId: string;
  clientName: string;
  clientAge: number;
  spouseAge: number | null;
  filingStatus: 'single' | 'mfj' | 'mfs' | 'hoh';
  currentYear: number;
  retirementYear: number;
  /** Taxable ordinary income for the current year. */
  taxableIncome: number;
  /** Adjusted Gross Income. */
  agi: number;
  /** Modified Adjusted Gross Income for IRMAA lookback. */
  magiTwoYearsAgo: number;
  /** Federal marginal tax bracket rate (decimal). */
  marginalRate: number;
  /** Current-year estimated tax payments made so far. */
  estimatedTaxPaymentsMade: number;
  /** Projected total tax liability for the year. */
  projectedTaxLiability: number;
  /** Last filed tax return AGI. */
  lastTaxReturnAgi: number;
  /** Monte Carlo probability of success (0–1). */
  successRate: number;
  /** Previous run's success rate for delta comparison. */
  previousSuccessRate: number;
  /** Total pre-tax (traditional IRA/401k) balance. */
  preTaxBalance: number;
  /** Total Roth balance. */
  rothBalance: number;
  /** Total taxable brokerage balance. */
  taxableBalance: number;
  /** Total portfolio value across all accounts. */
  totalPortfolioValue: number;
  /** Previous period total portfolio value. */
  previousPortfolioValue: number;
  /** Social Security PIA (primary insurance amount). */
  ssPia: number;
  /** Planned SS claim age. */
  ssClaimAge: number;
  /** Full retirement age for SS. */
  fullRetirementAge: number;
  /** Estate documents last review date (ISO string or null). */
  estateDocumentsLastReview: string | null;
  /** Beneficiary designations last review date (ISO string or null). */
  beneficiaryLastReview: string | null;
  /** Gross estate value for estate-tax analysis. */
  grossEstateValue: number;
  /** Federal estate-tax exemption amount. */
  estateExemptionAmount: number;
  /** Annual gifting already done this year. */
  annualGiftingDone: number;
  /** Annual gift exclusion limit. */
  annualGiftExclusion: number;
  /** Number of gift recipients available. */
  giftRecipientCount: number;
  /** Life insurance coverage amount. */
  lifeInsuranceCoverage: number;
  /** Annual income for insurance gap calc. */
  annualIncome: number;
  /** Outstanding debt total. */
  outstandingDebt: number;
  /** 401k contribution made this year. */
  k401ContributionYTD: number;
  /** 401k contribution limit for the year. */
  k401Limit: number;
  /** IRA contribution made this year. */
  iraContributionYTD: number;
  /** IRA contribution limit for the year. */
  iraLimit: number;
  /** HSA contribution made this year. */
  hsaContributionYTD: number;
  /** HSA contribution limit for the year. */
  hsaLimit: number;
  /** Whether the client has an HSA-eligible plan. */
  hasHSA: boolean;
  /** IRMAA thresholds for the client's filing status. */
  irmaaThreshold: number;
  /** Current asset allocation percentages. */
  currentAllocation: {
    equity: number;
    bond: number;
    cash: number;
    alternative: number;
  };
  /** Target asset allocation percentages. */
  targetAllocation: {
    equity: number;
    bond: number;
    cash: number;
    alternative: number;
  };
  /** RMD start age (typically 73 or 75 depending on birth year). */
  rmdStartAge: number;
  /** Number of dependents. */
  dependents: number;
}

/** Result of running the plan monitor across all triggers. */
export interface PlanMonitorResult {
  /** Plan identifier. */
  planId: string;
  /** Client display name. */
  clientName: string;
  /** Alerts that fired during this monitoring run. */
  alertsGenerated: PlanAlert[];
  /** Count of insights derived from alerts. */
  insightsGenerated: number;
  /** Previous Monte Carlo success rate. */
  lastSuccessRate: number;
  /** Current Monte Carlo success rate. */
  currentSuccessRate: number;
  /** Change in success rate (positive = improvement). */
  successRateDelta: number;
}

/** A single trigger rule evaluated during plan monitoring. */
export interface AlertTrigger {
  /** Unique trigger identifier. */
  id: string;
  /** Category this trigger belongs to. */
  category: AlertCategory;
  /** Default severity when the trigger fires. */
  severity: AlertSeverity;
  /** Short title shown in the alert. */
  title: string;
  /** Function that evaluates whether this trigger fires. */
  checkCondition: (planData: PlanMonitorInput) => boolean;
  /** Function that generates the alert description when the trigger fires. */
  generateDescription: (planData: PlanMonitorInput) => string;
  /** Function that generates the recommended action text. */
  generateRecommendedAction: (planData: PlanMonitorInput) => string;
  /** Function that estimates the dollar impact. */
  estimateImpact: (planData: PlanMonitorInput) => number;
  /** Optional deadline generator. */
  generateDeadline: (planData: PlanMonitorInput) => string | null;
  /** Whether auto-action is available. */
  autoActionAvailable: boolean;
}

// ==================== PLAN SUMMARY (for insight generation) ====================

/** Condensed plan data used by insight generators and opportunity scanners. */
export interface PlanSummary {
  planId: string;
  clientName: string;
  clientAge: number;
  spouseAge: number | null;
  filingStatus: 'single' | 'mfj' | 'mfs' | 'hoh';
  retirementYear: number;
  currentYear: number;
  taxableIncome: number;
  agi: number;
  marginalRate: number;
  preTaxBalance: number;
  rothBalance: number;
  taxableBalance: number;
  totalPortfolioValue: number;
  successRate: number;
  ssPia: number;
  ssClaimAge: number;
  fullRetirementAge: number;
  grossEstateValue: number;
  estateExemptionAmount: number;
  annualGiftExclusion: number;
  giftRecipientCount: number;
  annualIncome: number;
  outstandingDebt: number;
  dependents: number;
  hasHSA: boolean;
  /** Top marginal bracket ceiling the client currently sits under. */
  currentBracketCeiling: number;
  /** Headroom to next tax bracket. */
  bracketHeadroom: number;
  /** IRMAA threshold for the client's filing status. */
  irmaaThreshold: number;
  /** MAGI used for IRMAA lookback (2 years prior). */
  magiTwoYearsAgo: number;
  /** Whether the client has a taxable brokerage account with unrealized losses. */
  hasUnrealizedLosses: boolean;
  /** Unrealized loss amount in taxable accounts. */
  unrealizedLossAmount: number;
  /** Whether the client has appreciated stock for charitable giving. */
  hasAppreciatedStock: boolean;
  /** Appreciated stock amount. */
  appreciatedStockAmount: number;
  /** Current asset allocation. */
  currentAllocation: {
    equity: number;
    bond: number;
    cash: number;
    alternative: number;
  };
  /** Target asset allocation. */
  targetAllocation: {
    equity: number;
    bond: number;
    cash: number;
    alternative: number;
  };
}

// ==================== SNAPSHOT (for anomaly detection) ====================

/** Point-in-time snapshot of plan data used for anomaly comparison. */
export interface PlanSnapshot {
  /** Snapshot date (ISO string). */
  snapshotDate: string;
  totalPortfolioValue: number;
  preTaxBalance: number;
  rothBalance: number;
  taxableBalance: number;
  annualIncome: number;
  annualExpenses: number;
  agi: number;
  /** Asset allocation percentages. */
  allocation: {
    equity: number;
    bond: number;
    cash: number;
    alternative: number;
  };
  /** Projected income for the current year. */
  projectedIncome: number;
  /** Projected expenses for the current year. */
  projectedExpenses: number;
  /** Individual account balances keyed by account ID. */
  accountBalances: Record<string, number>;
}

/** Result of an anomaly detection scan. */
export interface AnomalyResult {
  /** Type of anomaly detected. */
  anomalyType: 'balance_change' | 'income_divergence' | 'expense_spike' | 'allocation_shift';
  /** Severity of the anomaly. */
  severity: AlertSeverity;
  /** Human-readable title. */
  title: string;
  /** Detailed description of the anomaly. */
  description: string;
  /** The metric that changed. */
  metric: string;
  /** Previous value. */
  previousValue: number;
  /** Current value. */
  currentValue: number;
  /** Percentage change. */
  changePercent: number;
  /** Whether this anomaly warrants advisor attention. */
  requiresAttention: boolean;
}

// ==================== OPPORTUNITY TYPES ====================

/** Result of scanning for a financial planning opportunity. */
export interface OpportunityResult {
  /** Opportunity type identifier. */
  opportunityType: string;
  /** Human-readable title. */
  title: string;
  /** Description of the opportunity. */
  description: string;
  /** Estimated dollar value of the opportunity. */
  estimatedValue: number;
  /** Time sensitivity — how soon should action be taken. */
  urgency: 'low' | 'medium' | 'high' | 'time_sensitive';
  /** Category for grouping. */
  category: AlertCategory;
  /** Recommended steps to capture the opportunity. */
  recommendedSteps: string[];
  /** Applicable time window (e.g. "before Dec 31" or "ages 62-70"). */
  applicableWindow: string;
}

// ==================== RECOMMENDATION TYPES ====================

/** Detailed Roth conversion recommendation input. */
export interface RothRecommendationInput {
  clientAge: number;
  spouseAge: number | null;
  filingStatus: 'single' | 'mfj' | 'mfs' | 'hoh';
  taxableIncome: number;
  agi: number;
  /** Federal ordinary income tax brackets for the current year. */
  taxBrackets: Array<{ rate: number; minIncome: number; maxIncome: number | null }>;
  /** Standard deduction for the filing status. */
  standardDeduction: number;
  preTaxBalance: number;
  rothBalance: number;
  retirementYear: number;
  currentYear: number;
  /** Expected marginal rate in retirement. */
  expectedRetirementRate: number;
  /** Expected annual return on investments (decimal). */
  expectedReturn: number;
  /** MAGI for IRMAA lookback. */
  magiTwoYearsAgo: number;
  /** IRMAA threshold amounts by bracket. */
  irmaaBrackets: Array<{ magiMin: number; magiMax: number | null; annualSurcharge: number }>;
  /** Social Security benefit for SS taxation analysis. */
  socialSecurityBenefit: number;
  /** RMD start age. */
  rmdStartAge: number;
  /** Planning horizon age (life expectancy). */
  planningHorizonAge: number;
}

/** Roth conversion recommendation output. */
export interface RothRecommendation {
  /** Whether a Roth conversion is recommended this year. */
  shouldConvert: boolean;
  /** Recommended conversion amount. */
  recommendedAmount: number;
  /** Tax cost of the conversion in the current year. */
  currentYearTaxCost: number;
  /** Marginal rate on the conversion amount. */
  marginalRateOnConversion: number;
  /** IRMAA impact (additional annual Medicare premiums). */
  irmaaImpact: number;
  /** Increase in SS taxation from higher AGI. */
  ssTaxationImpact: number;
  /** Bracket headroom analysis. */
  bracketHeadroom: Array<{
    bracketRate: number;
    headroom: number;
    conversionInBracket: number;
    taxInBracket: number;
  }>;
  /** Projected tax savings over the planning horizon. */
  projectedLifetimeSavings: number;
  /** Net benefit (projected savings minus current tax cost). */
  netBenefit: number;
  /** Multi-year conversion strategy summary. */
  multiYearStrategy: string;
  /** Reasoning for the recommendation. */
  reasoning: string;
}

/** Social Security strategy recommendation input. */
export interface SSRecommendationInput {
  /** Client's PIA (Primary Insurance Amount). */
  clientPia: number;
  /** Client's current age. */
  clientAge: number;
  /** Client's full retirement age. */
  clientFRA: number;
  /** Spouse PIA (null if single). */
  spousePia: number | null;
  /** Spouse current age (null if single). */
  spouseAge: number | null;
  /** Spouse full retirement age (null if single). */
  spouseFRA: number | null;
  /** Expected annual COLA rate (decimal). */
  colaRate: number;
  /** Discount rate for NPV calculations. */
  discountRate: number;
  /** Life expectancy for the client. */
  clientLifeExpectancy: number;
  /** Life expectancy for the spouse (null if single). */
  spouseLifeExpectancy: number | null;
  /** Other income that may affect SS taxation. */
  otherRetirementIncome: number;
  /** Filing status for SS taxation analysis. */
  filingStatus: 'single' | 'mfj' | 'mfs' | 'hoh';
}

/** Social Security strategy recommendation output. */
export interface SSRecommendation {
  /** Recommended claim age for the client. */
  recommendedClientClaimAge: number;
  /** Recommended claim age for the spouse (null if single). */
  recommendedSpouseClaimAge: number | null;
  /** Break-even age comparison matrix. */
  breakEvenAnalysis: Array<{
    claimAge: number;
    monthlyBenefit: number;
    annualBenefit: number;
    breakEvenVs62: number | null;
    lifetimeNPV: number;
  }>;
  /** Spousal coordination strategy description. */
  spousalStrategy: string | null;
  /** Survivor benefit optimization notes. */
  survivorOptimization: string | null;
  /** Net present value of the recommended strategy. */
  recommendedStrategyNPV: number;
  /** Net present value of the worst strategy (for comparison). */
  worstStrategyNPV: number;
  /** Dollar difference between best and worst strategies. */
  strategyValueDifference: number;
  /** Plain-English reasoning. */
  reasoning: string;
}

/** Insurance gap analysis input. */
export interface InsuranceGapInput {
  clientAge: number;
  spouseAge: number | null;
  annualIncome: number;
  spouseIncome: number;
  /** Number of years income replacement is needed. */
  incomeReplacementYears: number;
  outstandingDebts: number;
  mortgageBalance: number;
  dependents: number;
  /** Annual childcare/education costs. */
  annualChildExpenses: number;
  /** Years until youngest child is independent. */
  yearsOfChildExpenses: number;
  /** Final expenses estimate. */
  finalExpenses: number;
  /** Existing life insurance face value. */
  existingLifeInsurance: number;
  /** Existing liquid assets that could replace coverage. */
  liquidAssets: number;
  /** Existing disability coverage (monthly benefit). */
  existingDisabilityMonthly: number;
  /** Monthly essential expenses. */
  monthlyExpenses: number;
  /** Emergency fund balance. */
  emergencyFund: number;
  /** Existing LTC coverage (daily benefit). */
  existingLTCDailyBenefit: number;
  /** State of residence (affects LTC cost estimates). */
  state: string;
  /** Gender for LTC actuarial estimates. */
  gender: 'male' | 'female';
}

/** Insurance gap analysis result. */
export interface InsuranceGapResult {
  lifeInsuranceGap: {
    totalNeed: number;
    existingCoverage: number;
    gap: number;
    recommendation: string;
  };
  disabilityGap: {
    monthlyNeedAt60Pct: number;
    existingMonthlyBenefit: number;
    gap: number;
    recommendation: string;
  };
  ltcGap: {
    estimatedDailyCost: number;
    projectedDailyCostAtNeedAge: number;
    existingDailyBenefit: number;
    gap: number;
    recommendation: string;
  };
  overallRiskScore: number;
  prioritizedActions: string[];
}

/** Rebalancing recommendation input. */
export interface RebalancingInput {
  /** Current account holdings by account ID. */
  accounts: Array<{
    accountId: string;
    accountName: string;
    accountType: 'taxable' | 'tax_deferred' | 'tax_free';
    balance: number;
    /** Current allocation within this account. */
    allocation: {
      equity: number;
      bond: number;
      cash: number;
      alternative: number;
    };
    /** Unrealized gains in this account. */
    unrealizedGains: number;
    /** Cost basis for taxable accounts. */
    costBasis: number;
  }>;
  /** Target allocation across all accounts. */
  targetAllocation: {
    equity: number;
    bond: number;
    cash: number;
    alternative: number;
  };
  /** Drift tolerance before rebalancing is recommended (percentage points). */
  driftTolerance: number;
  /** Client's marginal tax rate for tax-efficiency analysis. */
  marginalTaxRate: number;
  /** Long-term capital gains rate. */
  ltcgRate: number;
}

/** Rebalancing recommendation output. */
export interface RebalancingRecommendation {
  /** Whether rebalancing is recommended. */
  needsRebalancing: boolean;
  /** Current aggregate allocation across all accounts. */
  currentAllocation: {
    equity: number;
    bond: number;
    cash: number;
    alternative: number;
  };
  /** Drift from target for each asset class. */
  driftAnalysis: Array<{
    assetClass: string;
    currentPct: number;
    targetPct: number;
    driftPct: number;
    exceedsTolerance: boolean;
  }>;
  /** Suggested trades, prioritizing tax-efficient accounts. */
  suggestedTrades: Array<{
    accountId: string;
    accountName: string;
    assetClass: string;
    action: 'buy' | 'sell';
    amount: number;
    taxImpact: number;
    reasoning: string;
  }>;
  /** Estimated tax cost of rebalancing. */
  estimatedTaxCost: number;
  /** Summary explanation. */
  summary: string;
}

/** Estate alert engine input. */
export interface EstateAlertInput {
  /** Last date estate documents were reviewed (ISO string or null). */
  documentsLastReviewed: string | null;
  /** Last date beneficiary designations were reviewed (ISO string or null). */
  beneficiaryLastReviewed: string | null;
  /** Gross estate value. */
  grossEstateValue: number;
  /** Current federal estate exemption amount. */
  currentExemption: number;
  /** Whether TCJA sunset is approaching (exemption drops). */
  tcjaSunsetYear: number;
  /** Current year. */
  currentYear: number;
  /** Whether a trust is in place. */
  hasTrust: boolean;
  /** Trust last review date (ISO string or null). */
  trustLastReviewed: string | null;
  /** Whether the client has a will. */
  hasWill: boolean;
  /** Whether powers of attorney are in place. */
  hasPOA: boolean;
  /** Whether healthcare directives are in place. */
  hasHealthcareDirective: boolean;
  /** Client age. */
  clientAge: number;
  /** Spouse age (null if single). */
  spouseAge: number | null;
  /** Number of heirs. */
  heirCount: number;
  /** State of residence. */
  state: string;
}

/** A single estate planning alert. */
export interface EstateAlert {
  /** Alert type identifier. */
  alertType: string;
  /** Severity. */
  severity: AlertSeverity;
  /** Title. */
  title: string;
  /** Description. */
  description: string;
  /** Recommended action. */
  recommendedAction: string;
  /** Estimated financial impact. */
  estimatedImpact: number;
  /** Deadline if time-sensitive (ISO string or null). */
  deadline: string | null;
}

// ==================== NLP / NARRATIVE TYPES ====================

/** Input for the plan narrator. */
export interface PlanNarratorInput {
  clientName: string;
  clientAge: number;
  spouseAge: number | null;
  retirementYear: number;
  currentYear: number;
  successRate: number;
  previousSuccessRate: number;
  totalPortfolioValue: number;
  annualIncome: number;
  annualExpenses: number;
  netWorth: number;
  topAlerts: PlanAlert[];
  topInsights: PlanInsight[];
  goalsSummary: Array<{
    goalName: string;
    status: 'on_track' | 'at_risk' | 'funded' | 'underfunded';
    fundedRatio: number;
  }>;
}

/** Narrative output from the plan narrator. */
export interface PlanNarrative {
  /** Executive summary in plain English. */
  executiveSummary: string;
  /** ISO timestamp of generation. */
  generatedAt: string;
  /** Model or template used for generation. */
  modelUsed: string;
}

/** Advisor information for email composition. */
export interface AdvisorInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  firmName: string;
}

/** Client information for email composition. */
export interface ClientInfo {
  firstName: string;
  lastName: string;
  email: string;
  preferredName: string | null;
}

/** A draft email ready for advisor review. */
export interface DraftEmail {
  to: string;
  from: string;
  subject: string;
  body: string;
  isDraft: boolean;
  /** The insight that triggered this email. */
  insightId: string;
  /** ISO timestamp of generation. */
  generatedAt: string;
}

// ==================== RECOMMENDATION RESULT ALIASES ====================

/** Generic recommendation result from any recommender engine. */
export interface RecommendationResult {
  /** Recommendation type. */
  type: string;
  /** Title. */
  title: string;
  /** Summary. */
  summary: string;
  /** Estimated dollar impact. */
  estimatedImpact: number;
  /** Priority rank. */
  priority: number;
  /** Whether the recommendation is actionable now. */
  actionable: boolean;
  /** Detailed reasoning. */
  reasoning: string;
}

// ==================== FORECASTING TYPES ====================

/** Scenario describing a tax law change to model. */
export interface TaxLawScenario {
  /** Scenario name. */
  name: string;
  /** Description of the change. */
  description: string;
  /** Year the change takes effect. */
  effectiveYear: number;
  /** Whether TCJA provisions sunset (brackets revert). */
  tcjaSunset: boolean;
  /** New top marginal rate (null = no change). */
  newTopRate: number | null;
  /** New estate exemption amount (null = no change). */
  newEstateExemption: number | null;
  /** New SALT deduction cap (null = no change, -1 = removed). */
  newSaltCap: number | null;
  /** Change to capital gains rates (null = no change). */
  newLTCGTopRate: number | null;
  /** Change to standard deduction (multiplier: 1.0 = same, 0.5 = halved). */
  standardDeductionMultiplier: number;
  /** Additional bracket adjustments: rate -> new rate. */
  bracketAdjustments: Record<string, number>;
}

/** Result of modeling a tax law change against a plan. */
export interface TaxLawImpactResult {
  /** Scenario that was modeled. */
  scenarioName: string;
  /** Year-by-year tax impact. */
  annualImpact: Array<{
    year: number;
    currentLawTax: number;
    newLawTax: number;
    difference: number;
  }>;
  /** Total cumulative impact over the projection period. */
  cumulativeImpact: number;
  /** Impact on estate taxes. */
  estateImpact: number;
  /** Impact on effective tax rate. */
  effectiveRateChange: number;
  /** Recommended actions to mitigate negative impacts. */
  mitigationStrategies: string[];
  /** Plain-English summary. */
  summary: string;
}

/** Client profile for life event prediction. */
export interface ClientProfile {
  age: number;
  spouseAge: number | null;
  /** Ages of children. */
  childrenAges: number[];
  /** Career stage. */
  careerStage: 'early' | 'mid' | 'late' | 'retired';
  /** Whether the client owns a business. */
  isBusinessOwner: boolean;
  /** Whether the client is married. */
  isMarried: boolean;
  /** Health status indicator. */
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
  /** State of residence. */
  state: string;
  /** Retirement year. */
  retirementYear: number;
  /** Current year. */
  currentYear: number;
  /** Whether parents are living. */
  parentsLiving: boolean;
  /** Parent ages if living. */
  parentAges: number[];
  /** Annual income. */
  annualIncome: number;
  /** Net worth. */
  netWorth: number;
}

/** A predicted future life event. */
export interface PredictedLifeEvent {
  /** Event type identifier. */
  eventType: string;
  /** Human-readable title. */
  title: string;
  /** Description of the event and its planning implications. */
  description: string;
  /** Estimated year the event may occur. */
  estimatedYear: number;
  /** Probability estimate (0-1). */
  probability: number;
  /** Financial planning implications. */
  planningImplications: string[];
  /** Recommended preparatory actions. */
  preparatoryActions: string[];
  /** Category for grouping. */
  category: 'retirement' | 'family' | 'career' | 'health' | 'estate' | 'education' | 'housing';
}
