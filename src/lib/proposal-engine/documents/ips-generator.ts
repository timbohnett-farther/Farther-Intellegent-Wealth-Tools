// =============================================================================
// Investment Policy Statement (IPS) Generator
// =============================================================================
//
// Generates an IPS document using AI + template fallback.
// The IPS defines investment objectives, constraints, and governance framework.
// Uses the client's risk profile and portfolio data to create a comprehensive
// policy statement that meets SEC and fiduciary standards.
// =============================================================================

import { callAI, extractJSON } from '@/lib/ai/gateway';
import type {
  InvestmentPolicyStatement,
  FartherRiskProfile,
  InvestmentModel,
  CurrentPortfolio,
  AssetClass,
  MoneyCents,
} from '@/lib/proposal-engine/types';
import { riskScoreToLabel, riskScoreToAllocation } from '@/lib/proposal-engine/types';
import { createHash } from 'crypto';

// ── Types ────────────────────────────────────────────────────────────────────

export interface IPSParams {
  proposalId: string;
  clientName: string;
  riskProfile: FartherRiskProfile;
  currentPortfolio?: CurrentPortfolio;
  proposedModel?: InvestmentModel;
}

// ── Benchmark Mapping ────────────────────────────────────────────────────────

/**
 * Maps asset classes to standard benchmark indices.
 * Used to build the composite benchmark for performance evaluation.
 */
function getAssetClassBenchmark(assetClass: string): string {
  const benchmarkMap: Record<string, string> = {
    'US Equity': 'S&P 500 Total Return',
    'International Equity': 'MSCI ACWI ex-US',
    'Emerging Markets': 'MSCI Emerging Markets',
    'US Fixed Income': 'Bloomberg US Aggregate Bond Index',
    'International Fixed Income': 'Bloomberg Global Aggregate ex-US',
    'TIPS': 'Bloomberg US TIPS Index',
    'Municipal Bonds': 'Bloomberg Municipal Bond Index',
    'High Yield Bonds': 'Bloomberg US Corporate High Yield Index',
    'Real Estate': 'FTSE NAREIT All Equity REITs',
    'Commodities': 'Bloomberg Commodity Index',
    'Gold': 'LBMA Gold Price',
    'Alternatives': 'HFRI Fund of Funds Composite',
    'Cash': 'ICE BofA US 3-Month Treasury Bill Index',
  };

  return benchmarkMap[assetClass] ?? 'Blended Benchmark';
}

/**
 * Groups granular asset classes into broad categories for allocation display.
 */
function groupAssetClasses(allocations: Array<{ assetClass: AssetClass }>): Record<string, number> {
  const grouped: Record<string, number> = {
    'US Equity': 0,
    'International Equity': 0,
    'US Fixed Income': 0,
    'Alternatives': 0,
    'Cash': 0,
  };

  for (const allocation of allocations) {
    const ac = allocation.assetClass;

    if (ac.startsWith('EQUITY_US_')) {
      grouped['US Equity']++;
    } else if (ac.startsWith('EQUITY_INTL_')) {
      grouped['International Equity']++;
    } else if (ac.startsWith('FIXED_INCOME_')) {
      grouped['US Fixed Income']++;
    } else if (ac.startsWith('ALTERNATIVE_') || ac.startsWith('ALTERNATIVES_') || ac === 'REAL_ESTATE' || ac === 'COMMODITIES' || ac === 'GOLD') {
      grouped['Alternatives']++;
    } else if (ac === 'CASH' || ac === 'CASH_EQUIVALENT') {
      grouped['Cash']++;
    }
  }

  return grouped;
}

// ── AI Prompt ────────────────────────────────────────────────────────────────

function buildIPSPrompt(params: IPSParams): { systemPrompt: string; userPrompt: string } {
  const { clientName, riskProfile } = params;
  const timeHorizon = riskProfile.capacityFactors.timeHorizon;
  const riskLabel = riskProfile.compositeLabel;
  const allocationRec = riskProfile.recommendedAllocation;

  const systemPrompt = `You are a fiduciary investment advisor generating an Investment Policy Statement (IPS).
Your output MUST be valid JSON matching this schema:
{
  "investmentObjective": "string (1-2 sentences)",
  "riskTolerance": "string (1-2 sentences)",
  "timeHorizon": "string (1 sentence)",
  "liquidityNeeds": "string (1 sentence)"
}

Guidelines:
- Use clear, professional language suitable for client review
- Reference the client's risk profile and time horizon
- Avoid jargon; explain concepts in plain English
- Be specific and actionable, not generic`;

  const userPrompt = `Client: ${clientName}
Risk Profile: ${riskLabel} (composite score ${riskProfile.compositeScore}/100)
Time Horizon: ${timeHorizon} years
Recommended Allocation: ${allocationRec.equity}% equity, ${allocationRec.fixedIncome}% fixed income, ${allocationRec.alternatives}% alternatives, ${allocationRec.cash}% cash

Generate an IPS that captures:
1. Investment objective aligned with the client's goals and risk profile
2. Risk tolerance statement reflecting their ${riskLabel.toLowerCase().replace(/_/g, ' ')} profile
3. Time horizon description (${timeHorizon} years)
4. Liquidity needs assessment

Return valid JSON ONLY.`;

  return { systemPrompt, userPrompt };
}

// ── Template Fallback ────────────────────────────────────────────────────────

/**
 * Generates template-based IPS content when AI is unavailable or fails.
 */
function generateTemplateIPS(params: IPSParams): Pick<InvestmentPolicyStatement, 'investmentObjective' | 'riskTolerance' | 'timeHorizon' | 'liquidityNeeds'> {
  const { clientName, riskProfile } = params;
  const timeHorizon = riskProfile.capacityFactors.timeHorizon;
  const riskLabel = riskProfile.compositeLabel;

  const objectiveMap: Record<string, string> = {
    'CONSERVATIVE': 'preservation of capital with modest income generation',
    'MODERATELY_CONSERVATIVE': 'balanced growth and income with capital preservation as a secondary objective',
    'MODERATE': 'long-term growth balanced with moderate income and reasonable risk management',
    'MODERATELY_AGGRESSIVE': 'long-term capital appreciation with higher risk tolerance in pursuit of returns',
    'AGGRESSIVE': 'maximum long-term capital appreciation, accepting significant short-term volatility',
  };

  const toleranceMap: Record<string, string> = {
    'CONSERVATIVE': 'The client has a low tolerance for risk and prioritizes protecting principal over growth. Short-term volatility should be minimized.',
    'MODERATELY_CONSERVATIVE': 'The client has a below-average risk tolerance. They are comfortable with modest fluctuations but prefer stability over aggressive growth.',
    'MODERATE': 'The client has a moderate risk tolerance. They can withstand typical market fluctuations in pursuit of balanced growth.',
    'MODERATELY_AGGRESSIVE': 'The client has an above-average risk tolerance and is willing to accept significant short-term volatility for higher long-term returns.',
    'AGGRESSIVE': 'The client has a high risk tolerance and is willing to accept substantial portfolio volatility and potential losses in pursuit of maximum returns.',
  };

  const investmentObjective = `The primary investment objective for ${clientName} is ${objectiveMap[riskLabel]}. This objective aligns with a ${riskLabel.toLowerCase().replace(/_/g, ' ')} risk profile and a ${timeHorizon}-year investment time horizon.`;

  const riskTolerance = toleranceMap[riskLabel];

  const timeHorizonDesc = `The investment time horizon for this portfolio is ${timeHorizon} years. ${
    timeHorizon >= 20
      ? 'This long time horizon allows the portfolio to withstand short-term market volatility and capitalize on long-term equity growth.'
      : timeHorizon >= 10
      ? 'This intermediate time horizon balances the need for growth with the requirement to manage risk as the goal approaches.'
      : 'This relatively short time horizon requires a more conservative approach with greater emphasis on capital preservation.'
  }`;

  const liquidityNeeds = riskProfile.capacityFactors.liquidityRatio >= 6
    ? 'The client has strong liquidity reserves and does not anticipate needing significant portfolio withdrawals in the near term. Annual withdrawals may be required for living expenses.'
    : riskProfile.capacityFactors.liquidityRatio >= 3
    ? 'The client has moderate liquidity and may require periodic portfolio withdrawals. Liquidity needs will be monitored and addressed through rebalancing.'
    : 'The client has limited liquidity and may require access to portfolio funds on short notice. A higher cash allocation is maintained to meet these needs.';

  return {
    investmentObjective,
    riskTolerance,
    timeHorizon: timeHorizonDesc,
    liquidityNeeds,
  };
}

// ── Target Allocation Builder ────────────────────────────────────────────────

/**
 * Builds target allocation array with ±5% bands from recommended allocation.
 */
function buildTargetAllocation(riskProfile: FartherRiskProfile): InvestmentPolicyStatement['targetAllocation'] {
  const { equity, fixedIncome, alternatives, cash } = riskProfile.recommendedAllocation;

  return [
    {
      assetClass: 'Equity',
      targetPct: equity,
      minPct: Math.max(0, equity - 5),
      maxPct: Math.min(100, equity + 5),
    },
    {
      assetClass: 'Fixed Income',
      targetPct: fixedIncome,
      minPct: Math.max(0, fixedIncome - 5),
      maxPct: Math.min(100, fixedIncome + 5),
    },
    {
      assetClass: 'Alternatives',
      targetPct: alternatives,
      minPct: Math.max(0, alternatives - 5),
      maxPct: Math.min(100, alternatives + 5),
    },
    {
      assetClass: 'Cash & Equivalents',
      targetPct: cash,
      minPct: Math.max(0, cash - 5),
      maxPct: Math.min(100, cash + 5),
    },
  ];
}

/**
 * Builds composite benchmark array from allocation.
 */
function buildBenchmarks(allocation: InvestmentPolicyStatement['targetAllocation']): InvestmentPolicyStatement['benchmarks'] {
  return allocation
    .filter(a => a.targetPct > 0)
    .map(a => ({
      component: a.assetClass,
      benchmark: getAssetClassBenchmark(a.assetClass),
      weight: a.targetPct / 100,
    }));
}

// ── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generates a complete Investment Policy Statement.
 * Uses AI to generate objective/tolerance/horizon/liquidity, then builds
 * allocations and benchmarks from the risk profile.
 */
export async function generateIPS(params: IPSParams): Promise<InvestmentPolicyStatement> {
  const { proposalId, clientName, riskProfile } = params;

  let objective: string;
  let tolerance: string;
  let horizon: string;
  let liquidity: string;

  // Attempt AI generation
  try {
    const { systemPrompt, userPrompt } = buildIPSPrompt(params);
    const response = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 1024,
      jsonMode: true,
    });

    const parsed = extractJSON<{
      investmentObjective: string;
      riskTolerance: string;
      timeHorizon: string;
      liquidityNeeds: string;
    }>(response.text);

    objective = parsed.investmentObjective;
    tolerance = parsed.riskTolerance;
    horizon = parsed.timeHorizon;
    liquidity = parsed.liquidityNeeds;
  } catch (err) {
    console.warn('[IPS Generator] AI failed, using template fallback:', err);
    const template = generateTemplateIPS(params);
    objective = template.investmentObjective;
    tolerance = template.riskTolerance;
    horizon = template.timeHorizon;
    liquidity = template.liquidityNeeds;
  }

  // Build allocation and benchmarks
  const targetAllocation = buildTargetAllocation(riskProfile);
  const benchmarks = buildBenchmarks(targetAllocation);

  // Dates
  const today = new Date();
  const effectiveDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const reviewDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
    .toISOString()
    .split('T')[0];

  const ips: InvestmentPolicyStatement = {
    ipsId: crypto.randomUUID(),
    proposalId,
    clientName,
    investmentObjective: objective,
    riskTolerance: tolerance,
    timeHorizon: horizon,
    liquidityNeeds: liquidity,
    targetAllocation,
    rebalancingThreshold: 5,
    rebalancingFrequency: 'Quarterly',
    benchmarks,
    effectiveDate,
    reviewDate,
    generatedAt: new Date().toISOString(),
  };

  return ips;
}
