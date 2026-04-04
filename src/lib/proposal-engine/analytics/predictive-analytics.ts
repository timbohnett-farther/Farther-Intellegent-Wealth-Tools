/**
 * Predictive Analytics — Portfolio Drift, Churn, and Rebalancing
 *
 * Drift detection, client churn prediction, and automated rebalancing triggers.
 * Uses logistic regression-style scoring for churn risk and weighted factor analysis.
 */

// ============================================================================
// Types
// ============================================================================

export interface DriftParams {
  currentAllocation: Record<string, number>;
  targetAllocation: Record<string, number>;
  driftThreshold?: number;
}

export type DriftUrgency = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';

export interface AssetClassDrift {
  assetClass: string;
  current: number;
  target: number;
  drift: number;
  overweight: boolean;
}

export interface DriftAnalysis {
  totalDrift: number;
  drifted: boolean;
  assetClassDrifts: AssetClassDrift[];
  rebalanceUrgency: DriftUrgency;
  estimatedTrades: number;
  estimatedTaxImpact: number;
}

export interface ChurnParams {
  clientAge: number;
  tenureMonths: number;
  aum: number;
  lastContactDays: number;
  proposalsSent: number;
  proposalsAccepted: number;
  marketReturn3m: number;
  portfolioReturn3m: number;
}

export type ChurnRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ChurnFactor {
  factor: string;
  impact: number;
  direction: 'POSITIVE' | 'NEGATIVE';
}

export interface ChurnPrediction {
  churnProbability: number;
  riskLevel: ChurnRiskLevel;
  factors: ChurnFactor[];
  recommendedActions: string[];
  daysUntilCritical?: number;
}

export interface Holding {
  symbol: string;
  shares: number;
  marketValue: number;
  assetClass: string;
  costBasis?: number;
}

export type TriggerType = 'DRIFT' | 'TIME' | 'CASH_FLOW' | 'TAX_EVENT' | 'MARKET_EVENT';
export type TriggerUrgency = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RebalanceTrigger {
  triggerId: string;
  type: TriggerType;
  urgency: TriggerUrgency;
  description: string;
  estimatedTrades: number;
  proposedActions: string[];
}

export interface RebalanceTriggerParams {
  portfolioId: string;
  currentHoldings: Holding[];
  targetModel: {
    allocations: Array<{ assetClass: string; targetPct: number }>;
  };
  lastRebalanceDate?: string;
}

// ============================================================================
// Portfolio Drift Detection
// ============================================================================

export function detectPortfolioDrift(params: DriftParams): DriftAnalysis {
  const { currentAllocation, targetAllocation, driftThreshold = 5 } = params;

  const assetClassDrifts: AssetClassDrift[] = [];
  let totalDrift = 0;

  // Calculate drift for each asset class
  for (const assetClass of Object.keys(targetAllocation)) {
    const current = currentAllocation[assetClass] || 0;
    const target = targetAllocation[assetClass];
    const drift = Math.abs(current - target);

    assetClassDrifts.push({
      assetClass,
      current,
      target,
      drift,
      overweight: current > target,
    });

    totalDrift += drift;
  }

  // Sort by drift magnitude
  assetClassDrifts.sort((a, b) => b.drift - a.drift);

  const maxDrift = Math.max(...assetClassDrifts.map(d => d.drift));
  const drifted = maxDrift >= driftThreshold;

  // Determine urgency
  let rebalanceUrgency: DriftUrgency = 'NONE';
  if (maxDrift >= 15) {
    rebalanceUrgency = 'IMMEDIATE';
  } else if (maxDrift >= 10) {
    rebalanceUrgency = 'HIGH';
  } else if (maxDrift >= 7) {
    rebalanceUrgency = 'MEDIUM';
  } else if (maxDrift >= driftThreshold) {
    rebalanceUrgency = 'LOW';
  }

  // Estimate trades needed (roughly 1 trade per 2 drifted asset classes)
  const driftedClasses = assetClassDrifts.filter(d => d.drift >= driftThreshold);
  const estimatedTrades = Math.ceil(driftedClasses.length / 2);

  // Estimate tax impact (simplified: 15% capital gains on 30% of trades)
  const estimatedTaxImpact = estimatedTrades * 0.15 * 0.3;

  return {
    totalDrift,
    drifted,
    assetClassDrifts,
    rebalanceUrgency,
    estimatedTrades,
    estimatedTaxImpact,
  };
}

// ============================================================================
// Client Churn Prediction
// ============================================================================

export function predictClientChurn(params: ChurnParams): ChurnPrediction {
  const factors: ChurnFactor[] = [];

  // Factor 1: Contact recency (high impact)
  const contactFactor = calculateContactFactor(params.lastContactDays);
  factors.push(contactFactor);

  // Factor 2: Tenure (longer tenure = lower churn)
  const tenureFactor = calculateTenureFactor(params.tenureMonths);
  factors.push(tenureFactor);

  // Factor 3: AUM (higher AUM = lower churn)
  const aumFactor = calculateAUMFactor(params.aum);
  factors.push(aumFactor);

  // Factor 4: Proposal acceptance rate
  const proposalFactor = calculateProposalFactor(params.proposalsSent, params.proposalsAccepted);
  factors.push(proposalFactor);

  // Factor 5: Performance gap (portfolio vs market)
  const performanceFactor = calculatePerformanceFactor(params.portfolioReturn3m, params.marketReturn3m);
  factors.push(performanceFactor);

  // Factor 6: Age (older clients tend to be stickier)
  const ageFactor = calculateAgeFactor(params.clientAge);
  factors.push(ageFactor);

  // Calculate weighted churn probability
  const weights = {
    contact: 0.25,
    tenure: 0.15,
    aum: 0.15,
    proposals: 0.20,
    performance: 0.15,
    age: 0.10,
  };

  let rawScore = 0;
  rawScore += contactFactor.impact * weights.contact;
  rawScore += tenureFactor.impact * weights.tenure;
  rawScore += aumFactor.impact * weights.aum;
  rawScore += proposalFactor.impact * weights.proposals;
  rawScore += performanceFactor.impact * weights.performance;
  rawScore += ageFactor.impact * weights.age;

  // Apply logistic function to get probability (0-1)
  const churnProbability = 1 / (1 + Math.exp(-rawScore));

  // Determine risk level
  let riskLevel: ChurnRiskLevel;
  if (churnProbability >= 0.7) {
    riskLevel = 'CRITICAL';
  } else if (churnProbability >= 0.5) {
    riskLevel = 'HIGH';
  } else if (churnProbability >= 0.3) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  // Generate recommended actions
  const recommendedActions = generateChurnActions(factors, riskLevel);

  // Estimate days until critical (if trending upward)
  let daysUntilCritical: number | undefined;
  if (riskLevel === 'HIGH' && churnProbability < 0.7) {
    daysUntilCritical = Math.round((0.7 - churnProbability) / 0.01 * 7);
  }

  return {
    churnProbability,
    riskLevel,
    factors,
    recommendedActions,
    daysUntilCritical,
  };
}

// ============================================================================
// Churn Factor Calculators
// ============================================================================

function calculateContactFactor(lastContactDays: number): ChurnFactor {
  let impact: number;
  if (lastContactDays > 90) {
    impact = 2.5; // Very high churn risk
  } else if (lastContactDays > 60) {
    impact = 1.5;
  } else if (lastContactDays > 30) {
    impact = 0.5;
  } else {
    impact = -1.0; // Recent contact reduces risk
  }

  return {
    factor: 'Contact Recency',
    impact,
    direction: impact > 0 ? 'NEGATIVE' : 'POSITIVE',
  };
}

function calculateTenureFactor(tenureMonths: number): ChurnFactor {
  let impact: number;
  if (tenureMonths < 6) {
    impact = 1.5; // New clients are flight risks
  } else if (tenureMonths < 12) {
    impact = 0.5;
  } else if (tenureMonths < 36) {
    impact = -0.5;
  } else {
    impact = -1.5; // Long tenure = sticky
  }

  return {
    factor: 'Client Tenure',
    impact,
    direction: impact > 0 ? 'NEGATIVE' : 'POSITIVE',
  };
}

function calculateAUMFactor(aum: number): ChurnFactor {
  let impact: number;
  if (aum < 100000) {
    impact = 1.0; // Lower AUM = higher churn
  } else if (aum < 500000) {
    impact = 0;
  } else if (aum < 2000000) {
    impact = -0.5;
  } else {
    impact = -1.5; // High AUM clients rarely churn
  }

  return {
    factor: 'Assets Under Management',
    impact,
    direction: impact > 0 ? 'NEGATIVE' : 'POSITIVE',
  };
}

function calculateProposalFactor(sent: number, accepted: number): ChurnFactor {
  if (sent === 0) {
    return { factor: 'Proposal Acceptance', impact: 0, direction: 'POSITIVE' };
  }

  const acceptanceRate = accepted / sent;
  let impact: number;

  if (acceptanceRate < 0.2) {
    impact = 2.0; // Low acceptance = likely to churn
  } else if (acceptanceRate < 0.5) {
    impact = 0.5;
  } else if (acceptanceRate < 0.8) {
    impact = -0.5;
  } else {
    impact = -1.5; // High acceptance = engaged client
  }

  return {
    factor: 'Proposal Acceptance',
    impact,
    direction: impact > 0 ? 'NEGATIVE' : 'POSITIVE',
  };
}

function calculatePerformanceFactor(portfolioReturn: number, marketReturn: number): ChurnFactor {
  const gap = portfolioReturn - marketReturn;

  let impact: number;
  if (gap < -5) {
    impact = 2.0; // Underperforming market significantly
  } else if (gap < -2) {
    impact = 1.0;
  } else if (gap < 2) {
    impact = 0;
  } else {
    impact = -1.0; // Outperforming market
  }

  return {
    factor: 'Performance vs Market',
    impact,
    direction: impact > 0 ? 'NEGATIVE' : 'POSITIVE',
  };
}

function calculateAgeFactor(age: number): ChurnFactor {
  let impact: number;
  if (age < 35) {
    impact = 0.5; // Younger clients more mobile
  } else if (age < 50) {
    impact = 0;
  } else if (age < 65) {
    impact = -0.5;
  } else {
    impact = -1.0; // Older clients more stable
  }

  return {
    factor: 'Client Age',
    impact,
    direction: impact > 0 ? 'NEGATIVE' : 'POSITIVE',
  };
}

function generateChurnActions(factors: ChurnFactor[], riskLevel: ChurnRiskLevel): string[] {
  const actions: string[] = [];

  // Always recommend based on top negative factors
  const topNegative = factors
    .filter(f => f.direction === 'NEGATIVE')
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);

  for (const factor of topNegative) {
    switch (factor.factor) {
      case 'Contact Recency':
        actions.push('Schedule immediate check-in call');
        actions.push('Send personalized market update email');
        break;
      case 'Proposal Acceptance':
        actions.push('Review proposal messaging and value proposition');
        actions.push('Schedule proposal review meeting');
        break;
      case 'Performance vs Market':
        actions.push('Prepare performance attribution report');
        actions.push('Discuss strategy adjustment options');
        break;
      case 'Client Tenure':
        actions.push('Strengthen onboarding and early engagement');
        break;
      case 'Assets Under Management':
        actions.push('Explore asset consolidation opportunities');
        break;
    }
  }

  // Critical cases need urgent intervention
  if (riskLevel === 'CRITICAL') {
    actions.unshift('URGENT: Schedule face-to-face meeting within 48 hours');
  }

  return [...new Set(actions)]; // Remove duplicates
}

// ============================================================================
// Rebalancing Triggers
// ============================================================================

export function generateRebalanceTriggers(params: RebalanceTriggerParams): RebalanceTrigger[] {
  const triggers: RebalanceTrigger[] = [];

  // 1. Drift trigger
  const totalValue = params.currentHoldings.reduce((sum, h) => sum + h.marketValue, 0);
  const currentAllocation: Record<string, number> = {};
  for (const holding of params.currentHoldings) {
    const pct = (holding.marketValue / totalValue) * 100;
    currentAllocation[holding.assetClass] = (currentAllocation[holding.assetClass] || 0) + pct;
  }

  const targetAllocation: Record<string, number> = {};
  for (const allocation of params.targetModel.allocations) {
    targetAllocation[allocation.assetClass] = allocation.targetPct;
  }

  const driftAnalysis = detectPortfolioDrift({ currentAllocation, targetAllocation });

  if (driftAnalysis.drifted) {
    triggers.push({
      triggerId: crypto.randomUUID(),
      type: 'DRIFT',
      urgency: driftAnalysis.rebalanceUrgency === 'IMMEDIATE' || driftAnalysis.rebalanceUrgency === 'HIGH' ? 'HIGH' :
               driftAnalysis.rebalanceUrgency === 'MEDIUM' ? 'MEDIUM' : 'LOW',
      description: `Portfolio has drifted ${driftAnalysis.totalDrift.toFixed(1)}% from target allocation`,
      estimatedTrades: driftAnalysis.estimatedTrades,
      proposedActions: driftAnalysis.assetClassDrifts
        .filter(d => d.drift >= 5)
        .map(d => `${d.overweight ? 'Sell' : 'Buy'} ${d.assetClass} (${d.drift.toFixed(1)}% drift)`),
    });
  }

  // 2. Time trigger (quarterly rebalancing)
  if (params.lastRebalanceDate) {
    const lastRebalance = new Date(params.lastRebalanceDate);
    const daysSince = Math.floor((Date.now() - lastRebalance.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince >= 90) {
      triggers.push({
        triggerId: crypto.randomUUID(),
        type: 'TIME',
        urgency: daysSince >= 120 ? 'MEDIUM' : 'LOW',
        description: `${daysSince} days since last rebalance (target: quarterly)`,
        estimatedTrades: 2,
        proposedActions: ['Review and rebalance to target allocation'],
      });
    }
  }

  // 3. Tax loss harvesting opportunity
  const taxLossHoldings = params.currentHoldings.filter(h =>
    h.costBasis && h.marketValue < h.costBasis * 0.9
  );

  if (taxLossHoldings.length > 0) {
    const totalLoss = taxLossHoldings.reduce((sum, h) =>
      sum + ((h.costBasis || 0) - h.marketValue), 0
    );

    triggers.push({
      triggerId: crypto.randomUUID(),
      type: 'TAX_EVENT',
      urgency: totalLoss > 10000 ? 'HIGH' : 'MEDIUM',
      description: `Tax loss harvesting opportunity: $${totalLoss.toLocaleString()} in unrealized losses`,
      estimatedTrades: taxLossHoldings.length,
      proposedActions: taxLossHoldings.map(h => `Harvest loss on ${h.symbol} ($${(h.costBasis! - h.marketValue).toLocaleString()})`),
    });
  }

  return triggers;
}
